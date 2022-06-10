"""
Configuring styles to use when displaying people and events
Style rules have the following format:

this is a list of simple rules, each of which is one of:
  (RULE_EVENT, [event_test], css)
      and event_test is a list of tuples ("field", "test", "value")
         where "field" is one of "place.name", "date", "type_id",
               "age"   => age of the person at that event
               "count" => count of times where that test matched
           and "test"  is one of RULE_CONTAINS, RULE_IS,...
      These rules are tested once per event in which the person took part,
      whether as principal or as witness. As a result, they are more expensive
      to check than the RULE_ATTR tests.

  (RULE_ATTR, [tests], css)
      format is similar to EVENT, but these are tested on the person,
      not once per event. The "field" would be one of "surname",
      "age","ancestor", "ALIVE", "SEX", "UNKNOWN_FATHER", "UNKNOWN_MOTHER",
      "IMPLEX", "descendant", ...
      The "age" is computed from the person's birth, not checking whether that
      person is still alive.
      "ancestor" is true if the person is an ancestor of the person(s) given
      by the RULE_IS or RULE_IN test.
      "IMPLEX" is the number of times this person appears in the ancestor tree
      of the current person.

In all cases, css is similar to a W3C style description, ie a
dictionary of key-value pairs that describe the list. The keys
can be any of "color" (text color), "fill" (background color),
"font-weight", "stroke" (border color)...
"""

from collections import defaultdict
from geneaprove.models.theme.rules import Precomputed, Statuses
from geneaprove.models.theme.styles import Style
from geneaprove.models.theme import Theme
from geneaprove.models.asserts import P2C, P2P, P2E, P2G
from ..sql.personas import PersonSet, StylesProtocol
import logging
from typing import Dict, Tuple


logger = logging.getLogger('geneaprove.styles')


class Styles(StylesProtocol):
    """
    This class is responsible for computing the styles (colors and text
    styles) to apply to personas. It tries to be as efficient as possible
    by caching data when appropriate.
    """

    def __init__(
            self,
            theme_id: int,
            decujus: int,
            ):
        """Rules specifies the rules to use for the highlighting.
        """
        super().__init__()

        # Preprocess the rules for faster computation

        self.need_p2e = False
        self.need_p2c = False
        self.need_places = False

        try:
            theme = (
                Theme.objects
                .prefetch_related('rules', 'rules__parts')
                .get(id=theme_id)
            )
            self.rules = theme.as_rule_list()
        except Theme.DoesNotExist:
            # logger.error(f'Theme not found: {theme_id}')
            self.rules = []
            return

        # For each rule, the result of its precomputation
        self.precomputed: Precomputed = {}

        for r in self.rules:
            # ??? Should be a list of types
            self.need_p2e = self.need_p2e or r.need_p2e

            # ??? Should be a list of types
            self.need_p2c = self.need_p2c or r.need_p2c

            self.need_places = self.need_places or r.need_places
            r.precompute(decujus=decujus, precomputed=self.precomputed)

    def compute(
            self,
            persons: PersonSet,
            ) -> Tuple[
                Dict[int, Style],  # style_id  => Style
                Dict[int, int],    # person_id => style_id
            ]:
        """
        Returns the styles to apply to the persons.
        """
        if not self.rules:
            return {}, {}

        # for each rule and for each person, its current status
        status: Statuses = defaultdict(dict)

        for r in self.rules:
            for p in persons.persons.values():
                r.initial(p, self.precomputed, status)

        # Apply each assertions
        for a in persons.asserts:
            pid = (
                a.person1_id
                if isinstance(a, P2P)
                else a.person_id
                if isinstance(a, (P2C, P2E, P2G))
                else None
            )
            if pid is None:
                continue

            p = persons.get_from_id(pid)
            for r in self.rules:
                r.merge(
                    assertion=a,
                    person=p,
                    precomputed=self.precomputed,
                    statuses=status,
                )

        # We now know whether each rule applies, so we can set the styles
        # Make styles unique, so that we send fewer data
        result: Dict[int, int] = {}   # person id -> style id

        all_styles: Dict[Style, int] = {}   # style -> id
        all_styles[Style()] = 0  # default style
        style_id = 1

        for main_id in persons.persons:
            s = Style()
            for r in self.rules:
                if status[r.id].get(main_id, None) is True:
                    s = s.merge(r.style)

            sv = all_styles.get(s, None)
            if sv is None:
                all_styles[s] = style_id
                sv = style_id
                style_id += 1

            if sv != 0:   # Do not emit the default style
                result[main_id] = sv

        return (
            {id: s for s, id in all_styles.items()},
            result,
        )

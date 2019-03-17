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
from collections.abc import Iterable
import datetime
from geneaprove.utils.date import DateRange
from geneaprove import models
from geneaprove.models.theme import Style
import logging

logger = logging.getLogger('geneaprove.styles')


class Styles(object):

    """
    This class is responsible for computing the styles (colors and text
    styles) to apply to personas. It tries to be as efficient as possible
    by caching data when appropriate.
    """

    def __init__(self, theme_id, graph, decujus):
        """Rules specifies the rules to use for the highlighting.
        """
        super().__init__()

        # Preprocess the rules for faster computation

        self.graph = graph
        self.need_p2e = False
        self.need_p2c = False
        self.need_places = False

        try:
            theme = models.Theme.objects \
                .prefetch_related('rules', 'rules__parts') \
                .get(id=theme_id)
            self.rules = theme.as_rule_list()
        except models.Theme.DoesNotExist:
            # logger.error(f'Theme not found: {theme_id}')
            self.rules = []
            return

        # For each rule, the result of its precomputation
        self.precomputed = {}

        for r in self.rules:
            self.need_p2e = self.need_p2e or r.need_p2e # ??? Should be a list of types
            self.need_p2c = self.need_p2c or r.need_p2c # ??? Should be a list of types
            self.need_places = self.need_places or r.need_places
            r.precompute(
                graph=graph, decujus=decujus, precomputed=self.precomputed)

    def compute(self, persons, asserts=None):
        """
        Returns the styles to apply to the persons.

        :param dict persons:
            maps main ids to Person instance
        :param list asserts:
            all assertions applying to any of the personas
        :returntype: dict
            maps main_id to a style object
        """

        if not self.rules:
            return {}, {}

        # for each rule and for each person, its current status
        status = defaultdict(dict)

        for r in self.rules:
            for main_id, p in persons.items():
                r.initial(p, main_id, self.precomputed, status)

        # Apply each assertions
        for a in asserts:
            main_id = self.graph.node_from_id(a.person_id).main_id
            for r in self.rules:
                r.merge(
                    assertion=a,
                    main_id=main_id,
                    precomputed=self.precomputed,
                    statuses=status)

        # We now know whether each rule applies, so we can set the styles
        # Make styles unique, so that we send fewer data
        result = {}

        all_styles = {}   # style -> id
        all_styles[Style()] = 0  # default style
        style_id = 1

        for main_id in persons:
            s = Style()
            for r in self.rules:
                if status[r.id].get(main_id, None) == True:
                    s = s.merge(r.style)

            sv = all_styles.get(s, None)
            if sv is None:
                all_styles[s] = style_id
                sv = style_id
                style_id += 1

            if sv != 0:   # Do not emit the default style
                result[main_id] = sv

        return {id: s for s, id in all_styles.items()}, result

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

from collections.abc import Iterable
import datetime
from geneaprove.utils.date import DateRange
from geneaprove.models import P2E
import logging

logger = logging.getLogger('geneaprove.styles')


##########
# Checks #
##########

class ChecksMeta(type):
    __registry = set()

    def __init__(cls, name, bases, attrs):
        super().__init__(name, bases, attrs)
        if 'abstract' not in attrs:
            ChecksMeta.__registry.add(cls)

    def __iter__(cls):
        return iter(cls.__registry)

class Check(object, metaclass=ChecksMeta):
    """
    Compares two values according to some relation (contains, is, before,...)
    """
    abstract = True

    def __init__(self, reference):
        self.reference = reference

    def match(self, value):
        raise Exception("Abstract class")


class ICheck(Check):
    """
    Base class for case-insensitive comparisons
    """
    abstract = True

    @staticmethod
    def to_lower(v):
        if isinstance(v, str):
            return v.lower()
        elif isinstance(v, Iterable):
            return [ICheck.to_lower(a) for a in v]
        else:
            return v

    def __init__(self, reference):
        super().__init__(ICheck.to_lower(reference))

    def match(self, value):
        return self.imatch(ICheck.to_lower(value))

    def imatch(self, value):
        """Value is already lower-cased"""
        raise Exception("Abstract method")


class Check_Exact(Check):
    suffix = ""
    def match(self, value):
        return value == self.reference

class Check_IExact(ICheck):
    suffix = "__iexact"
    def imatch(self, value):
        return value == self.reference

class Check_Different(Check):
    suffix = "__different"
    def match(self, value):
        return value != self.reference

class Check_IDifferent(ICheck):
    suffix = "__idifferent"
    def imatch(self, value):
        return value != self.reference

class Check_In(Check):
    suffix = "__in"
    def match(self, value):
        return value in self.reference

class Check_IIn(ICheck):
    suffix = "__iin"
    def imatch(self, value):
        return value in self.reference

class Check_Contains(Check):
    suffix = "__contains"
    def match(self, value):
        return value and self.reference in value

class Check_IContains(ICheck):
    suffix = "__icontains"
    def imatch(self, value):
        return value and self.reference in value

class Check_Less(Check):
    suffix = "__lt"
    def match(self, value):
        return value and value < self.reference

class Check_Less_Or_Equal(Check):
    suffix = "__lte"
    def match(self, value):
        return value and value <= self.reference

class Check_Greater(Check):
    suffix = "__gt"
    def match(self, value):
        return value and value > self.reference

class Check_Greater_Or_Equal(Check):
    suffix = "__gte"
    def match(self, value):
        return value and value >= self.reference

#########
# Style #
#########

class Style(object):
    def __init__(self, font_weight=None, color=None, stroke=None, fill=None):
        self.font_weight = font_weight
        self.color = color
        self.stroke = stroke
        self.fill = fill

        self._hash = hash((font_weight, color, stroke, fill))

    def __repr__(self):
        return '<Style %s>' % self.to_json()

    def __hash__(self):
        return self._hash

    def __eq__(self, second):
        # For proper use of hash tables
        return (self.font_weight == second.font_weight and
                self.color == second.color and
                self.stroke == second.stroke and
                self.fill == second.fill)

    def to_json(self):
        # Must match PersonStyle from src/Store/Styles.tsx
        result = {}
        if self.font_weight:
            result['fontWeight'] = self.font_weight
        if self.color:
            result['color'] = self.color
        if self.stroke:
            result['stroke'] = self.stroke
        if self.fill:
            result['fill'] = self.fill
        return result

    def merge(self, second):
        """
        Merge two styles to create a third one. `self` has priority, and only
        the properties from `second` that are not set in `self` will be
        preserved.
        """
        return Style(font_weight=self.font_weight or second.font_weight,
                     color=self.color or second.color,
                     fill=self.fill or second.fill,
                     stroke=self.stroke or second.stroke)


#########
# Rules #
#########

class Rule(object):
    """
    Build a custom-theme rule.
    Instances of this class are associated with the color theme, and shared
    by all persons/events/characteristic.
    The idea is that these rules act as filters. For each person, and for
    each rule, we associate a boolean that indicates whether the rule matches
    for that person. We then feed each assertion related to the person, and
    update the boolean.
    """

    __unique_id = 0

    def __init__(self, params=[], *, descr="", style=None,
                 **kwargs):
        """
        :param str[] params:
           a list of properties that can be tested. This will be used to parse
           **kwargs: any parameter of the form "name__sufix", where name is in
           `params` and suffix is on the Check suffixes, will be parsed.
           For instance   params=["name"]  and  Rule(name__is="value") will
           result in a name attribute set to a Check_Is instance.
        """

        # Set a unique id for the rule
        self.id = Rule.__unique_id
        Rule.__unique_id += 1

        self.need_places = False
        self.need_p2e = False
        self.need_p2c = False

        self.descr = descr
        self.style = style

        for n in params:
            setattr(self, n, None)

        for kn, kv in kwargs.items():
            found = False
            for n in params:
                for suffix in Check:
                    if kn == "%s%s" % (n, suffix.suffix):
                        setattr(self, n, suffix(kv))
                        found = True
                        break
                if found:
                    break
            if not found:
                raise Exception('Invalid keyword parameter: %s' % kn)

    def precompute(self, graph, decujus):
        """
        Some rules require some pre-processing for faster
        computation (like pre-compute the list of ancestors for instance).
        Must not modify `self`
        """
        return None

    def initial(self, person, precomputed):
        """
        Compute the initial status, for the given person
        Must not modify `self`
        :returntype: None, True, False
        """
        return None

    def merge(self, assertion, current, precomputed):
        """
        A new assertion was seen for the person. Check the rule, and combine
        with `current` to return a new status
        Must not modify `self`
        :param current: None, True, False
        """
        return current


class Alive(Rule):
    """Check that the person is still alive"""
    def __init__(self, alive=True,  max_age=110, **kwargs):
        super().__init__(['age'], **kwargs)
        self.alive = alive
        self.max_age = max_age

    def initial(self, person, precomputed):
        # If we have no birth date, we could assume it is at least 15 years
        # before the first child's birth date (recursively). But that becomes
        # more expensive to compute

        b = getattr(person, "birthISODate")  # set for an extended persona
        d = getattr(person, "deathISODate")  # set for an extended persona

        if d is not None:
            alive = False  # known death, person is no longer alive
        elif b is None:
            alive = None   # no known birth or death, can't say anything
        else:
            current_year = datetime.datetime.now().year
            b_year = int(b[0:4])
            alive = current_year - b_year < self.max_age

            if self.age and not self.age.match(current_year - b_year):
                return False

        return alive == self.alive


class Sex(Rule):
    """Whether we have a male (M), female (F) or unknown (None) person"""
    def __init__(self, sex, **kwargs):
        super().__init__(**kwargs)
        self.need_p2c = True
        self.sex = sex

    def initial(self, person, precomputed):
        return getattr(person, "sex", None) == self.sex


class And(Rule):
    """
    Combine multiple rules which must all match. Only the style of the And
    rule is used, the style of nested rules is ignored
    """
    def __init__(self, rules, **kwargs):
        super().__init__(**kwargs)
        self.rules = rules
        for r in self.rules:
            self.need_p2c = self.need_p2c or r.need_p2c
            self.need_p2e = self.need_p2e or r.need_p2e
            self.need_places = self.need_places or r.need_places

    def precompute(self, graph, decujus):
        p = {}
        for r in self.rules:
            p[r.id] = r.precompute(graph, decujus)
        return p

    def initial(self, person, precomputed):
        s = True
        for r in self.rules:
            # if s is None, we won't have True in the end, stop there.
            # if s is False, we will have False in the end, stop there.
            # if s is True, need to look at later rules
            if s == True:
               s = r.initial(person, precomputed[r.id])
        return s

    def merge(self, assertion, current, precomputed):
        if current == False:
            return current

        s = True
        for r in self.rules:
            if s == True:
                s = r.merge(assertion, current, precomputed[r.id])

        return current if s is None else s


class Known_Father(Rule):
    """Check whether the person has a known father"""
    def __init__(self, equal=True, **kwargs):
        super().__init__(**kwargs)
        self.expected = equal
    def precompute(self, graph, decujus):
        return graph
    def initial(self, person, precomputed):
        return bool(precomputed.fathers(person)) == self.expected


class Ancestor(Rule):
    """
    Check whether the current person is an ancestor of a specific one
    (by default looking at current decujus)
    """

    def __init__(self, of=None, **kwargs):
        super().__init__(**kwargs)
        self.decujus = of

    def precompute(self, graph, decujus):
        s = set()
        for a in graph.people_in_tree(
                id=self.decujus or decujus,
                maxdepthAncestors=-1,
                maxdepthDescendants=0):
            if self.decujus not in a.ids:
                s.update(a.ids)
        return s

    def initial(self, person, ancestors):
        return person.id in ancestors


class Descendants(Rule):
    """
    Check whether the current person is a descendant of a specific one.
    By default uses current decujus
    """

    def __init__(self, of=None, **kwargs):
        super().__init__(**kwargs)
        self.decujus = of

    def precompute(self, graph, decujus):
        s = set()
        for a in graph.people_in_tree(
                id=self.decujus or decujus,
                maxdepthAncestors=0,
                maxdepthDescendants=-1):
            if self.decujus not in a.ids:
                s.update(a.ids)
        return s

    def initial(self, person, descendants):
        return person.id in descendants


class Implex(Rule):
    """Number of times that a person appears in the ancestors tree"""

    def __init__(self, of, **kwargs):
        super().__init__(['count'], **kwargs)
        self.decujus = of
        if self.count is None:
            raise Exception('Missing `count` argument for Implex')

    def precompute(self, graph, decujus):
        def build_implex(counts, main_id):
            """
            Store in `counts` the persons that appear in the tree to compute
            whether a person occurs multiple times.
            """
            counts[main_id] = counts.get(main_id, 0) + 1
            fathers = graph.fathers(main_id)
            if fathers:
                build_implex(counts, fathers[0].main_id)
            mothers = graph.mothers(main_id)
            if mothers:
                build_implex(counts, mothers[0].main_id)

        counts = {}
        build_implex(counts, graph.node_from_id(self.decujus or decujus).main_id)
        return graph, counts

    def initial(self, person, precomputed):
        graph, counts = precomputed
        main_id = graph.node_from_id(person.id).main_id
        return self.count.match(counts.get(main_id, 0))


class Event(Rule):
    """Check that one event matches multiple criterias"""
    def __init__(self, **kwargs):
        super().__init__(["type", "role", "date", "place_name", "age"], **kwargs)
        self.need_p2e = True
        self.need_places = self.place_name is not None

    def precompute(self, graph, decujus):
        return {}   # will map personId to birth date

    def initial(self, person, precomputed):
        b = person.birthISODate
        if b:
            precomputed[person.id] = int(person.birthISODate[0:4])
        return None

    def merge(self, assertion, current, precomputed):
        # If we already know the result, don't bother computing
        if current is not None or not isinstance(assertion, P2E):
            return current
        if self.role and not self.role.match(assertion.role_id):
            return current # this event doesn't match, maybe another will
        if self.type and not self.type.match(assertion.event.type_id):
            return current
        if self.date and not self.date.match(assertion.event.date_sort):
            return current
        if self.place_name and \
            not self.place_name.match(assertion.event.get_place_part("name")):
            return current
        if self.age:
            b = precomputed.get(assertion.person_id, None)
            if b and assertion.event.date_sort:
                try:
                    y2 = int(assertion.event.date_sort[0:4])
                    if not self.age.match(y2 - b):
                        return current
                except:
                    print('Cannot parse date_sort for event', assertion)
                    return current
            else:
                return current
        return True


class Default(Rule):
    """Always matches, should in general be last in the list"""
    def initial(self, person, counts):
        return True


class Styles(object):

    """
    This class is responsible for computing the styles (colors and text
    styles) to apply to personas. It tries to be as efficient as possible
    by caching data when appropriate.
    """

    def __init__(self, rules, graph, decujus):
        """Rules specifies the rules to use for the highlighting.
        """
        super().__init__()

        # Preprocess the rules for faster computation

        self.graph = graph
        self.rules = rules

        self.need_p2e = False
        self.need_p2c = False
        self.need_places = False

        # For each rule, the result of its precomputation
        self.rules_precomputed = {}

        for r in rules:
            self.need_p2e = self.need_p2e or r.need_p2e # ??? Should be a list of types
            self.need_p2c = self.need_p2c or r.need_p2c # ??? Should be a list of types
            self.need_places = self.need_places or r.need_places
            self.rules_precomputed[r.id] = r.precompute(
                graph=graph, decujus=decujus)

    def need_place_parts(self):
        """Whether we need extra SQL queries for the place parts"""
        return self.need_places

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

        # for each rule and for each person, its current status
        status = {}
        for main_id, p in persons.items():
            status[main_id] = {r.id: r.initial(p, self.rules_precomputed[r.id])
                          for r in self.rules}

        # Apply each assertions
        for a in asserts:
            main_id = self.graph.node_from_id(a.person_id).main_id
            for r in self.rules:
                status[main_id][r.id] = r.merge(
                    assertion=a,
                    current=status[main_id][r.id],
                    precomputed=self.rules_precomputed[r.id])

        # We now know whether each rule applies, so we can set the styles
        # Make styles unique, so that we send fewer data
        result = {}

        all_styles = {}   # style -> id
        all_styles[Style()] = 0  # default style
        style_id = 1

        for id in persons:
            s = Style()
            for r in self.rules:
                if status[id][r.id] == True:
                    s = s.merge(r.style)

            sv = all_styles.get(s, None)
            if sv is None:
                all_styles[s] = style_id
                sv = style_id
                style_id += 1

            if sv != 0:   # Do not emit the default style
                result[id] = sv

        return {id: s for s, id in all_styles.items()}, result

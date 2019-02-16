import datetime
from geneaprove import models

__slots__ = ["RuleChecker"]


class _RuleMeta(type):
    ALL_RULES = {}

    def __init__(cls, name, bases, attrs):
        super().__init__(name, bases, attrs)
        if name[0] != '_' and name != 'RuleChecker':
            _RuleMeta.ALL_RULES[name.lower()] = cls


class RuleChecker(object, metaclass=_RuleMeta):
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

    @staticmethod
    def get_factory(name):
        """
        Get a rule factory by its name
        """
        return _RuleMeta.ALL_RULES[name.lower()]

    def __init__(self, *, descr="", style=None):
        """
        :param Style style:
        """

        # Set a unique id for the rule
        self.id = RuleChecker.__unique_id
        RuleChecker.__unique_id += 1

        self.need_places = False
        self.need_p2e = False
        self.need_p2c = False

        self.descr = descr
        self.style = style

    def precompute(self, graph, decujus, precomputed):
        """
        Some rules require some pre-processing for faster
        computation (like pre-compute the list of ancestors for instance).
        Must not modify `self`;
        Should update precomputed[self.id], and perhaps any other nested rule.
        """
        pass

    def initial(self, person, main_id, precomputed, statuses):
        """
        Compute the initial status, for the given person
        Must not modify `self`
        :param dict precomputed: indexed on rule id, as set by `precompute()`
        :returntype: None, True, False
        """
        pass

    def merge(self, assertion, main_id, precomputed, statuses):
        """
        A new assertion was seen for the person. Check the rule, and combine
        with `current` to return a new status
        Must not modify `self`

        :param int main_id:  main id of assertion.person
        :param dict precomputed: indexed on rule id
        :param dict statuses: indexed on rule_id, then on main_id
        """
        pass

class Alive(RuleChecker):
    """Check that the person is still alive"""
    def __init__(self, *, alive=True, max_age=110, age=None, **kwargs):
        super().__init__(**kwargs)
        self.age = age   # a Check
        self.alive = alive
        self.max_age = max_age

    def initial(self, person, main_id, precomputed, statuses):
        # If we have no birth date, we could assume it is at least 15 years
        # before the first child's birth date (recursively). But that becomes
        # more expensive to compute

        birth = getattr(person, "birthISODate")  # set for an extended persona
        death = getattr(person, "deathISODate")  # set for an extended persona

        if death is not None:
            alive = False  # known death, person is no longer alive
        elif birth is None:
            alive = None   # no known birth or death, can't say anything
        else:
            current_year = datetime.datetime.now().year
            b_year = int(birth[0:4])
            alive = current_year - b_year < self.max_age

            if self.age and not self.age.match(current_year - b_year):
                statuses[self.id][main_id] = False
                return

        statuses[self.id][main_id] = (alive == self.alive)


class _Combine(RuleChecker):
    """
    A rule that combines other rules
    """
    def __init__(self, rules, **kwargs):
        super().__init__(**kwargs)
        self.rules = rules
        for rule in self.rules:
            self.need_p2c = self.need_p2c or rule.need_p2c
            self.need_p2e = self.need_p2e or rule.need_p2e
            self.need_places = self.need_places or rule.need_places

    def precompute(self, graph, decujus, precomputed):
        for rule in self.rules:
            rule.precompute(graph, decujus, precomputed)

    def _combine(self, values):
        pass

    def initial(self, person, main_id, precomputed, statuses):
        for rule in self.rules:
            rule.initial(person, main_id, precomputed, statuses)
        statuses[self.id][main_id] = self._combine(
            statuses[r.id].get(main_id, None) for r in self.rules)

    def merge(self, assertion, main_id, precomputed, statuses):
        current = statuses[self.id].get(main_id, None)
        if current is not None:
            return

        for rule in self.rules:
            rule.merge(assertion, main_id, precomputed, statuses)

        statuses[self.id][main_id] = self._combine(
            statuses[r.id].get(main_id, None) for r in self.rules)


class And(_Combine):
    """
    Combine multiple rules which must all match. Only the style of the And
    rule is used, the style of nested rules is ignored
    """
    def _combine(self, values):
        for val in values:
            if val is None:
                return None
            elif val is False:
                return False
        return True


class Or(_Combine):
    """
    Combine multiple rules. At least one should match . Only the style of the
    Or rule is used, the style of nested rules is ignored
    """
    def _combine(self, values):
        result = False
        for val in values:
            if val is None:
                result = None
            elif val is True:
                return True
        return result


class KnownFather(RuleChecker):
    """Check whether the person has a known father"""
    def __init__(self, equal=True, **kwargs):
        super().__init__(**kwargs)
        self.expected = equal

    def precompute(self, graph, decujus, precomputed):
        precomputed[self.id] = graph

    def initial(self, person, main_id, precomputed, statuses):
        graph = precomputed[self.id]
        statuses[self.id][main_id] = (
            bool(graph.fathers(person)) == self.expected)


class KnownMother(RuleChecker):
    """Check whether the person has a known mother"""
    def __init__(self, equal=True, **kwargs):
        super().__init__(**kwargs)
        self.expected = equal

    def precompute(self, graph, decujus, precomputed):
        precomputed[self.id] = graph

    def initial(self, person, main_id, precomputed, statuses):
        graph = precomputed[self.id]
        statuses[self.id][main_id] = (
            bool(graph.mothers(person)) == self.expected)


class Ancestor(RuleChecker):
    """
    Check whether the current person is an ancestor of a specific one
    (by default looking at current decujus)
    """

    def __init__(self, *, base=None, **kwargs):
        super().__init__(**kwargs)
        self.decujus = base

    def precompute(self, graph, decujus, precomputed):
        ancestors = set()
        for anc in graph.people_in_tree(
                id=self.decujus or decujus,
                maxdepthAncestors=-1,
                maxdepthDescendants=0):

            # Do not insert the decujus himself
            if self.decujus not in anc.ids:
                ancestors.update(anc.ids)

        precomputed[self.id] = ancestors

    def initial(self, person, main_id, precomputed, statuses):
        ancestors = precomputed[self.id]
        statuses[self.id][main_id] = main_id in ancestors


class Descendant(RuleChecker):
    """
    Check whether the current person is a descendant of a specific one.
    By default uses current decujus
    """

    def __init__(self, *, base=None, **kwargs):
        super().__init__(**kwargs)
        self.decujus = base

    def precompute(self, graph, decujus, precomputed):
        descendants = set()
        for desc in graph.people_in_tree(
                id=self.decujus or decujus,
                maxdepthAncestors=0,
                maxdepthDescendants=-1):

            # Do not insert the decujus himself
            if self.decujus not in desc.ids:
                descendants.update(desc.ids)

        precomputed[self.id] = descendants

    def initial(self, person, main_id, precomputed, statuses):
        descendants = precomputed[self.id]
        statuses[self.id][main_id] = main_id in descendants


class Implex(RuleChecker):
    """Number of times that a person appears in the ancestors tree"""

    def __init__(self, *, base, count=None, **kwargs):
        super().__init__(**kwargs)
        self.decujus = base
        self.count = count
        if self.count is None:
            raise Exception('Missing `count` argument for Implex')

    def precompute(self, graph, decujus, precomputed):
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
        precomputed[self.id] = (graph, counts)

    def initial(self, person, main_id, precomputed, statuses):
        graph, counts = precomputed[self.id]
        main_id = graph.node_from_id(person.id).main_id
        statuses[self.id][main_id] = self.count.match(counts.get(main_id, 0))


class Characteristic(RuleChecker):
    """Check that one characteristic matches multiple criterias"""
    def __init__(self, *, typ=None, value=None, **kwargs):
        super().__init__(**kwargs)
        self.type = typ   # Should be an integer
        ...
        self.value = value

    def merge(self, assertion, main_id, precomputed, statuses):
        current = statuses[self.id].get(main_id, None)
        if current is not None or not isinstance(assertion, models.P2C):
            return

        found = False
        for part in assertion.characteristic.parts.all():
            if self.type and self.type.match(part.type_id):
                found = True
                if self.value and not self.value.match(part.name):
                    return

        if found:
            statuses[self.id][main_id] = True


class Event(RuleChecker):
    """Check that one event matches multiple criterias"""
    def __init__(self, *, typ=None,
                 count=None,  # number of times this rule matches the person
                 role=None,
                 date=None,
                 place_name=None,
                 age=None,
                 **kwargs):

        super().__init__(**kwargs)
        self.type = typ
        self.count = count
        self.role = role
        self.date = date
        self.place_name = place_name
        self.age = age

        self.need_p2e = True
        self.need_places = self.place_name is not None

    def precompute(self, graph, decujus, precomputed):
        precomputed[self.id] = {}   # for each person, her birth date

    def initial(self, person, main_id, precomputed, statuses):
        births = precomputed[self.id]
        birth = person.birthISODate
        if birth:
            births[main_id] = [int(birth[0:4]), 0]
        else:
            births[main_id] = [None, 0]

    def merge(self, assertion, main_id, precomputed, statuses):
        current = statuses[self.id].get(main_id, None)

        failed = ( # If we already know the result, don't bother computing
            current is not None or not isinstance(assertion, models.P2E))
        failed = failed or (
            self.role and not self.role.match(assertion.role_id))
        failed = failed or (
            self.type and not self.type.match(assertion.event.type_id))
        failed = failed or (
            self.date and not self.date.match(assertion.event.date_sort))
        failed = failed or (
            self.place_name and \
            not self.place_name.match(assertion.event.get_place_part("name")))

        if failed:
            return   # this event doesn't match, maybe another will

        births = precomputed[self.id]
        birth = births.get(main_id, None)

        if self.age and birth:
            if birth[0] and assertion.event.date_sort:
                try:
                    year2 = int(assertion.event.date_sort[0:4])
                    if not self.age.match(year2 - birth[0]):
                        return
                except:
                    print('Cannot parse date_sort for event', assertion)
                    return
            else:
                return

        if self.count and birth:
            birth[1] += 1
            if not self.count.match(birth[1]):
                return

        statuses[self.id][main_id] = True


class Default(RuleChecker):
    """Always matches, should in general be last in the list"""
    def initial(self, person, main_id, precomputed, statuses):
        statuses[self.id][main_id] = True

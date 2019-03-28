import collections
import datetime
from geneaprove import models
from .checks import Check_Success, Check_Exact
from geneaprove.sql import PersonSet

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

    def precompute(self, decujus, precomputed):
        """
        Some rules require some pre-processing for faster
        computation (like pre-compute the list of ancestors for instance).
        Must not modify `self`;
        Should update precomputed[self.id], and perhaps any other nested rule.
        """
        pass

    def initial(self, person, precomputed, statuses):
        """
        Compute the initial status, for the given person
        Must not modify `self`
        :param dict precomputed: indexed on rule id, as set by `precompute()`
        :returntype: None, True, False
        """
        pass

    def merge(self, assertion, person, precomputed, statuses):
        """
        A new assertion was seen for the person. Check the rule, and combine
        with `current` to return a new status
        Must not modify `self`

        :param Persona person:  assertion.person, precomputed
        :param dict precomputed: indexed on rule id
        :param dict statuses: indexed on rule_id, then on person.main_id
        """
        pass

    def __str__(self):
        return f"<{self.__class__.__name__} {self.id}>"

class Alive(RuleChecker):
    """Check that the person is still alive"""
    def __init__(self, *, alive=None, max_age=110, age=None, **kwargs):
        super().__init__(**kwargs)
        self.age = age or Check_Success()
        self.max_age = max_age
        self.alive = alive or Check_Success()

    def initial(self, person, precomputed, statuses):
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

            if not self.age.match(current_year - b_year):
                statuses[self.id][person.main_id] = False
                return

        statuses[self.id][person.main_id] = self.alive.match(alive)

    def __str__(self):
        return (f"<Alive {self.id} age={self.age} alive={self.alive} "
                f"max_age={self.max_age}>")


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

    def precompute(self, decujus, precomputed):
        for rule in self.rules:
            rule.precompute(decujus, precomputed)

    def _combine(self, values):
        pass

    def initial(self, person, precomputed, statuses):
        for rule in self.rules:
            rule.initial(person, precomputed, statuses)
        statuses[self.id][person.main_id] = self._combine(
            statuses[r.id].get(person.main_id, None) for r in self.rules)

    def merge(self, assertion, person, precomputed, statuses):
        current = statuses[self.id].get(person.main_id, None)
        if current is not None:
            return

        for rule in self.rules:
            rule.merge(assertion, person, precomputed, statuses)

        statuses[self.id][person.main_id] = self._combine(
            statuses[r.id].get(person.main_id, None) for r in self.rules)


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
    def __init__(self, known=None, **kwargs):
        super().__init__(**kwargs)
        self.known = known or Check_Success()

    def precompute(self, decujus, precomputed):
        if 'knownancestors' not in precomputed:
            precomputed['knownancestors'] = PersonSet.has_known_parent()

    def initial(self, person, precomputed, statuses):
        knownp = precomputed['knownancestors']
        has_father = 'M' in knownp[person.main_id]
        statuses[self.id][person.main_id] = self.known.match(has_father)


class KnownMother(RuleChecker):
    """Check whether the person has a known mother"""
    def __init__(self, known=True, **kwargs):
        super().__init__(**kwargs)
        self.known = known or Check_Success()

    def precompute(self, decujus, precomputed):
        if 'knownancestors' not in precomputed:
            precomputed['knownancestors'] = PersonSet.has_known_parent()

    def initial(self, person, precomputed, statuses):
        knownp = precomputed['knownancestors']
        has_mother = 'F' in knownp[person.main_id]
        statuses[self.id][person.main_id] = self.known.match(has_mother)


class Ancestor(RuleChecker):
    """
    Check whether the current person is an ancestor of a specific one
    (by default looking at current decujus)
    """

    def __init__(self, *, ref=-1, **kwargs):
        super().__init__(**kwargs)

        if isinstance(ref, int):
            self.decujus = ref
        elif isinstance(ref, Check_Exact):
            self.decujus = int(ref.reference)
        else:
            raise Exception

    def precompute(self, decujus, precomputed):
        ancestors = PersonSet.get_ancestors(
            person_id=decujus if self.decujus < 0 else self.decujus)
        precomputed[self.id] = set( # Do not insert the decujus himself
            a.main_id for a in ancestors if a.generation != 0)

    def initial(self, person, precomputed, statuses):
        ancestors = precomputed[self.id]
        statuses[self.id][person.main_id] = person.main_id in ancestors


class Descendant(RuleChecker):
    """
    Check whether the current person is a descendant of a specific one.
    By default uses current decujus
    """

    def __init__(self, *, ref=-1, **kwargs):
        super().__init__(**kwargs)
        if ref is None or isinstance(ref, int):
            self.decujus = ref
        elif isinstance(ref, Check_Exact):
            self.decujus = int(ref.reference)
        else:
            raise Exception

    def precompute(self, decujus, precomputed):
        desc = PersonSet.get_descendants(
            person_id=decujus if self.decujus < 0 else self.decujus)
        precomputed[self.id] = set( # Do not insert the decujus himself
            a.main_id for a in desc if a.generation != 0)

    def initial(self, person, precomputed, statuses):
        descendants = precomputed[self.id]
        statuses[self.id][person.main_id] = person.main_id in descendants


class Implex(RuleChecker):
    """Number of times that a person appears in the ancestors tree"""

    def __init__(self, *, ref=-1, count=None, **kwargs):
        super().__init__(**kwargs)

        if isinstance(ref, int):
            self.decujus = ref
        elif isinstance(ref, Check_Exact):
            self.decujus = int(ref.reference)
        else:
            raise Exception

        self.count = count
        if self.count is None:
            raise Exception('Missing `count` argument for Implex')

    def precompute(self, decujus, precomputed):
        """
        Store in `counts` the persons that appear in the tree to compute
        whether a person occurs multiple times.
        """
        count = collections.defaultdict(int)

        ancestors = PersonSet.get_ancestors(
            person_id=decujus if self.decujus < 0 else self.decujus)
        for a in ancestors:
            if a.generation != 0:
                count[a.main_id] += 1

        desc = PersonSet.get_descendants(
            person_id=decujus if self.decujus < 0 else self.decujus)
        for a in desc:
            if a.generation != 0:
                count[a.main_id] += 1

        precomputed[self.id] = count

    def initial(self, person, precomputed, statuses):
        count = precomputed[self.id]
        statuses[self.id][person.main_id] = self.count.match(
            count[person.main_id])


class Characteristic(RuleChecker):
    """Check that one characteristic matches multiple criterias"""
    def __init__(self, *, typ=None, value=None, **kwargs):
        super().__init__(**kwargs)
        self.type = typ or Check_Success()
        self.value = value or Check_Success()

    def merge(self, assertion, person, precomputed, statuses):
        current = statuses[self.id].get(person.main_id, None)
        if current is not None or not isinstance(assertion, models.P2C):
            return

        found = False
        for part in assertion.characteristic.parts.all():
            if self.type.match(part.type_id):
                found = True
                if not self.value.match(part.name):
                    return

        if found:
            statuses[self.id][person.main_id] = True


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
        self.type = typ or Check_Success()
        self.count = count
        self.role = role or Check_Success()
        self.date = date or Check_Success()
        self.place_name = place_name
        self.age = age

        self.need_p2e = True
        self.need_places = self.place_name is not None

    def precompute(self, decujus, precomputed):
        precomputed[self.id] = {}   # for each person, her birth date

    def initial(self, person, precomputed, statuses):
        births = precomputed[self.id]
        birth = person.birthISODate
        if birth:
            births[person.main_id] = [int(birth[0:4]), 0]
        else:
            births[person.main_id] = [None, 0]

    def merge(self, assertion, person, precomputed, statuses):
        current = statuses[self.id].get(person.main_id, None)

        failed = ( # If we already know the result, don't bother computing
            current is not None or not isinstance(assertion, models.P2E))
        failed = failed or not self.role.match(assertion.role_id)
        failed = failed or not self.type.match(assertion.event.type_id)
        failed = failed or not self.date.match(assertion.event.date_sort)
        failed = failed or (
            self.place_name and \
            not self.place_name.match(assertion.event.get_place_part("name")))

        if failed:
            return   # this event doesn't match, maybe another will

        births = precomputed[self.id]
        birth = births.get(person.main_id, None)

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

        statuses[self.id][person.main_id] = True


class Default(RuleChecker):
    """Always matches, should in general be last in the list"""
    def initial(self, person, precomputed, statuses):
        statuses[self.id][person.main_id] = True

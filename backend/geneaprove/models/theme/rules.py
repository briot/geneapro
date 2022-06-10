import collections
import datetime
from geneaprove.models.persona import Persona
from geneaprove.models.asserts import P2C, P2E, Assertion
from .checks import Check_Success, Check_Exact, Check
from .styles import Style
from geneaprove.sql.personas import PersonSet, Relationship
from typing import Dict, ClassVar, Any, Optional, Iterable, Union


__slots__ = ["RuleChecker"]


Precomputed = Dict[int, Any]    # rule_id  => some precomputed cache
Status = Optional[bool]
Statuses = Dict[
    int,     # rule_id
    Dict[
        int,   # person_id
        Status,
    ]
]


class _RuleMeta(type):
    ALL_RULES: Dict[str, "RuleChecker"] = {}

    def __init__(cls, name, bases, attrs):
        super().__init__(name, bases, attrs)
        if name[0] != '_' and name != 'RuleChecker':
            _RuleMeta.ALL_RULES[name.lower()] = cls


class RuleChecker(metaclass=_RuleMeta):
    """
    Build a custom-theme rule.
    Instances of this class are associated with the color theme, and shared
    by all persons/events/characteristic.
    The idea is that these rules act as filters. For each person, and for
    each rule, we associate a boolean that indicates whether the rule matches
    for that person. We then feed each assertion related to the person, and
    update the boolean.
    """

    __unique_id: ClassVar[int] = 0

    @staticmethod
    def get_factory(name: str) -> "RuleChecker":
        """
        Get a rule factory by its name
        """
        return _RuleMeta.ALL_RULES[name.lower()]

    def __init__(self, *, descr="", style: Style = None) -> None:
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

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Dict[int, Any],
            ):
        """
        Some rules require some pre-processing for faster
        computation (like pre-compute the list of ancestors for instance).
        Must not modify `self`;
        Should update precomputed[self.id], and perhaps any other nested rule.
        """
        pass

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ) -> None:
        """
        Compute the initial status, for the given person
        Must not modify `self`
        :param precomputed: indexed on rule id, as set by `precompute()`
        """
        pass

    def merge(
            self,
            assertion: Assertion,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ) -> Status:
        """
        A new assertion was seen for the person. Check the rule, and combine
        with `current` to return a new status
        Must not modify `self`

        :param person:  assertion.person, precomputed
        :param precomputed: indexed on rule id
        :param statuses: indexed on rule_id, then on person.main_id
        """
        pass

    def __str__(self) -> str:
        return f"<{self.__class__.__name__} {self.id}>"


class Alive(RuleChecker):
    """Check that the person is still alive"""

    def __init__(
            self,
            *,
            alive: Check = None,
            max_age=110,
            age: Check = None,
            **kwargs,
            ):
        super().__init__(**kwargs)
        self.max_age = max_age
        self.age = age or Check_Success()
        self.alive = alive or Check_Success()

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ) -> None:
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

    def __str__(self) -> str:
        return (
            f"<Alive {self.id} age={self.age} alive={self.alive} "
            f"max_age={self.max_age}>"
        )


class _Combine(RuleChecker):
    """
    A rule that combines other rules
    """

    def __init__(
            self,
            rules: Iterable[RuleChecker],
            **kwargs):
        super().__init__(**kwargs)
        self.rules = rules
        for rule in self.rules:
            self.need_p2c = self.need_p2c or rule.need_p2c
            self.need_p2e = self.need_p2e or rule.need_p2e
            self.need_places = self.need_places or rule.need_places

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ) -> None:
        for rule in self.rules:
            rule.precompute(personset, decujus, precomputed)

    def _combine(self, values: Iterable[Status]) -> Status:
        pass

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ) -> None:
        for rule in self.rules:
            rule.initial(person, precomputed, statuses)
        statuses[self.id][person.main_id] = self._combine(
            statuses[r.id].get(person.main_id, None)
            for r in self.rules
        )

    def merge(
            self,
            assertion: Assertion,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ) -> None:
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

    def _combine(self, values: Iterable[Status]) -> Status:
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

    def _combine(self, values: Iterable[Status]) -> Status:
        result: Status = False
        for val in values:
            if val is None:
                result = None
            elif val is True:
                return True
        return result


RULE_KNOWN_FATHER_OR_MOTHER = -1


class KnownFather(RuleChecker):
    """Check whether the person has a known father"""

    def __init__(self, known: Check = None, **kwargs):
        super().__init__(**kwargs)
        self.known = known or Check_Success()

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ) -> None:
        if RULE_KNOWN_FATHER_OR_MOTHER not in precomputed:
            precomputed[RULE_KNOWN_FATHER_OR_MOTHER] = (
                personset.has_known_parent()
            )

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ) -> None:
        knownp: Dict[int, str] = precomputed[self.id]
        has_father = 'M' in knownp.get(person.main_id, '')
        statuses[self.id][person.main_id] = self.known.match(has_father)


class KnownMother(RuleChecker):
    """Check whether the person has a known mother"""

    def __init__(self, known=True, **kwargs):
        super().__init__(**kwargs)
        self.known = known or Check_Success()

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ):
        if RULE_KNOWN_FATHER_OR_MOTHER not in precomputed:
            precomputed[RULE_KNOWN_FATHER_OR_MOTHER] = (
                personset.has_known_parent()
            )

    def initial(self, person, precomputed, statuses):
        knownp: Dict[int, str] = precomputed[self.id]
        knownp = precomputed['knownancestors']
        has_mother = 'F' in knownp.get(person.main_id, '')
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

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ):
        ancestors = personset.get_folks(
            relationship=Relationship.ANCESTORS,
            person_id=decujus if self.decujus < 0 else self.decujus)
        precomputed[self.id] = set(   # Do not insert the decujus himself
            a.main_id for a in ancestors if a.generation != 0)

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
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

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ):
        desc = personset.get_folks(
            relationship=Relationship.DESCENDANTS,
            person_id=decujus if self.decujus < 0 else self.decujus)
        precomputed[self.id] = set(   # Do not insert the decujus himself
            a.main_id for a in desc if a.generation != 0)

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
        descendants = precomputed[self.id]
        statuses[self.id][person.main_id] = person.main_id in descendants


class Implex(RuleChecker):
    """Number of times that a person appears in the ancestors tree"""

    def __init__(
            self,
            *,
            ref: Union[int, Check_Exact] = -1,
            count: Check = None,
            **kwargs,
            ):
        super().__init__(**kwargs)

        if isinstance(ref, int):
            self.decujus = ref
        elif isinstance(ref, Check_Exact):
            assert isinstance(ref.reference, int)
            self.decujus = ref.reference
        else:
            raise Exception

        if count is None:
            raise Exception('Missing `count` argument for Implex')
        self.count = count

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ):
        """
        Store in `counts` the persons that appear in the tree to compute
        whether a person occurs multiple times.
        """
        count: Dict[int, int] = collections.defaultdict(int)

        ancestors = personset.get_folks(
            relationship=Relationship.ANCESTORS,
            person_id=decujus if self.decujus < 0 else self.decujus)
        for a in ancestors:
            if a.generation != 0:
                count[a.main_id] += 1

        desc = personset.get_folks(
            relationship=Relationship.DESCENDANTS,
            person_id=decujus if self.decujus < 0 else self.decujus)
        for a in desc:
            if a.generation != 0:
                count[a.main_id] += 1

        precomputed[self.id] = count

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
        count = precomputed[self.id]
        statuses[self.id][person.main_id] = self.count.match(
            count[person.main_id])


class Characteristic(RuleChecker):
    """Check that one characteristic matches multiple criterias"""

    def __init__(
            self,
            *,
            typ: Check = None,
            value: Check = None,
            **kwargs,
            ):
        super().__init__(**kwargs)
        self.type = typ or Check_Success()
        self.value = value or Check_Success()

    def merge(
            self,
            assertion: Assertion,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
        current = statuses[self.id].get(person.main_id, None)
        if current is not None or not isinstance(assertion, P2C):
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

    def __init__(
            self,
            *,
            typ: Check = None,
            count: Check = None,  # number of times this rule matches person
            role: Check = None,
            date: Check = None,
            place_name: Check = None,
            age: Check = None,
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

    def precompute(
            self,
            personset: PersonSet,
            decujus: int,
            precomputed: Precomputed,
            ):
        precomputed[self.id] = {}   # for each person, her birth date

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
        births = precomputed[self.id]
        birth = person.birthISODate
        if birth:
            births[person.main_id] = [int(birth[0:4]), 0]
        else:
            births[person.main_id] = [None, 0]

    def merge(
            self,
            assertion: Assertion,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
        current = statuses[self.id].get(person.main_id, None)

        if current is not None:
            # If we already know the result, don't bother computing
            return
        if not isinstance(assertion, P2E):
            return
        if not self.role.match(assertion.role_id):
            return
        if not self.type.match(assertion.event.type_id):
            return
        if not self.date.match(assertion.event.date_sort):
            return
        if (
                self.place_name
                and not self.place_name.match(
                    assertion.event.get_place_part("name"))
           ):
            return

        births = precomputed[self.id]
        birth = births.get(person.main_id, None)

        if self.age and birth:
            if birth[0] and assertion.event.date_sort:
                try:
                    year2 = int(assertion.event.date_sort[0:4])
                    if not self.age.match(year2 - birth[0]):
                        return
                except Exception:
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

    def initial(
            self,
            person: Persona,
            precomputed: Precomputed,
            statuses: Statuses,
            ):
        statuses[self.id][person.main_id] = True

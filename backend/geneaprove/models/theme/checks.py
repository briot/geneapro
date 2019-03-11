"""
How to compare an expected and an actual value, when applying
themes.
"""

import abc # abstract base classes
from collections.abc import Iterable
import enum

__slots__ = ["Checker", "Check_Success", "Check_Exact"]


class ValueType(enum.Enum):   # Javascript  OperatorTypes
    INT = 'int'
    INT_LIST = 'list:int'
    BOOL = 'bool'
    STR = 'str'
    STR_LIST = 'list:str'
    PERSON = 'person'

    def is_list(self):
        """
        Whether we expect a list of values
        """
        return self.value.startswith('list:')

    def base_type(self):
        """
        For a list, the type of elements in the list.
        Otherwise self itself
        """
        if self == ValueType.INT_LIST:
            return ValueType.INT
        elif self == ValueType.STR_LIST:
            return ValueType.STR
        else:
            return self

    def convert(self, value):
        """
        Convert value to the appropriate type
        """

        # Parse lists if needed
        if self.is_list():
            # From a string read in the database ?
            if isinstance(value, str):
                assert (value[0] == '[' and value[-1] == ']') or \
                       (value[0] == '(' and value[-1] == ')')
                value = value[1:-1].split(',')

            assert isinstance(value, list)
            base = self.base_type()
            return [base.convert(c) for c in value]

        if self == ValueType.INT:
            return int(value)
        elif self == ValueType.PERSON:
            return int(value)
        elif self == ValueType.BOOL:
            if isinstance(value, str):
                return value.lower() in ('true', 't')
            return bool(value)
        elif self == ValueType.STR:
            assert isinstance(value, str)
            return value
        else:
            raise TypeError(f"Cannot convert {self}")


class Check(object, metaclass=abc.ABCMeta):
    """
    Compares two values according to some relation (contains, is, before,...)
    """

    def __init__(self, reference):
        self.reference = reference

    @abc.abstractmethod
    def match(self, value):
        raise Exception("Abstract class")

    def __str__(self):
        return (f"<{self.__class__.__name__} ref={self.reference}"
                f" ({type(self.reference)}>")


class ICheck(Check):
    """
    Base class for case-insensitive comparisons
    """

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

    @abc.abstractmethod
    def imatch(self, value):
        """Value is already lower-cased"""
        raise Exception("Abstract method")


class Check_Success(Check):
    """Always matches"""
    def __init__(self, *args, **kwargs):
        super().__init__(None)

    def match(self, value):
        return True

class Check_Exact(Check):
    """Equal to"""
    def match(self, value):
        return value == self.reference

class Check_IExact(ICheck):
    """Equal to (case insensitive)"""
    def imatch(self, value):
        return value == self.reference

class Check_Different(Check):
    """Different from"""
    def match(self, value):
        return value != self.reference

class Check_IDifferent(ICheck):
    """Different from (case insensitive)"""
    def imatch(self, value):
        return value != self.reference

class Check_In(Check):
    """Value in list"""
    def match(self, value):
        return value in self.reference

class Check_IIn(ICheck):
    """Value in list (case insensitive)"""
    def imatch(self, value):
        return value in self.reference

class Check_Contains(Check):
    """Contains"""
    def match(self, value):
        return value and self.reference in value

class Check_IContains(ICheck):
    """Contains (case insensitive)"""
    def imatch(self, value):
        return value and self.reference in value

class Check_Contains_Not(Check):
    """Does not contain"""
    def match(self, value):
        return value and self.reference not in value

class Check_IContains_Not(ICheck):
    """Does not contain (case insensitive)"""
    def imatch(self, value):
        return value and self.reference not in value

class Check_Less(Check):
    """Less than"""
    def match(self, value):
        return value and value < self.reference

class Check_Less_Or_Equal(Check):
    """Less or equal to"""
    def match(self, value):
        return value and value <= self.reference

class Check_Greater(Check):
    """Greater than"""
    def match(self, value):
        return value and value > self.reference

class Check_Greater_Or_Equal(Check):
    """Greater or equal to"""
    def match(self, value):
        return value and value >= self.reference

class Checker:

    # The keys in this dict are saved in the database, and should be changed
    # with care
    __MAPPING = {
        "=":          (Check_Exact, ValueType.STR),
        "=int":       (Check_Exact, ValueType.INT),
        "=bool":      (Check_Exact, ValueType.BOOL),
        "=pers":      (Check_Exact, ValueType.PERSON),

        "i=":         (Check_IExact, ValueType.STR),

        "!=":         (Check_Different, ValueType.STR),
        "!=int":      (Check_Different, ValueType.INT),
        "!=bool":     (Check_Different, ValueType.BOOL),

        "i!=":        (Check_IDifferent, ValueType.STR),

        "in":         (Check_In, ValueType.STR_LIST),
        "in_int":     (Check_In, ValueType.INT_LIST),

        "iin":        (Check_IIn, ValueType.STR),

        "contains":   (Check_Contains, ValueType.STR),
        "icontains":  (Check_IContains, ValueType.STR),
        "!contains":  (Check_Contains_Not, ValueType.STR),
        "!icontains": (Check_IContains_Not, ValueType.STR),

        "<str":       (Check_Less, ValueType.STR),
        "<=str":      (Check_Less_Or_Equal, ValueType.STR),
        ">=str":      (Check_Greater_Or_Equal, ValueType.STR),
        ">str":       (Check_Greater, ValueType.STR),

        "<int":       (Check_Less, ValueType.INT),
        "<=int":      (Check_Less_Or_Equal, ValueType.INT),
        ">=int":      (Check_Greater_Or_Equal, ValueType.INT),
        ">int":       (Check_Greater, ValueType.INT),
    }

    # List of valid checkers, to send to front-end
    CHECKS_LIST = [  # Javascript OperatorList
       {'op': name, 'label': value[0].__doc__,
        'basetype': value[1].base_type().value,
        'is_list': value[1].is_list()}
       for name, value in __MAPPING.items()]

    # List of valid checkers, for use in django models
    DJANGO_CHOICES = [(n, n) for n in __MAPPING]

    @staticmethod
    def build_check(part):
        """
        :param rules.RulePart part: as read in the database
        :returntype: Check
        """
        descr = Checker.__MAPPING[part.operator]
        return descr[0](descr[1].convert(part.value))

    @staticmethod
    def part_to_json(part):
        """
        Convert a RulePart instance to a JSON object
        """
        descr = Checker.__MAPPING[part.operator]
        return {  # Javascript's  RulePart
            "field": part.field,
            "operator": part.operator,
            "value": descr[1].convert(part.value),
        }

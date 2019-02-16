"""
How to compare an expected and an actual value, when applying
themes.
"""

import abc # abstract base classes

__slots__ = ["build_check", "check_choices"]


class Check(object, metaclass=abc.ABCMeta):
    """
    Compares two values according to some relation (contains, is, before,...)
    """

    def __init__(self, reference):
        try:
            self.reference = int(reference)
        except:
            self.reference = reference

    @abc.abstractmethod
    def match(self, value):
        raise Exception("Abstract class")


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

class Check_Contains_Not(Check):
    suffix = "__contains_not"
    def match(self, value):
        return value and self.reference not in value

class Check_IContains_Not(ICheck):
    suffix = "__icontains_not"
    def imatch(self, value):
        return value and self.reference not in value

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


mapping = {
    "=":          Check_Exact,
    "i=":         Check_IExact,
    "!=":         Check_Different,
    "i!=":        Check_IDifferent,
    "in":         Check_In,
    "iin":        Check_IIn,
    "contains":   Check_Contains,
    "icontains":  Check_IContains,
    "!contains":  Check_Contains_Not,
    "!icontains": Check_IContains_Not,
    "<":          Check_Less,
    "<=":         Check_Less_Or_Equal,
    ">=":         Check_Greater_Or_Equal,
    ">":          Check_Greater
}

check_choices = [(n, n) for n in mapping]   # for use in a django models

def build_check(operator, value):
    """
    Given three strings read in the database, return a python object too
    perform the check
    """
    if value[0] == '(' and value[-1] == ')':
        value = tuple(value[1:-1].split(','))
    return mapping[operator](value)

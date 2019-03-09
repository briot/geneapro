"""
How to compare an expected and an actual value, when applying
themes.
"""

import abc # abstract base classes

__slots__ = ["build_check", "check_choices", "checks_list"]


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
    """Value found in list"""
    def match(self, value):
        return value in self.reference

class Check_IIn(ICheck):
    """Value found in list (case insensitive)"""
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

checks_list = [
   {'op': name, 'doc': value.__doc__, 'label': name}
   for name, value in mapping.items()]

def build_check(operator, value):
    """
    Given three strings read in the database, return a python object too
    perform the check
    """
    if value[0] == '(' and value[-1] == ')':
        value = tuple(value[1:-1].split(','))
    return mapping[operator](value)

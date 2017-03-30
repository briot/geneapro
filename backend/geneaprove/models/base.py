from django.db import models
from geneaprove.utils import date

class GeneaProveModel(models.Model):

    def to_json(self):
        """Returns a version of self suitable for use in json. By default,
           this returns the dictionary of the class without the attributes
           starting with _"""
        result = {}
        for key, value in self.__dict__.items():
            if key[0] != '_':
                result[key] = value
        return result

    class Meta:
        """Meta data for the model"""
        abstract = True


def compute_sort_date(partial_date):
    """
    Given a date as read in a source, parse it to an approximatin that
    can be used for sorting purposes.
    """
    return (None
            if partial_date is None
            else date.DateRange(partial_date).sort_date())


##########
# Lookup #
##########

class _LookupDescriptor(object):
    def __init__(self, kwargs):
        self.kwargs = kwargs
        self._cached = None

    def __get__(self, obj, klass=None):
        if self._cached is None:
            if klass is None:
                klass = type(obj)
            self._cached = klass.objects.get(**self.kwargs).pk
        return self._cached


def lazy_lookup(**kwargs):
    """
    A value that will be looked up lazily the first time it is read.
    """
    return _LookupDescriptor(kwargs)


#############
# Part_Type #
#############

class Part_Type(GeneaProveModel):
    """
    An abstract base class for the various tables that store components of
    higher level entities. These are associated with a simple name in general,
    but we also store the required information to import and export them to
    the Gedcom format
    """

    name = models.CharField(max_length=100, blank=False, null=False)
    gedcom = models.CharField(
        max_length=15, help_text="Name in Gedcom files", blank=True)

    class Meta:
        """Meta data for the model"""
        abstract = True
        ordering = ("name",)
        db_table = "part_type"

    def __str__(self):
        if self.gedcom:
            return self.name + " (gedcom: " + self.gedcom + ")"
        else:
            return self.name

from django.db import models
from geneaprove.utils import date

class GeneaProveModel(models.Model):

    def to_json(self):
        """Returns a version of self suitable for use in json. By default,
           this returns the dictionary of the class without the attributes
           starting with _"""
        result = {}
        for key, value in self.__dict__.iteritems():
            if key[0] != '_':
                result[key] = value
        return result

    class Meta:
        """Meta data for the model"""
        abstract = True


class PartialDateField(models.CharField):
    """
    A new type of field: this stores a date/time or date range exactly
    as was entered by the user (that is it fundamentally behaves as a
    text field). However, whenever it is modified, it also modifies another
    field in the model with a standard date/time which can be used for
    sorting purposes
    """
    # ??? We should also override form_field, so that we can more easily
    #     create html input fields to edit this field

    # __metaclass__ = models.SubfieldBase

    def __init__(self, max_length=0, null=True, *args, **kwargs):
        kwargs["null"] = null
        super(PartialDateField, self).__init__(
            max_length=100, *args, **kwargs)

    def contribute_to_class(self, cls, name):
        """Add the partialDateField to a class, as well as a second field
           used for sorting purposes"""
        sortfield = models.CharField('used to sort', null=True, max_length=100)
        self._sortfield = name + "_sort"
        cls.add_to_class(self._sortfield, sortfield)
        super(PartialDateField, self).contribute_to_class(cls, name)

    def pre_save(self, model_instance, add):
        """Update the value of the sort field based on the contents of self"""
        val = super(PartialDateField, self).pre_save(model_instance, add)
        if val:
            sort = date.DateRange("%s" % val).sort_date()
            setattr(model_instance, self._sortfield, sort)
        return val


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

    def __unicode__(self):
        if self.gedcom:
            return self.name + " (gedcom: " + self.gedcom + ")"
        else:
            return self.name

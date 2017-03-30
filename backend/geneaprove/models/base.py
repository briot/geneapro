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

    description = """Partial date/time or date range.
Syntax is to store this exactly as entered by the user, but modify another
existing field of the model to include a parsed version of that date, that
can be used for storing."""

    def __init__(self, base_date_field, *args, **kwargs):
        assert(isinstance(base_date_field, str))

        kwargs['max_length'] = 100
        self._base_date_field = base_date_field
        super(PartialDateField, self).__init__(*args, **kwargs)

    def pre_save(self, model_instance, add):
        """Update the value of the sort field based on the contents of self"""
        val = super(PartialDateField, self).pre_save(model_instance, add)
        if val:
            sort = date.DateRange("%s" % val).sort_date()
            setattr(self, self._base_date_field, sort)
        return val

    def deconstruct(self):
        name, path, args, kwargs = super(PartialDateField, self).deconstruct()
        del kwargs["max_length"]
        kwargs['base_date_field'] = self._base_date_field
        return name, path, args, kwargs


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

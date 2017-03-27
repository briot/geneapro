from django.db import models
from .base import GeneaProveModel, PartialDateField, Part_Type


class Place(GeneaProveModel):
    """
    Information about a historical place. Places are organized hierarchically,
    to avoid duplicating information whenever possible (for instance, if a
    city was known with a different name in different times, and we have
    several locations in this city, we do not want to duplicate the historical
    names for every location).
    The actual info for a place is defined in terms of Place_Part
    """

    date_sort = models.DateTimeField(null=True)
    date = PartialDateField("date_sort", null=True)
    parent_place = models.ForeignKey(
        'self', null=True,
        help_text="The parent place, that contains this one")
    name = models.CharField(
        max_length=100, help_text="Short description of the place")

    def __unicode__(self):
        parts = self.parts.all()
        name = ",".join([p.name for p in parts])
        if self.parent_place:
            return unicode(self.name) + " " + unicode(self.parent_place) + name
        else:
            return unicode(self.name) + " " + name

    class Meta:
        """Meta data for the model"""
        ordering = ("date_sort",)
        db_table = "place"


class Place_Part_Type(Part_Type):
    """
    Contains information about various schemes for organizing place data
    """

    class Meta:
        """Meta data for the model"""
        db_table = "place_part_type"


class Place_Part(GeneaProveModel):
    """
    Specific information about a place
    """

    # ??? How do we know where the place_part was found (ie for instance an
    # alternate name for the place found in a different document ?)
    # ??? Should the existence date be a place_part as well, or a field in
    # a place part, so that the same place with different names results in
    # a single id
    place = models.ForeignKey(Place, related_name="parts")
    type = models.ForeignKey(Place_Part_Type)
    name = models.CharField(max_length=200)
    sequence_number = models.PositiveSmallIntegerField(
        "Sequence number", default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ('sequence_number', 'name')
        db_table = "place_part"

    def __unicode__(self):
        return unicode(self.type) + "=" + self.name


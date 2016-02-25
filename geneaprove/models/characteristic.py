from django.db import models
from .place import Place
from .base import GeneaProveModel, PartialDateField, Part_Type


class Characteristic_Part_Type(Part_Type):

    is_name_part = models.BooleanField(default=False)

    # Some hard-coded values for efficiency. Ideally, we should look these
    # from the database. The problem is if the database gets translated
    sex = 1
    given_name = 6
    surname = 7

    class Meta:
        """Meta data for the model"""
        db_table = "characteristic_part_type"


class Characteristic(GeneaProveModel):
    """
    A characteristic is any data that distinguishes one person from another.
    A Characteristic is associated with a Persona or a Group through an
    assertion.
    """

    name = models.TextField(
        help_text="Name of the characteristic. This could be guessed from"
            + " its parts only if there is one of the latter, so we store"
            + " it here""")
    place = models.ForeignKey(Place, null=True)
    date = PartialDateField(null=True)

    class Meta:
        """Meta data for the model"""
        db_table = "characteristic"

    def to_json(self):
        return {
            "name": self.name,
            "sources": list(self.sources if hasattr(self, 'sources') else []),
            "date": self.date,
            "date_sort": self.date_sort,
            "place": self.place}


class Characteristic_Part(GeneaProveModel):
    """
    Most characteristics have a single part (such as Occupation
    for instance). However, the full name is also stored as a
    characterstic, and therefore various parts might be needed.
    """

    characteristic = models.ForeignKey(Characteristic, related_name="parts")
    type = models.ForeignKey(Characteristic_Part_Type)
    name = models.TextField()
    sequence_number = models.IntegerField(default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ("sequence_number", "name")
        db_table = "characteristic_part"

    def __unicode__(self):
        return self.type.name + "=" + self.name

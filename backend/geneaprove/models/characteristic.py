from django.db import models
from geneaprove.utils.date import DateRange
from .place import Place
from .base import GeneaProveModel, compute_sort_date, Part_Type, lazy_lookup


class Characteristic_Part_Type(Part_Type):

    is_name_part = models.BooleanField(default=False)

    PK_sex = lazy_lookup(gedcom='SEX')
    PK_given_name = lazy_lookup(gedcom='GIVN')
    PK_surname = lazy_lookup(gedcom='SURN')

    class Meta:
        """Meta data for the model"""
        db_table = "characteristic_part_type"
        ordering = ("name", )


class Characteristic(GeneaProveModel):
    """
    A characteristic is any data that distinguishes one person from another.
    A Characteristic is associated with a Persona or a Group through an
    assertion.
    """

    name = models.TextField(
        help_text="Name of the characteristic. This could be guessed from"
        " its parts only if there is one of the latter, so we store"
        " it here""")
    place = models.ForeignKey(Place, null=True, on_delete=models.CASCADE)
    date = models.CharField(
        max_length=100, null=True,
        help_text="Date as read in the original source")
    date_sort = models.CharField(
        null=True, max_length=100,
        help_text="Date, parsed automatically")

    def __str__(self):
        return f"<Characteristic name={self.name}>"

    class Meta:
        """Meta data for the model"""
        db_table = "characteristic"

    def save(self, **kwargs):
        self.date_sort = compute_sort_date(self.date)
        super().save(**kwargs)

    def to_json(self):
        d = self.date_sort
        return {
            "name": self.name,
            "sources": list(self.sources if hasattr(self, 'sources') else []),
            "date": self.date,
            "date_sort": None if not d else DateRange(d),
            "place": self.place_id}


class Characteristic_Part(GeneaProveModel):
    """
    Most characteristics have a single part (such as Occupation
    for instance). However, the full name is also stored as a
    characteristic, and therefore various parts might be needed.
    """

    characteristic = models.ForeignKey(Characteristic, related_name="parts", on_delete=models.CASCADE)
    type = models.ForeignKey(Characteristic_Part_Type, on_delete=models.CASCADE)
    name = models.TextField()
    sequence_number = models.IntegerField(default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ("sequence_number", "name")
        db_table = "characteristic_part"

    def __str__(self):
        return self.type.name + "=" + self.name

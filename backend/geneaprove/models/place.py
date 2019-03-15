from django.db import models
from .base import GeneaProveModel, compute_sort_date, Part_Type


class Place(GeneaProveModel):
    """
    Information about a historical place. Places are organized hierarchically,
    to avoid duplicating information whenever possible (for instance, if a
    city was known with a different name in different times, and we have
    several locations in this city, we do not want to duplicate the historical
    names for every location).
    The actual info for a place is defined in terms of Place_Part
    """

    date = models.CharField(
        max_length=100, null=True,
        help_text="Date as found in original source")
    date_sort = models.CharField(
        max_length=100, null=True,
        help_text="Date parsed automatically")

    parent_place = models.ForeignKey(
        'self', null=True,
        help_text="The parent place, that contains this one",
        on_delete=models.CASCADE)
    name = models.CharField(
        max_length=100, help_text="Short description of the place")

    def __str__(self):
        parts = self.parts.all()
        name = ",".join([p.name for p in parts])
        if self.parent_place:
            return str(self.name) + " " + str(self.parent_place) + name
        else:
            return str(self.name) + " " + name

    class Meta:
        """Meta data for the model"""
        ordering = ("date_sort",)
        db_table = "place"

    def save(self, **kwargs):
        self.date_sort = compute_sort_date(self.date)
        super().save(**kwargs)

    def get_asserts(self):
        """
        Return all assertions related to the given place.
        Only the id is retrieved for some related fields like persons and
        events. Further queries are needed to retrieve them.
        """
        from .asserts import P2C, P2E
        asserts = []

        if self.id != -1:
            asserts.extend(
                P2C.objects.select_related(
                    *P2C.related_json_fields()
                ).filter(characteristic__place_id=self.id))

            asserts.extend(
                P2E.objects.select_related(
                    *P2E.related_json_fields()
                ).filter(event__place_id=self.id))

        return asserts


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
    place = models.ForeignKey(Place, related_name="parts", on_delete=models.CASCADE)
    type = models.ForeignKey(Place_Part_Type, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    sequence_number = models.PositiveSmallIntegerField(
        "Sequence number", default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ('sequence_number', 'name')
        db_table = "place_part"

    def __str__(self):
        return str(self.type) + "=" + self.name

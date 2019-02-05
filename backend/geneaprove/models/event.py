from django.db import models
from geneaprove.utils.date import DateRange
from .place import Place
from .base import GeneaProveModel, Part_Type, compute_sort_date, lazy_lookup


class Event_Type(Part_Type):
    """
    The type of events
    """

    class Meta:
        """Meta data for the model"""
        db_table = "event_type"

    PK_birth = lazy_lookup(gedcom='BIRT')
    PK_marriage = lazy_lookup(gedcom='MARR')
    PK_death = lazy_lookup(gedcom='DEAT')


class Event_Type_Role(GeneaProveModel):
    """
    The individual roles of a defined event type, such as "witness",
    "chaplain"
    """

    type = models.ForeignKey(
        Event_Type, null=True, blank=True,
        help_text="The event type for which the role is defined. If unset,"
        " this applies to all events")
    name = models.CharField(max_length=50)

    class Meta:
        """Meta data for the model"""
        db_table = "event_type_role"

    def __str__(self):
        if self.type:
            return str(self.id) + ": " + self.type.name + " => " + self.name
        else:
            return str(self.id) + ": * =>" + self.name

    PK_principal = lazy_lookup(name='principal')
    PK_birth__father = lazy_lookup(name='father', type__gedcom='BIRT')
    PK_birth__mother = lazy_lookup(name='mother', type__gedcom='BIRT')
    PK_adoption__adopting = lazy_lookup(name='adopting', type__gedcom='ADOP')
    PK_adoption__not_adopting = lazy_lookup(
        name='not adopting', type__gedcom='ADOP')


class Event(GeneaProveModel):
    """
    An event is any type of happening
    A Event is associated with a Persona or a Group through an
    assertion.
    """

    type = models.ForeignKey(Event_Type)
    place = models.ForeignKey(Place, null=True)
    name = models.CharField(max_length=100)
    date = models.CharField(
        max_length=100, null=True,
        help_text="Date of the event, as found in original source")
    date_sort = models.CharField(
        max_length=100, null=True,
        help_text="Date of the event, parsed automatically")

    class Meta:
        """Meta data for the model"""
        db_table = "event"

    def save(self, **kwargs):
        self.date_sort = compute_sort_date(self.date)
        super().save(**kwargs)

    def __str__(self):
        d = self.date
        date = " (on " + d + ")" if d else ""
        return self.name + date

    def to_json(self):
        # Convert the date sort to a datetime, so that we can then send either
        # only the year or the full date to clients
        d = self.date_sort
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "place": self.place_id,
            "date": self.date,
            "date_sort": self.date_sort
        }

    def get_place_part(self, part):
        """
        Look for a specific place part, possibly querying the database.
        `part` is one of "name", "country", ...
        """
        if self.place:
            if part == "name":
                return self.place.name
            else:
                try:
                    return self.place.parts.get(part, "")
                except ValueError:
                    return None
        else:
            return None

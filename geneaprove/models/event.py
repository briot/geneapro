from django.db import models
from .place import Place
from .base import GeneaProveModel, PartialDateField, Part_Type


class Event_Type (Part_Type):
    """
    The type of events
    """

    class Meta:
        """Meta data for the model"""
        db_table = "event_type"

    # Some hard-coded values for efficiency. Ideally, we should look these
    # from the database. The problem is if the database gets translated
    birth = 1
    marriage = 3
    death = 4


class Event_Type_Role(GeneaProveModel):
    """
    The individual roles of a defined event type, such as "witness",
    "chaplain"
    """

    type = models.ForeignKey(
        Event_Type, null=True, blank=True,
        help_text="The event type for which the role is defined. If unset,"
        + " this applies to all events")
    name = models.CharField(max_length=50)

    class Meta:
        """Meta data for the model"""
        db_table = "event_type_role"

    def __unicode__(self):
        if self.type:
            return unicode(self.id) + ": " + self.type.name + " => " + self.name
        else:
            return unicode(self.id) + ": * =>" + self.name

    # Some hard-coded values for efficiency. Ideally, we should look these
    # from the database. The problem is if the database gets translated
    principal = 5
    birth__father = 6
    birth__mother = 7


class Event(GeneaProveModel):
    """
    An event is any type of happening
    A Event is associated with a Persona or a Group through an
    assertion.
    """

    type = models.ForeignKey(Event_Type)
    place = models.ForeignKey(Place, null=True)
    name = models.CharField(max_length=100)
    date = PartialDateField(
        help_text="The date of the event, as found in the original source."
        + " This date is internally parsed into date_sort"
        + " which is used for sorting purposes")

    class Meta:
        """Meta data for the model"""
        db_table = "event"

    def __unicode__(self):
        d = self.date
        date = " (on " + d + ")" if d else ""
        return self.name + date

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "place": self.place,
            "date": self.date,
            "date_sort": self.date_sort}

from django.db import models
import django.utils.timezone
from .base import GeneaProveModel
from .characteristic import Characteristic
from .event import Event, Event_Type_Role
from .group import Group, Group_Type_Role
from .persona import Persona
from .researcher import Researcher
from .source import Source
from .surety import Surety_Scheme, Surety_Scheme_Part


class Assertion(GeneaProveModel):
    """
    Links two entities together, describing various facts we have learned
    about in a source.
    Not all combination of subject1 and subject2 make sense as per the
    GenTech standard (although they are all allowed). The following
    combination are described in the standard:
      (Persona, Event)  # was part of an event (role is described separately)
      (Persona, Group)  # is a member of a group (role is described)
                        # Or "member of children of ..." (not used here)
      (Persona, Characteristic) # has some attribute
      (Event,   Event)  # One event occurred before another for instance
      (Group,   Event)
      (Group,   Persona)
      (Group,   Group)  # Two groups might be the same for instance
      (Group,   Characteristic) # e.g. prays on Sunday
      (Characteristic, Group)   # occupation members of all jobs done by a
                                # given person

    In Gentech, personas can be grouped to indicate they represent the same
    physical persona. To do this, you would create a group to which they all
    belong. We could also have used an assertion that connects two
    personas (Persona,Persona).
    """

    surety = models.ForeignKey(Surety_Scheme_Part)
    researcher = models.ForeignKey(Researcher, null=False)
    source = models.ForeignKey(
        Source, null=True,
        help_text="An assertion comes from no more than one source. It can"
            + " also come from one or more other assertions through the"
            + " assertion_assertion table, in which case source_id is"
            + " null")
    rationale = models.TextField(
        null=True,
        help_text="Explains why the assertion (deduction, comments,...)")
    disproved = models.BooleanField(default=False)
    last_change = models.DateTimeField(
        default=django.utils.timezone.now,
        help_text="When was the assertion last modified")

    # "value" is replaced by a dedicated field in the various child classes,
    # for instance P2E.role.

    class Meta:
        """Meta data for the model"""
        db_table = "assertion"

    def to_json(self):
        return {
            "disproved": self.disproved,
            "rationale": self.rationale,
            "researcher": self.researcher if self.researcher_id else None,
            "last_change": self.last_change,
            "source_id": self.source_id,
            "surety": self.surety_id}


class P2P(Assertion):
    """Persona-to-Persona assertions, to represent the Persona.sameAs
       relationship.
    """
    person1 = models.ForeignKey(Persona, related_name="sameAs1")
    person2 = models.ForeignKey(Persona, related_name="sameAs2")
    type = models.IntegerField()

    class Meta:
        db_table = "p2p"

    sameAs = 1
    # valid values for typ.
    # "sameAs" => connects two personas that represent the same real world
    #   person (along with a rationale). One persona might be linked to
    #   several other personas, which in turn can be linked to other
    #   personas.

    def to_json(self):
        res = super(P2P, self).to_json()
        res['p1'] = {'person': self.person1}
        res['p2'] = {'person': self.person2}
        return res


class P2C(Assertion):
    """Persona-to-Characteristic assertions"""

    person = models.ForeignKey(Persona, related_name="characteristics")
    characteristic = models.ForeignKey(Characteristic, related_name="persons")

    class Meta:
        """Meta data for the model"""
        db_table = "p2c"

    def to_json(self):
        res = super(P2C, self).to_json()
        parts = []
        for p in self.characteristic.parts.select_related():
            parts.append({'name': p.type.name, 'value': p.name})
        res['p1'] = {'person': self.person}
        res['p2'] = {'char': self.characteristic, 'parts': parts}
        return res

class P2E(Assertion):
    """Persona-to-Event assertions"""

    person = models.ForeignKey(Persona, related_name="events")
    event = models.ForeignKey(Event, related_name="actors")
    role = models.ForeignKey(Event_Type_Role, null=True)

    def __unicode__(self):
        if self.role:
            role = " (as " + self.role.name + ")"
        else:
            role = ""
        return unicode(self.person) + " " + unicode(self.event) + role

    class Meta:
        """Meta data for the model"""
        db_table = "p2e"

    def to_json(self):
        res = super(P2E, self).to_json()
        res['p1'] = {'person': self.person}
        res['p2'] = {'event': self.event, 'role': self.role.name}
        return res


class P2G(Assertion):
    """Persona-to-Group assertions"""
    person = models.ForeignKey(Persona, related_name="groups")
    group = models.ForeignKey(Group, related_name="personas")
    role = models.ForeignKey(Group_Type_Role, null=True)

    class Meta:
        """Meta data for the model"""
        db_table = "p2g"

    def to_json(self):
        res = super(P2G, self).to_json()
        res['p1'] = {'person': self.person}
        res['p2'] = {'group': self.group, 'role': self.role.name}
        return res



# class E2C(Assertion):
#    """Event-to-Characteristic assertions.
#       Such assertions are not part of the GENTECH super-statement, but
#       are used in particular to store event notes imported from GEDCOM
#    """
#   event      = models.ForeignKey (Event, related_name="characteristics")
#   characteristic = models.ForeignKey (Characteristic, related_name="events")

class Assertion_Assertion (GeneaProveModel):
    original = models.ForeignKey(Assertion, related_name="leads_to")
    deduction = models.ForeignKey(Assertion, related_name="deducted_from")
    sequence_number = models.IntegerField(default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ("sequence_number",)
        db_table = "assertion_assertion"

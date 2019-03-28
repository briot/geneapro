from django.db import models
import django.utils.timezone
import logging
from .base import GeneaProveModel
from .characteristic import Characteristic
from .event import Event, Event_Type_Role
from .group import Group, Group_Type_Role
from .persona import Persona
from .place import Place
from .researcher import Researcher
from .source import Source
from .surety import Surety_Scheme_Part
from .representation import Representation


logger = logging.getLogger('geneaprove.asserts')


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

    surety = models.ForeignKey(Surety_Scheme_Part, on_delete=models.CASCADE)
    researcher = models.ForeignKey(
        Researcher, null=False, on_delete=models.CASCADE)
    source = models.ForeignKey(
        Source, null=True,
        help_text="An assertion comes from no more than one source. It can"
        " also come from one or more other assertions through the"
        " assertion_assertion table, in which case source_id is"
        " null",
        on_delete=models.CASCADE)
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
        # db_table = "assertion"
        abstract = True

    @staticmethod
    def related_json_fields():
        """What select_related() to use if we want to export to JSON"""
        return []

    def to_json(self):
        return {
            "id": self.id,
            "disproved": self.disproved,
            "rationale": self.rationale,
            "researcher": self.researcher_id,
            "last_change": self.last_change,
            "source_id": self.source_id,
            "surety": self.surety_id}

    def getRelatedIds(self, into):
        """
        :param geneaprove.views.related.JSONResult into: where to add the ids
        """
        into.update(source_ids=[self.source_id])


class P2P_Type(GeneaProveModel):
    """
    Describes how two persons relate to each other
    """
    name = models.TextField(null=False)

    class Meta:
        db_table = "p2p_type"

    sameAs = 1
    # "sameAs" => connects two personas that represent the same real world
    #   person (along with a rationale). One persona might be linked to
    #   several other personas, which in turn can be linked to other
    #   personas.


class P2P(Assertion):
    """Persona-to-Persona assertions, to represent the Persona.sameAs
       relationship.
    """
    person1 = models.ForeignKey(
        Persona, related_name="p2p_from", on_delete=models.CASCADE)
    person2 = models.ForeignKey(
        Persona, related_name="p2p_to", on_delete=models.CASCADE)
    type = models.ForeignKey(P2P_Type, on_delete=models.CASCADE)

    class Meta:
        db_table = "p2p"

    def getRelatedIds(self, into):
        super().getRelatedIds(into)
        into.update(person_ids=[self.person1_id, self.person2_id])

    def to_json(self):
        res = super().to_json()
        res['p1'] = {'person': self.person1_id}
        res['p2'] = {'person': self.person2_id}
        res['type'] = self.type_id
        return res


class P2C(Assertion):
    """Persona-to-Characteristic assertions"""

    person = models.ForeignKey(
        Persona, related_name="p2c", on_delete=models.CASCADE)
    characteristic = models.ForeignKey(
        Characteristic, related_name="persons", on_delete=models.CASCADE)

    class Meta:
        """Meta data for the model"""
        db_table = "p2c"

    def __str__(self):
        return f"<P2C person={self.person_id} char={self.characteristic}>"

    @staticmethod
    def related_json_fields():
        return Assertion.related_json_fields() + [
            'characteristic', 'characteristic__parts']

    def getRelatedIds(self, into):
        super().getRelatedIds(into)
        into.update(person_ids=[self.person_id],
                    place_ids=[self.characteristic.place_id])

    def to_json(self):
        res = super().to_json()
        fetch_image = False

        logger.debug('P2C.to_json')
        # ??? Could be slow, and result in a lot of queries
        parts = []
        for p in self.characteristic.parts.all():
            parts.append({'type': p.type_id, 'value': p.name})

            # ??? should test on type_id
            #if p.type.gedcom == "_IMG":
            #    fetch_image = True

        res['p1'] = {'person': self.person_id}
        res['p2'] = {'char': self.characteristic,
                     'repr': list(self.source.representations.all())
                         if fetch_image and self.source
                         else None,
                     'parts': parts}
        logger.debug('done P2C.to_json')
        return res


class P2E(Assertion):
    """Persona-to-Event assertions"""

    person = models.ForeignKey(
        Persona, related_name="events", on_delete=models.CASCADE)
    event = models.ForeignKey(
        Event, related_name="actors", on_delete=models.CASCADE)
    role = models.ForeignKey(
        Event_Type_Role, null=True, on_delete=models.CASCADE)

    def __str__(self):
        role = f" (as {self.role_id if self.role_id else ''})"
        return f"<P2E person={self.person_id} event={self.event}{role}>"

    class Meta:
        """Meta data for the model"""
        db_table = "p2e"

    @staticmethod
    def related_json_fields():
        """What select_related() to use if we want to export to JSON"""
        return ['event']   # needed for getRelatedIds

    def getRelatedIds(self, into):
        super().getRelatedIds(into)
        into.update(person_ids=[self.person_id],
                    event_ids=[self.event_id],
                    place_ids=[self.event.place_id])

    def to_json(self):
        res = super().to_json()
        res['p1'] = {'person': self.person_id}
        res['p2'] = {'event': self.event_id, 'role': self.role_id}
        return res


class P2G(Assertion):
    """Persona-to-Group assertions"""
    person = models.ForeignKey(
        Persona, related_name="groups", on_delete=models.CASCADE)
    group = models.ForeignKey(
        Group, related_name="personas", on_delete=models.CASCADE)
    role = models.ForeignKey(
        Group_Type_Role, null=True, on_delete=models.CASCADE)

    class Meta:
        """Meta data for the model"""
        db_table = "p2g"

    def getRelatedIds(self, into):
        super().getRelatedIds(into)
        into.update(person_ids=[self.person_id])

    def to_json(self):
        res = super().to_json()
        res['p1'] = {'person': self.person_id}
        res['p2'] = {'group': self.group_id, 'role': self.role_id}
        return res


# class E2C(Assertion):
#    """Event-to-Characteristic assertions.
#       Such assertions are not part of the GENTECH super-statement, but
#       are used in particular to store event notes imported from GEDCOM
#    """
#   event      = models.ForeignKey (Event, related_name="characteristics", on_delete=models.CASCADE)
#   characteristic = models.ForeignKey (Characteristic, related_name="events", on_delete=models.CASCADE)

#class Assertion_Assertion (GeneaProveModel):
#    original = models.ForeignKey(Assertion, related_name="leads_to", on_delete=models.CASCADE)
#    deduction = models.ForeignKey(Assertion, related_name="deducted_from", on_delete=models.CASCADE)
#    sequence_number = models.IntegerField(default=1)
#
#    class Meta:
#        """Meta data for the model"""
#        ordering = ("sequence_number",)
#        db_table = "assertion_assertion"

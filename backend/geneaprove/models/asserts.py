import collections
from django.db import models
import django.utils.timezone
import logging
from .base import GeneaProveModel
from .characteristic import Characteristic, Characteristic_Part_Type
from .event import Event, Event_Type_Role
from .group import Group, Group_Type_Role
from .persona import Persona
from .place import Place
from .researcher import Researcher
from .source import Source
from .surety import Surety_Scheme_Part
from typing import List, Any, Dict, Protocol, Iterable


logger = logging.getLogger('geneaprove.asserts')

# Ids of entities related to the assertions. Each item is a set
RelatedIds = collections.namedtuple(
    'RelatedIds', 'persons events places sources')


class AssertListProtocol(Protocol):
    def add_missing(
            self,
            *,
            persons: Iterable[int] = [],
            places: Iterable[int] = [],
            sources: Iterable[int] = [],
            events: Iterable[int] = [],
            ):
        ...

    def add_known(
            self,
            *,
            events: Iterable[Event] = [],
            persons: Iterable[Persona] = [],
            places: Iterable[Place] = [],
            sources: Iterable[Source] = [],
            ) -> None:
        ...


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
    id: int

    surety_id: int
    surety = models.ForeignKey(Surety_Scheme_Part, on_delete=models.CASCADE)

    researcher_id: int
    researcher = models.ForeignKey(
        Researcher, null=True, on_delete=models.CASCADE)

    source_id: int
    source = models.ForeignKey(
        Source, null=True,
        help_text="An assertion comes from no more than one source. It can"
        " also come from one or more other assertions through the"
        " a2a table, in which case source_id is null",
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
        db_table = "assertion"
        abstract = False

    @staticmethod
    def related_json_fields() -> List[str]:
        """What select_related() to use if we want to export to JSON"""
        return []

    def to_json(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "disproved": self.disproved,
            "rationale": self.rationale,
            "researcher": self.researcher_id,
            "last_change": self.last_change,
            "source_id": self.source_id,
            "surety": self.surety_id,
        }

    def getRelatedIds(self, into: AssertListProtocol) -> None:
        """
        :param AssertList into:
        """
        into.add_missing(sources=(self.source_id, ))


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
    person1_id: int
    person1 = models.ForeignKey(
        Persona, related_name="p2p_from", on_delete=models.CASCADE)

    person2_id: int
    person2 = models.ForeignKey(
        Persona, related_name="p2p_to", on_delete=models.CASCADE)

    type_id: int
    type = models.ForeignKey(P2P_Type, on_delete=models.CASCADE)

    class Meta:
        db_table = "p2p"

    def getRelatedIds(self, into: AssertListProtocol) -> None:
        super().getRelatedIds(into)
        into.add_missing(persons=(self.person1_id, self.person2_id))

    def to_json(self) -> Dict[str, Any]:
        res = super().to_json()
        res['p1'] = {'person': self.person1_id}
        res['p2'] = {'person': self.person2_id}
        res['type'] = self.type_id
        return res


class P2C(Assertion):
    """Persona-to-Characteristic assertions"""

    person_id: int
    person = models.ForeignKey(
        Persona, related_name="p2c", on_delete=models.CASCADE)

    characteristic_id: int
    characteristic = models.ForeignKey(
        Characteristic, related_name="persons", on_delete=models.CASCADE)

    class Meta:
        """Meta data for the model"""
        db_table = "p2c"

    def __str__(self) -> str:
        return f"<P2C person={self.person_id} char={self.characteristic}>"

    @staticmethod
    def related_json_fields() -> List[str]:
        return Assertion.related_json_fields() + ['characteristic']

    def getRelatedIds(self, into: AssertListProtocol) -> None:
        super().getRelatedIds(into)
        into.add_missing(persons=(self.person_id, ),
                         places=(self.characteristic.place_id, ))

    def to_json(self) -> Dict[str, Any]:
        res = super().to_json()
        fetch_image = False

        # ??? Could be slow, and result in a lot of queries
        parts = []
        for p in self.characteristic.parts.all():
            parts.append({'type': p.type_id, 'value': p.name})
            if p.type_id == Characteristic_Part_Type.PK_img:
                fetch_image = True

        res['p1'] = {'person': self.person_id}
        res['p2'] = {
            'char': self.characteristic,
            'repr': (
                list(self.source.representations.all())
                if fetch_image and self.source
                else None
            ),
            'parts': parts,
        }
        return res


class P2E(Assertion):
    """Persona-to-Event assertions"""

    person_id: int
    person = models.ForeignKey(
        Persona, related_name="events", on_delete=models.CASCADE)

    event_id: int
    event = models.ForeignKey(
        Event, related_name="actors", on_delete=models.CASCADE)

    role_id: int
    role = models.ForeignKey(
        Event_Type_Role, null=True, on_delete=models.CASCADE)

    def __str__(self):
        role = f" (as {self.role_id if self.role_id else ''})"
        return f"<P2E person={self.person_id} event={self.event}{role}>"

    class Meta:
        """Meta data for the model"""
        db_table = "p2e"

    @staticmethod
    def related_json_fields() -> List[str]:
        """What select_related() to use if we want to export to JSON"""
        return ['event']   # needed for getRelatedIds

    def getRelatedIds(self, into: AssertListProtocol) -> None:
        super().getRelatedIds(into)
        into.add_known(events=(self.event, ))
        into.add_missing(
            persons=(self.person_id, ),
            events=(self.event_id, ),
            places=(self.event.place_id, ))

    def to_json(self) -> Dict[str, Any]:
        res = super().to_json()
        res['p1'] = {'person': self.person_id}
        res['p2'] = {'event': self.event_id, 'role': self.role_id}
        return res


class P2G(Assertion):
    """Persona-to-Group assertions"""
    person_id: int
    person = models.ForeignKey(
        Persona, related_name="groups", on_delete=models.CASCADE)

    group_id: int
    group = models.ForeignKey(
        Group, related_name="personas", on_delete=models.CASCADE)

    role_id: int
    role = models.ForeignKey(
        Group_Type_Role, null=True, on_delete=models.CASCADE)

    class Meta:
        """Meta data for the model"""
        db_table = "p2g"

    def getRelatedIds(self, into: AssertListProtocol) -> None:
        super().getRelatedIds(into)
        into.add_missing(persons=(self.person_id, ))

    def to_json(self) -> Dict[str, Any]:
        res = super().to_json()
        res['p1'] = {'person': self.person_id}
        res['p2'] = {'group': self.group_id, 'role': self.role_id}
        return res


class G2C(Assertion):
    """Group-to-Characteristic assertions"""
    group_id: int
    group = models.ForeignKey(
        Group, related_name="characteristics", on_delete=models.CASCADE)

    characteristic_id: int
    characteristic = models.ForeignKey(
        Characteristic, related_name="groups", on_delete=models.CASCADE)

    class Meta:
        """Meta data for the model"""
        db_table = "g2c"

    def to_json(self) -> Dict[str, Any]:
        res = super().to_json()

        fetch_image = False

        # ??? Could be slow, and result in a lot of queries
        parts = []
        for p in self.characteristic.parts.all():
            parts.append({'type': p.type_id, 'value': p.name})
            if p.type_id == Characteristic_Part_Type.PK_img:
                fetch_image = True

        res['p1'] = {'group': self.group_id}
        res['p2'] = {
            'char': self.characteristic,
            'repr': (
                list(self.source.representations.all())
                if fetch_image and self.source
                else None
            ),
            'parts': parts,
        }
        return res


class A2A(GeneaProveModel):
    original = models.ForeignKey(
         Assertion, related_name="leads_to", on_delete=models.CASCADE)
    deduction = models.ForeignKey(
         Assertion, related_name="deducted_from", on_delete=models.CASCADE)
    sequence_number = models.IntegerField(default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ("sequence_number", )
        db_table = "a2a"

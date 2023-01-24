import django.test
from geneaprove.models.persona import Persona
from geneaprove.models.asserts import P2P, P2P_Type, P2C, P2E
from geneaprove.models.surety import Surety_Scheme_Part
from geneaprove.models.event import Event, Event_Type
from geneaprove.models.characteristic import (
    Characteristic, Characteristic_Part_Type, Characteristic_Part)
from geneaprove.sql.personas import PersonSet


class TestPersona(django.test.TestCase):

    def __init__(self, *args):
        super().__init__(*args)
        self.default_surety = Surety_Scheme_Part.objects.get(name='normal')
        self.surn = Characteristic_Part_Type.objects.get(gedcom="SURN")

    def create_persona(self, name: str = None, birth: str = None) -> Persona:
        p = Persona.objects.create()

        if name is not None:
            c = Characteristic.objects.create(name=f"surname of {name}")
            Characteristic_Part.objects.create(
                characteristic=c,
                type=self.surn,
                name=name,
            )
            P2C.objects.create(
                person=p,
                characteristic=c,
                surety=self.default_surety,
                disproved=False,
            )

        if birth is not None:
            e = Event.objects.create(
                name=f"birth of {name}",
                type_id=Event_Type.PK_birth,
                date=birth,
            )
            P2E.objects.create(
                person=p,
                event=e,
                surety=self.default_surety,
                disproved=False,
            )

        return p

    def merge_personas(
            self,
            p1: Persona,
            p2: Persona,
            disproved: bool = False) -> None:
        P2P.objects.create(
            person1=p1,
            person2=p2,
            type_id=P2P_Type.sameAs,
            disproved=disproved,
            surety=self.default_surety,
        )

    def test_high_personas(self):
        """
        Personas aggregated into a high-level persona.

        We have decided that some of them are in fact the same real-life
        person. In this case, the personas themselves will not be shown in the
        list of persons, only the high-level persona will be displayed.

           Persona0
                    \
                      Persona2  -- Persona3
                    /                   |
           Persona1                     |
                       Person4  -- not--/

        In this case, characteristics and events are automatically inherited by
        Persona3, and will only be hidden if they are part of an
        assertion-to-assertion link to form an assertion on Persona3. So if we
        have the following tree of assertions:

           birth:    persona0 -- birth of persona0
                     persona1 -- birth of persona1
                     persona2    (no birth)
                     persona3    (no birth, we inherit the two above)

        On the other hand, for names we have assertion-to-assertion:

           name:     persona0 -- name of persona0    (assert 1)
                     persona1 -- name of persona1    (assert 2)
                     persona2    (no name)
                     persona3 -- name of persona3, from assert 1 and assert 2

        """
        personas = [
            self.create_persona(
                name=(f"Persona{j}" if j in (0, 3) else None),
                birth=(f'2020-01-{j}' if j in (0, 1, 4) else None),
            )
            for j in range(0, 5)
        ]
        self.merge_personas(personas[0], personas[2])
        self.merge_personas(personas[1], personas[2])
        self.merge_personas(personas[2], personas[3])
        self.merge_personas(personas[4], personas[3], disproved=True)

        s = PersonSet()

        self.assertEqual(
            s.all_persons(),
            {personas[3].id, personas[4].id},
        )

        # If we have a cycle (Persona3 is also marked as sameAs with
        # persona0 for instance)

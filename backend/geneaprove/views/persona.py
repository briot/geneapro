"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db.models import Min, Q, F, Subquery
from django.db.models.expressions import RawSQL
from django.db import connection, transaction
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.to_json import JSONView
from geneaprove.views.related import JSONResult
from geneaprove.views.graph import global_graph
from geneaprove.views.styles import Styles
from geneaprove.views.queries import sqlin, sql_prefetch_related_object
import logging

logger = logging.getLogger('geneaprove.PERSONA')


def extended_personas(
        asserts=None,
        query_groups=True,
        ids=None, offset=None, limit=None):
    """
    Fetch a number of persons from the database.
    The exact set of persons depends on the following parameters:
        - if nodes is specified, all persons in that iterable are fetched.
        - otherwise, if offset and/or minLength are specified, a subset of
          persons are fetched.
        - otherwise, all persons in the database are returned, which could take
          a long time.

    Return a dict indexed on id containing extended instances of Persona,
    with additional fields for the birth, the death,...

       :param list ids:
           A list of person ids
       :param list|None asserts:
          if a list is given, all found assertions are added to that list.
          Otherwise, assertions are discarded.
       :return: dict of persons:
          * persons is a dictionary of Persona instances, indexed on persona_id

    """

    ##############
    # Create the personas that will be returned.
    ##############

    # This query is much slower than the one below, though it returns a real
    # manager that we can further manipulate.
    # person_manager = models.Persona.objects \
    #     .order_by('display_name') \
    #     .annotate(sex=RawSQL(
    #         "SELECT c.name FROM characteristic_part c, p2c, persona p "
    #         "WHERE c.characteristic_id=p2c.characteristic_id "
    #         "AND c.type_id=%s "
    #         "AND p2c.person_id=p.id "
    #         "AND p.main_id=persona.id",
    #         (models.Characteristic_Part_Type.PK_sex,)
    #     ))
    #
    # ??? Doesn't wor, second instance of persona disappears
    # person_manager = models.Persona.objects \
    #     .order_by('display_name') \
    #     .extra(
    #             select={'sex': 'characteristic_part.name', 'foo': 't2.id'},
    #         tables=['characteristic_part', 'p2c', 'persona'],
    #         where=["characteristic_part.characteristic_id=p2c.characteristic_id",
    #                "characteristic_part.type_id=%s",
    #                "p2c.person_id=t2.id",
    #                "t2.main_id=persona.id"],
    #         params=(models.Characteristic_Part_Type.PK_sex,),
    #     )

    if ids:
        # Convert from ids to main ids
        ids = ','.join('%d' % n for n in ids)
        id_to_main = (
            f"persona.id IN ("
            f"SELECT p.main_id FROM persona p WHERE p.id IN ({ids}))")
    else:
        id_to_main = "persona.main_id=persona.id"

    person_manager = models.Persona.objects.raw(
        ("SELECT persona.*, sub1.sex "
         "FROM persona "
             "LEFT JOIN ("
                "SELECT p.main_id, c.name AS sex "
                "FROM characteristic_part c, p2c, persona p "
                "WHERE c.characteristic_id=p2c.characteristic_id "
                "AND c.type_id=%s"
                "AND p2c.person_id=p.id "
                "GROUP BY p.main_id) sub1 "
             "ON sub1.main_id=persona.id "
        f"WHERE {id_to_main} ") +
        ("ORDER BY persona.name ASC ") +
        (f"LIMIT {limit} " if limit else "") +
        (f"OFFSET {offset} " if offset else ""),
        (models.Characteristic_Part_Type.PK_sex, ),
        )

    persons = {p.id: p for p in person_manager.iterator()}
    return persons


def fetch_p2e(persons, asserts, schemes=None, event_types=None, styles=None):
    """
    Fetch all person-to-event relationships for the persons, add those
    assertions to asserts.
    As a side-effect, this sets the birth, death and marriage dates for the
    persons.

    :param event_types: restricts the types of events that are retrieved
    :params schemes:
       List of ids of Surety_Scheme that are used. You
       should pass a set() if you are interested in this. Otherwise, it is
       just discarded.
    """
    assert schemes is None or isinstance(schemes, set)

    related = ['event', *models.P2E.related_json_fields()]
    if styles and styles.need_places:
        related = related + ['event__place']

    events = models.P2E.objects. \
        annotate(person_main_id=F('person__main_id'),
                 event_type=F('event__type_id'))
    if event_types:
        events = events.filter(event__type__in=event_types)

    for qs in sqlin(events, person__main_id__in=persons.keys()):
        for p2e in sql_prefetch_related_object(qs.all(), *related):
            asserts.append(p2e)

            if schemes is not None:
                schemes.add(p2e.surety.scheme_id)

            if not p2e.disproved \
               and p2e.role_id == models.Event_Type_Role.PK_principal:

                e = p2e.event
                person = persons.get(p2e.person_main_id, None)

                if not e.date_sort:
                    pass
                elif p2e.event_type == models.Event_Type.PK_birth:
                    if person.birthISODate is None or \
                            e.date_sort < person.birthISODate:
                        person.birthISODate = e.date_sort
                elif p2e.event_type == models.Event_Type.PK_death:
                    if person.deathISODate is None or \
                            e.date_sort > person.deathISODate:
                        person.deathISODate = e.date_sort
                elif p2e.event_type == models.Event_Type.PK_marriage:
                    person.marriageISODate = e.date_sort


def fetch_p2c(persons, asserts):
    """
    Fetch all person-to-characteristic assertions for the given list of
    persons. Append them to asserts.
    Each assertion receives an extra `person_main_id` field.

    :param dict persons:
       must be indexed on main id
    """

    pm = models.P2C.objects \
        .prefetch_related(*models.P2C.related_json_fields()) \
        .annotate(person_main_id=F('person__main_id'))

    for p2c_set in sqlin(pm, person__main_id__in=persons.keys()):
        asserts.extend(
            sql_prefetch_related_object(
                p2c_set.all(), 'characteristic__parts'))


def fetch_p2p(persons, asserts):
    """
    Fetch all person-to-person relationships for the given list of persons.
    This includes relationships for any of the related based personas (so the
    set of p2p is the one that was used to compute the main persona)
    """
    # It is enough to test either person1 or person2, since they both have
    # the same main_id
    pm = models.P2P.objects \
        .filter(person1__in=models.Persona.objects
                   .filter(main_id__in=persons.keys())) \
        .select_related(*models.P2P.related_json_fields())

    asserts.extend(pm)


class PersonaView(JSONView):
    """Display all details known about persona ID"""

    def get_json(self, params, id):
        asserts = []
        persons = extended_personas(ids=[int(id)], asserts=asserts)
        fetch_p2c(persons, asserts)
        fetch_p2p(persons, asserts)

        main_id = next(iter(persons))  # only one person in dict
        print(f'MANU main_id {main_id} for {id}')

        r = JSONResult(asserts=asserts)
        return r.to_json({
            "person": persons[main_id],
            "asserts": asserts,
        })


class SuretySchemesList(JSONView):
    """
    Return the list of all defined surety schemes
    """

    def get_json(self, params):
        return {
            "schemes": [
                {"id": s.id,
                 "name": s.name,
                 "description": s.description,
                 "parts": [
                     {"id": p.id,
                      "name": p.name,
                      "description": p.description,
                      "sequence": p.sequence_number}
                     for p in s.parts.all()
                 ]} for s in models.Surety_Scheme.objects.all()]}


class PersonaList(JSONView):
    """View the list of all personas"""

    @transaction.atomic
    def get_json(self, params, decujus=1):
        theme_id = params.get('theme', -1)
        offset = params.get('offset', None)
        limit = params.get('limit', None)

        asserts = []
        styles = Styles(theme_id, graph=global_graph, decujus=decujus)
        persons = extended_personas(
            offset=int(offset) if offset else None,
            limit=int(limit) if limit else None)

        fetch_p2e(
            persons, asserts=asserts,
            styles=styles,
            event_types=(models.Event_Type.PK_birth,
                         models.Event_Type.PK_death,
                         models.Event_Type.PK_marriage))

        all_styles, computed_styles = styles.compute(
            persons, asserts=asserts)

        return {
            "persons": list(persons.values()),
            "allstyles": all_styles,    # all needed styles
            "styles": computed_styles,  # for each person
        }

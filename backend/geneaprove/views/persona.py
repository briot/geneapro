"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db.models import Min, Q
from django.db import transaction
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.to_json import JSONView
from geneaprove.views.related import JSONResult
from geneaprove.views.graph import global_graph
from geneaprove.views.styles import Styles
from geneaprove.views.queries import sqlin, sql_prefetch_related_object
import logging

logger = logging.getLogger('geneaprove.PERSONA')


def __add_default_person_attributes(person):
    """
    Add the default computed attributes for the person.
    PERSON is an instance of Persona.
    """

    person.birthISODate = None
    person.deathISODate = None
    person.marriageISODate = None
    person.sex = None


def extended_personas(
        nodes, styles, graph, asserts=None,
        event_types=None, schemes=None,
        query_groups=True):
    """
    Compute the events for the various persons in `nodes` (all all persons in
    the database if None)
    Return a dict indexed on id containing extended instances of Persona,
    with additional fields for the birth, the death,...

       :param nodes:
           A set of graph.Persona_node, or None to get all persons from the
           database.
       :param graph: an instance of Graph, which is used to compute whether
          two ids represent the same person.
       :param event_types: restricts the types of events that are retrieved
       :param list asserts: All assertions
       :return: list of persons:
          * persons is a dictionary of Persona instances, indexed on persona_id

       SCHEMES is the list of ids of Surety_Scheme that are used. You
          should pass a set() if you are interested in this. Otherwise, it is
          just discarded.
    """
    if nodes:
        ids = [a.main_id for a in nodes]
    else:
        ids = None

    roles = dict()  # role_id  -> name

    assert schemes is None or isinstance(schemes, set)

    # Get the role names

    for role in models.Event_Type_Role.objects.all():
        roles[role.id] = role.name

    ##############
    # Create the personas that will be returned.
    ##############

    persons = dict()  # id -> person
    if ids:
        for qs in sqlin(models.Persona.objects, id__in=ids):
            for p in qs.all():
                # p.id is always the main_id, since that's how ids was built
                persons[p.id] = p
                __add_default_person_attributes(p)
    else:
        for p in models.Persona.objects.all():
            mid = graph.node_from_id(p.id).main_id
            if mid not in persons:
                persons[mid] = p
                __add_default_person_attributes(p)

    ################
    # Check all events that the persons were involved in.
    ################

    related = ['event', 'event__type', *models.P2E.related_json_fields()]
    if styles and styles.need_place_parts:
        related = ['event__place']

    events = models.P2E.objects.select_related(*related)
    if event_types:
        events = events.filter(event__type__in=event_types)

    all_ids = None
    if nodes:
        all_ids = set()
        for p in nodes:
            all_ids.update(p.ids)

    # Also query the 'principal' for each events, so that we can provide
    # that information graphically.

    for qs in sqlin(events, person__in=all_ids):
        for p2e in qs.all():
            e = p2e.event
            p_node = graph.node_from_id(p2e.person_id)
            person = persons[p_node.main_id]

            if asserts is not None:
                asserts.append(p2e)

            if schemes is not None:
                schemes.add(p2e.surety.scheme_id)

            if not p2e.disproved \
               and p2e.role_id == models.Event_Type_Role.PK_principal:
                if not e.date_sort:
                    pass
                elif e.type_id == models.Event_Type.PK_birth:
                    if person.birthISODate is None or \
                            e.date_sort < person.birthISODate:
                        person.birthISODate = e.date_sort
                elif e.type_id == models.Event_Type.PK_death:
                    if person.deathISODate is None or \
                            e.date_sort > person.deathISODate:
                        person.deathISODate = e.date_sort
                elif e.type_id == models.Event_Type.PK_marriage:
                    person.marriageISODate = e.date_sort

    #########
    # Get all groups to which the personas belong
    #########

#    if query_groups:
#        groups = models.P2G.objects.select_related(
#            *models.P2G.related_json_fields())
#
#        for gr in sql_in(groups, "person", all_ids):
#            p_node = graph.node_from_id(gr.person_id)
#            person = persons[p_node.main_id]
#
#            if asserts is not None:
#                asserts.append(gr)
#
#            if schemes is not None:
#                schemes.add(gr.surety.scheme_id)

    #########
    # Get all characteristics of these personas
    #########

    for p2c_set in sqlin(
          models.P2C.objects.select_related(*models.P2C.related_json_fields()),
          person__in=all_ids):

        p2cs = sql_prefetch_related_object(
            p2c_set.all(), 'characteristic__parts')

        if asserts is not None:
            asserts.extend(p2cs)

        for p2c in p2cs:
            person = persons[graph.node_from_id(p2c.person_id).main_id]
            for p in p2c.characteristic.parts.all():
                if p.type_id == models.Characteristic_Part_Type.PK_sex:
                    person.sex = p.name

    return persons


class PersonaView(JSONView):
    """Display all details known about persona ID"""

    def get_json(self, params, id):
        global_graph.update_if_needed()

        asserts = []
        p = extended_personas(
            nodes=set([global_graph.node_from_id(id)]),
            asserts=asserts,
            styles=None, graph=global_graph, schemes=None)

        node = global_graph.node_from_id(id)

        asserts.extend(models.P2P.objects.filter(
            Q(person1__in=node.ids.union(node.different)) |
            Q(person2__in=node.ids.union(node.different))
        ).select_related(
                *models.P2P.related_json_fields()
            )
        )

        decujus = p[node.main_id]

        r = JSONResult(asserts=asserts)
        return r.to_json({
            "person": decujus,
            "asserts": asserts,
        })


class GlobalSettings(JSONView):
    """
    Return the user settings. These include the following fields:
    * defaultPerson
      id of the person to show when the user connects initially.
      It returns -1 if the database is currently empty.
    """

    def get_json(self, params):
        p = models.Persona.objects.aggregate(Min('id'))
        return {
            "defaultPerson": p['id__min'] if p else -1
        }


class SuretySchemesList(JSONView):
    """
    Return the list of all defined surety schemes
    """

    def get_json(self, params):
        return {
            'schemes': [
                {'id': s.id,
                 'name': s.name,
                 'description': s.description,
                 'parts': [
                     {'id': p.id,
                      'name': p.name,
                      'description': p.description,
                      'sequence': p.sequence_number}
                     for p in s.parts.all()
                 ]} for s in models.Surety_Scheme.objects.all()]}


class PersonaList(JSONView):
    """View the list of all personas"""

    @transaction.atomic
    def get_json(self, params, decujus=1):
        theme_id = params.get('theme', -1)

        global_graph.update_if_needed()
        asserts = []
        if global_graph.is_empty():
            persons = []
        else:
            styles = Styles(theme_id, graph=global_graph, decujus=decujus)
            persons = extended_personas(
                nodes=None, styles=styles, asserts=asserts,
                event_types=(models.Event_Type.PK_birth,
                             models.Event_Type.PK_death,
                             models.Event_Type.PK_marriage),
                graph=global_graph)

            all_styles, computed_styles = styles.compute(
                persons, asserts=asserts)

        return {
            'persons': list(persons.values()),
            'allstyles': all_styles,    # all needed styles
            'styles': computed_styles,  # for each person
        }

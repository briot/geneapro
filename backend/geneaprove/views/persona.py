"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db.models import Min, Q
from django.db import transaction
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.to_json import JSONView
from geneaprove.views.related import JSONResult
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.graph import global_graph
from geneaprove.views.styles import Styles
from geneaprove.views.queries import sql_in
import logging

logger = logging.getLogger('geneaprove.PERSONA')


def event_types_for_pedigree():
    """
    List of events that impact the display of the pedigree
    """

    return (models.Event_Type.PK_birth,
            models.Event_Type.PK_death,
            models.Event_Type.PK_marriage)


def __add_default_person_attributes(person):
    """
    Add the default computed attributes for the person.
    PERSON is an instance of Persona.
    """

    person.birthISODate = None
    person.deathISODate = None
    person.marriageISODate = None

def more_recent(obj1, obj2):
    """
    Compare the date_sort field of two objects
    """
    if obj1.date_sort is None:
        return False
    if obj2.date_sort is None:
        return True
    return obj1.date_sort > obj2.date_sort


def extended_personas(
        nodes, styles, graph, asserts=None, event_types=None, schemes=None,
        as_css=False, query_groups=True):
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
       :param as_css:
          True to get the styles as a CSS string rather than a python dict
       :param event_types: restricts the types of events that are retrieved
       :param list asserts: All assertions
       :return: a list of persons:
          * persons is a dictionary of Persona instances, indexed on persona_id

       SCHEMES is the list of ids of Surety_Scheme that are used. You
          should pass a set() if you are interested in this. Otherwise, it is
          just discarded.

       This sets persons[*].chars to a list of the characteristics.
       Only the events of type in TYPES are returned
    """
    if nodes:
        ids = [a.main_id for a in nodes]
    else:
        ids = None

    compute_parts = styles and styles.need_place_parts()

    roles = dict()  # role_id  -> name

    assert schemes is None or isinstance(schemes, set)

    if styles:
        styles.start()

    # Get the role names

    for role in models.Event_Type_Role.objects.all():
        roles[role.id] = role.name

    ##############
    # Create the personas that will be returned.
    ##############

    persons = dict()  # id -> person
    if ids:
        for p in sql_in(models.Persona.objects, "id", ids):
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

    events = models.P2E.objects.select_related(
        'event', 'event__type', *models.P2E.related_json_fields())
    if event_types:
        events = events.filter(event__type__in=event_types)

    all_ids = None
    if nodes:
        all_ids = set()
        for p in nodes:
            all_ids.update(p.ids)

    birth = None
    death = None

    # Also query the 'principal' for each events, so that we can provide
    # that information graphically.

    for p in sql_in(events, "person", all_ids):
        e = p.event

        p_node = graph.node_from_id(p.person_id)
        person = persons[p_node.main_id]

        # ??? A person could be involved multiple times in the same
        # event, under multiple roles. Here we are only preserving the
        # last occurrence
        if asserts is not None:
            asserts.append(p)

        # ??? Could we take advantage of the e.date_sort string, instead
        # of reparsing the DateRange ?
        e.Date = e.date and DateRange(e.date)

        if schemes is not None:
            schemes.add(p.surety.scheme_id)

        if styles:
            styles.process(person, p.role_id, e)

        if not p.disproved \
           and p.role_id == models.Event_Type_Role.PK_principal:
            if not e.Date:
                pass
            elif e.type_id == models.Event_Type.PK_birth:
                if birth is None or more_recent(birth, e):
                    person.birthISODate = e.date_sort
            elif e.type_id == models.Event_Type.PK_death:
                if death is None or more_recent(death, e):
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

    if asserts:
        asserts.extend(sql_in(
            models.P2C.objects.select_related(*models.P2C.related_json_fields()),
            "person",
            all_ids))

#    logger.debug('MANU processing p2c')
#    c2p = dict()  # characteristic_id -> person
#    all_p2c = models.P2C.objects.select_related(
#        *models.P2C.related_json_fields())
#
#    for p in sql_in(all_p2c, "person", all_ids):
#        c = p.characteristic
#        p_node = graph.node_from_id(p.person_id)
#        person = persons[p_node.main_id]
#        c2p[c.id] = person
#
#        c.date = c.date and DateRange(c.date)
#
#        if schemes is not None:
#            schemes.add(p.surety.scheme_id)
#
#        if asserts is not None:
#            asserts.append(p)

#    logger.debug('MANU processing characteristic parts')
#
#    chars = models.Characteristic_Part.objects.select_related(
#        'type', 'characteristic').filter(
#            type__in=(models.Characteristic_Part_Type.PK_sex, )).order_by()
#
#    for part in sql_in(chars, "characteristic", nodes and c2p):
#        person = c2p[part.characteristic_id]
#
#        if part.type_id == models.Characteristic_Part_Type.PK_sex:
#            person.sex = part.name

    ########
    # Compute place parts once, to limit the number of queries
    # These are only used for styles, not for actual display, although we
    # could benefit from them.
    ########

#    logger.debug('MANU processing places')
#
#    if compute_parts:
#        prev_place = None
#        d = None
#
#        for p in sql_in(models.Place_Part.objects
#                        .order_by('place').select_related('type'),
#                        "place", places):
#
#            # ??? We should also check the parent place to gets its own parts
#            if p.place_id != prev_place:
#                prev_place = p.place_id
#                d = dict()
#                setattr(places[prev_place], "parts", d)
#
#            d[p.type.name] = p.name

    ##########
    # Compute the styles
    ##########

    if styles:
        for p in persons.values():
            styles.compute(p, as_css=as_css)

    return persons


class PersonaView(JSONView):
    """Display all details known about persona ID"""

    def get_json(self, params, id):
        global_graph.update_if_needed()

        asserts = []

        p = extended_personas(
            nodes=set([global_graph.node_from_id(id)]),
            asserts=asserts,
            styles=None, as_css=True, graph=global_graph, schemes=None)

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
        global_graph.update_if_needed()
        if global_graph.is_empty():
            all = {}
        else:
            styles = Styles(style_rules(), graph=global_graph, decujus=decujus)

            styles = None   # disabled for now

            all = extended_personas(
                nodes=None, styles=styles,
                event_types=event_types_for_pedigree(),
                graph=global_graph, as_css=True)

        return {
            'persons': list(all.values()),
        }

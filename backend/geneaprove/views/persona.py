"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db.models import Min
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.to_json import JSONView
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.graph import global_graph
from geneaprove.views.styles import Styles
from geneaprove.views.queries import sql_in


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

    person.sex = "?"
    person.birth = None
    person.death = None
    person.marriage = None
    person.generation = None

    n = person.name.split('/', 2)
    person.givn = n[0]
    person.surn = n[1] if len(n) >= 2 else ""


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
        nodes, styles, graph, p2e=None, event_types=None, schemes=None,
        p2c=None, p2g=None,
        all_sources=None, as_css=False, query_groups=True):
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
       :param dict all_sources: either a dictionary, or None. If specified, it
          will be filled with  "sourceId -> models.Source" objects
       :param as_css:
          True to get the styles as a CSS string rather than a python dict
       :param event_types: restricts the types of events that are retrieved
       :param dict p2e: All person-to-event assertions
       :param dict p2c: All persona-to-characteristic assertions
       :param dict p2g: All persona-to-group assertions
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
    places = dict()  # place_id -> place

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
        'event', 'event__place', 'event__type', 'surety')
    if event_types:
        events = events.filter(event__type__in=event_types)

    all_ids = None
    if nodes:
        all_ids = set()
        for p in nodes:
            all_ids.update(p.ids)

    # Also query the 'principal' for each events, so that we can provide
    # that information graphically.
    for p in sql_in(events, "person", all_ids):
        e = p.event

        p_node = graph.node_from_id(p.person_id)
        person = persons[p_node.main_id]

        # ??? A person could be involved multiple times in the same
        # event, under multiple roles. Here we are only preserving the
        # last occurrence
        if p2e is not None:
            # ??? Should we reset p.p1, since this is always the same
            p2e[e.id] = p

        if all_sources is not None:
            all_sources.setdefault(p.source_id, {})

        # ??? Could we take advantage of the e.date_sort string, instead
        # of reparsing the DateRange ?
        e.Date = e.date and DateRange(e.date)

        if schemes is not None:
            schemes.add(p.surety.scheme_id)

        if compute_parts and e.place:
            places[e.place_id] = e.place

        if styles:
            styles.process(person, p.role_id, e)

        if not p.disproved \
           and p.role_id == models.Event_Type_Role.PK_principal:
            if not e.Date:
                pass
            elif e.type_id == models.Event_Type.PK_birth:
                if person.birth is None or more_recent(person.birth, e):
                    person.birth = e
            elif e.type_id == models.Event_Type.PK_death:
                if person.death is None or more_recent(person.death, e):
                    person.death = e
            elif e.type_id == models.Event_Type.PK_marriage:
                person.marriage = e

    #########
    # Get all groups to which the personas belong
    #########

    if query_groups:
        groups = models.P2G.objects.select_related('group')
        for gr in sql_in(groups, "person", all_ids):
            p_node = graph.node_from_id(gr.person_id)
            person = persons[p_node.main_id]

            if p2g is not None:
                p2g[gr.group_id] = gr
            if all_sources is not None:
                all_sources.setdefault(gr.source_id, {})

            if schemes is not None:
                schemes.add(gr.surety.scheme_id)

    #########
    # Get all characteristics of these personas
    #########

    c2p = dict()  # characteristic_id -> person
    all_p2c = models.P2C.objects.select_related(
        'characteristic', 'characteristic__place')

    for p in sql_in(all_p2c, "person", all_ids):
        c = p.characteristic
        p_node = graph.node_from_id(p.person_id)
        person = persons[p_node.main_id]
        c2p[c.id] = person

        if all_sources is not None:
            all_sources.setdefault(p.source_id, {})

        c.date = c.date and DateRange(c.date)

        if schemes is not None:
            schemes.add(p.surety.scheme_id)

        if p2c is not None:
            # ??? Should we reset p.person, since this is always the same
            # ??? but can't set it to None in the model
            p2c[c.id] = p

        if compute_parts and c.place:
            places[c.place_id] = c.place

    chars = models.Characteristic_Part.objects.select_related(
        'type', 'characteristic', 'characteristic__place')

    for part in sql_in(chars, "characteristic", nodes and c2p):
        person = c2p[part.characteristic_id]

        if part.type_id == models.Characteristic_Part_Type.PK_sex:
            person.sex = part.name
        elif part.type_id == models.Characteristic_Part_Type.PK_given_name:
            person.givn = part.name
        elif part.type_id == models.Characteristic_Part_Type.PK_surname:
            person.surn = part.name

    ########
    # Compute place parts once, to limit the number of queries
    # These are only used for styles, not for actual display, although we
    # could benefit from them.
    ########

    if compute_parts:
        prev_place = None
        d = None

        for p in sql_in(models.Place_Part.objects
                        .order_by('place').select_related('type'),
                        "place", places):

            # ??? We should also check the parent place to gets its own parts
            if p.place_id != prev_place:
                prev_place = p.place_id
                d = dict()
                setattr(places[prev_place], "parts", d)

            d[p.type.name] = p.name

    ##########
    # Get the title for all sources that are mentioned
    ##########

    if all_sources is not None:
        for s in sql_in(models.Source.objects, "id", all_sources.keys()):
            all_sources[s.id] = s

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

        all_sources = {}
        p2e = {}
        p2c = {}
        p2g = {}

        p = extended_personas(
            nodes=set([global_graph.node_from_id(id)]),
            p2e=p2e,
            p2c=p2c,
            p2g=p2g,
            all_sources=all_sources,
            styles=None, as_css=True, graph=global_graph, schemes=None)

        node = global_graph.node_from_id(id)
        assertions = list(models.P2P.objects.filter(
            type=models.P2P.sameAs,
            person1__in=node.ids.union(node.different)))

        decujus = p[node.main_id]

        # ??? All those assertions are sending the same p1 field which is
        # the person, and is useless in this context.
        # ??? Persons and events should be sent as a separate field, and
        # referenced by any from assertions. This would make it easier to
        # store in React, and would save on the amount of data we send.

        return {
            "person": decujus,
            "sources": all_sources,
            "p2c": list(p2c.values()),
            "p2e": list(p2e.values()),
            "p2p": assertions,
            "p2g": list(p2g.values())
        }


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

    def get_json(self, params, decujus=1):
        global_graph.update_if_needed()
        if global_graph.is_empty():
            all = {}
        else:
            styles = Styles(style_rules(), graph=global_graph, decujus=decujus)

            all = extended_personas(
                nodes=None, styles=styles,
                event_types=event_types_for_pedigree(),
                all_sources=None, graph=global_graph, as_css=True)

        all = [p for p in all.values()]
        all.sort(key=lambda x: x.surn)

        # Necessary to avoid lots of queries to get extra information
        all = [{'surn': p.surn,
                'givn': p.givn,
                'birth': p.birth,
                'death': p.death,
                'id': p.id,
                'styles': p.styles,
                'marriage': p.marriage}
               for p in all]

        return {
            'persons': all,
        }

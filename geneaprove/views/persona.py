"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db.models import Min
from django.utils.translation import ugettext as _
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.to_json import \
        CharInfo, CharPartInfo, GroupInfo, EventInfo, JSONView
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.graph import graph
from geneaprove.views.styles import Styles
from geneaprove.views.queries import sql_in


event_types_for_pedigree = (
    models.Event_Type.birth,
    models.Event_Type.death,
    models.Event_Type.marriage)


def __add_default_person_attributes(person):
    """Add the default computed attributes for the person.
       PERSON is an instance of Persona"""

    person.sex = "?"
    person.birth = None
    person.death = None
    person.marriage = None
    # All events of the person {evt_id -> EventInfo}
    person.all_events = dict()
    person.all_chars = dict()  # Characteristics of the person (id -> CharInfo)
    # Groups the person belongs to (id -> GroupInfo)
    person.all_groups = dict()

    person.generation = None

    n = person.name.split('/', 2)
    person.givn = n[0]
    person.surn = n[1] if len(n) >= 2 else ""


def extended_personas(
    nodes, styles, graph, event_types=None, schemes=None,
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

    assert(schemes is None or isinstance(schemes, set))

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

    all_events = dict()

    # All query the 'principal' for each events, so that we can provide
    # that information graphically.
    for p in sql_in(events, "person", all_ids):
        e = p.event

        p_node = graph.node_from_id(p.person_id)
        person = persons[p_node.main_id]

        # ??? A person could be involved multiple times in the same
        # event, under multiple roles. Here we are only preserving the
        # last occurrence
        person.all_events[e.id] = EventInfo(
            event=e, role=roles[p.role_id], assertion=p)

        if all_sources is not None:
            all_sources.setdefault(p.source_id, {})

        e.Date = e.date and DateRange(e.date)

        if schemes is not None:
            schemes.add(p.surety.scheme_id)

        if compute_parts and e.place:
            places[e.place_id] = e.place

        if styles:
            styles.process(person, p.role_id, e)

        if not p.disproved \
           and p.role_id == models.Event_Type_Role.principal:
            if not e.Date:
                pass
            elif e.type_id == models.Event_Type.birth:
                if person.birth is None \
                   or person.birth.date_sort > e.date_sort:
                    person.birth = e
            elif e.type_id == models.Event_Type.death:
                if person.death is None \
                   or person.death.date_sort < e.date_sort:
                    person.death = e
            elif e.type_id == models.Event_Type.marriage:
                person.marriage = e

    #########
    # Get all groups to which the personas belong
    #########

    if query_groups:
        groups = models.P2G.objects.select_related('group')
        for gr in sql_in(groups, "person", all_ids):
            p_node = graph.node_from_id(gr.person_id)
            person = persons[p_node.main_id]
            person.all_groups[gr.group_id] = GroupInfo(
                group=gr.group, assertion=gr)
            if all_sources is not None:
                all_sources.setdefault(gr.source_id, {})
            gr.group.role = gr.role

            if schemes is not None:
                schemes.add(gr.surety.scheme_id)

    #########
    # Get all characteristics of these personas
    #########

    p2c = dict()  # characteristic_id -> person
    all_p2c = models.P2C.objects.select_related(
        'characteristic', 'characteristic__place')

    for p in sql_in(all_p2c, "person", all_ids):
        c = p.characteristic
        p_node = graph.node_from_id(p.person_id)
        person = persons[p_node.main_id]
        p2c[c.id] = person

        if all_sources is not None:
            all_sources.setdefault(p.source_id, {})

        c.date = c.date and DateRange(c.date)

        if schemes is not None:
            schemes.add(p.surety.scheme_id)

        person.all_chars[c.id] = CharInfo(
            char=c,
            assertion=p,
            parts=[])

        if compute_parts and c.place:
            places[c.place_id] = c.place

    chars = models.Characteristic_Part.objects.select_related(
        'type', 'characteristic', 'characteristic__place')

    for part in sql_in(chars, "characteristic", nodes and p2c.keys()):
        person = p2c[part.characteristic_id]
        ch = person.all_chars[part.characteristic_id]
        ch.parts.append(CharPartInfo(name=part.type.name, value=part.name))

        if part.type_id == models.Characteristic_Part_Type.sex:
            person.sex = part.name
        elif part.type_id == models.Characteristic_Part_Type.given_name:
            person.given_name = part.name
        elif part.type_id == models.Characteristic_Part_Type.surname:
            person.surname = part.name

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
                        "place", places.keys()):

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
        for p in persons.itervalues():
            styles.compute(p, as_css=as_css)

    return persons


class PersonaView(JSONView):
    """Display all details known about persona ID"""

    def get_json(self, params, id):
        graph.update_if_needed()

        all_sources = {}
        p = extended_personas(
            nodes=set([graph.node_from_id(id)]),
            all_sources=all_sources,
            styles=None, as_css=True, graph=graph, schemes=None)

        query = models.P2P.objects.filter(
            type=models.P2P.sameAs)

        node = graph.node_from_id(id)
        assertions = list(models.P2P.objects.filter(
            type=models.P2P.sameAs,
            person1__in=node.ids.union(node.different)))

        decujus = p[node.main_id]

        decujus.all_chars = decujus.all_chars.values()
        decujus.all_events = decujus.all_events.values()
        decujus.all_groups = decujus.all_groups.values()

        return {
            "person": decujus,
            "sources": all_sources,
            "p2p": assertions,
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
        return [{'id': s.id,
                    'name': s.name,
                    'description': s.description,
                    'parts': [
                        {'id': p.id,
                         'name': p.name,
                         'description': p.description,
                         'sequence': p.sequence_number} for p in s.parts.all()]
                } for s in models.Surety_Scheme.objects.all()]


class PersonaList(JSONView):
    """View the list of all personas"""
    def get_json(self, params):
        graph.update_if_needed()
        styles = Styles(style_rules, graph=graph, decujus=1)  # ??? Why "1"
        all = extended_personas(
            nodes=None, styles=styles,
            event_types=event_types_for_pedigree,
            all_sources=None, graph=graph, as_css=True)

        all = [p for p in all.itervalues()]
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

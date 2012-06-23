"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from geneapro import models
from geneapro.utils.date import DateRange
from geneapro.views.custom_highlight import style_rules
from geneapro.views.styles import Styles
from geneapro.views.rules import getLegend
from geneapro.views.tree import Tree, SameAs
from geneapro.views.queries import sql_in
import collections


event_types_for_pedigree = (
    models.Event_Type.birth,
    models.Event_Type.death,
    models.Event_Type.marriage)

EventInfo = collections.namedtuple(
    'EventInfo', 'event, role, assertion')
    # "event" has fields like "sources", "place", "Date"
    #   where "Date" is a geneapro.utils.DateRange object and should not be
    #   used for display
CharInfo = collections.namedtuple(
    'CharInfo', 'char, parts, assertion')
    # "char" has fields like "place", "sources", "Date"
    # parts = [CharPartInfo]
CharPartInfo = collections.namedtuple(
    'CharPartInfo', 'name, value')
GroupInfo = collections.namedtuple(
    'GroupInfo', 'group, assertion')
    # "group" has fields like "source",...


def __add_default_person_attributes (person):
   """Add the default computed attributes for the person.
      PERSON is an instance of Persona"""

   person.sex = "?"
   person.birth = None
   person.death = None
   person.marriage = None
   person.all_events = dict() # All events of the person {evt_id -> EventInfo}
   person.all_chars = dict()  # Characteristics of the person (id -> CharInfo)
   person.all_groups = dict() # Groups the person belongs to (id -> GroupInfo)

   n = person.name.split('/', 2)
   person.given_name = n[0]
   person.base_given_name = n[0]
   if len(n) >= 2:
      person.surname = n[1]
   else:
      person.surname = ""

   person.base_surname = person.surname


def __get_events(ids, styles, same, types=None, schemes=None,
                 query_groups=True):
    """Compute the events for the various persons in IDS (all all persons in
       the database if None)
       SAME must be an instance of SameAs, that could have already been
       partially populated.
       Returns a list of persons:
          * persons is a dictionary of Persona instances, indexed on persona_id

       SCHEMES is the list of ids of Surety_Scheme that are used. You
          should pass a set() if you are interested in this. Otherwise, it is
          just discarded.

       This sets persons[*].chars to a list of the characteristics.
       IDS is the list of IDS for the persons. If it is None, we query info for
       all personas in the database.
       Only the events of type in TYPES are returned
    """

    compute_parts = styles and styles.need_place_parts()

    same.compute(ids)

    roles = dict()  # role_id  -> name
    places = dict() # place_id -> place

    assert(schemes is None or isinstance(schemes, set))

    # Get the role names

    for role in models.Event_Type_Role.objects.all():
        roles[role.id] = role.name

    ##############
    # Create the personas that will be returned. Doing this after resolving
    # the links above means that we are potentially storing fewer instances
    # of personas, thus reducing memory usage
    ##############

    persons = dict() # id -> person
    for p in sql_in(models.Persona.objects, "id", ids):
        mid = same.main(p.id)
        if mid not in persons:
            persons[mid] = p
            __add_default_person_attributes(p)

    ################
    # Check all events that the persons were involved in.
    ################

    events = models.P2E.objects.select_related(
        'event', 'event__place', 'event__type', 'surety')
    if types:
        events = events.filter(event__type__in=types)

    main_ids = ids and same.main_ids(ids)  # None if ids is None

    for p in sql_in(events, "person", main_ids):
        e = p.event
        person = persons[same.main(p.person_id)]
        person.all_events[e.id] = EventInfo(
            event=e, role=roles[p.role_id], assertion=p)

        e.sources = getattr(e, "sources", set())
        e.sources.add(p.source_id)
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
        for gr in sql_in(groups, "person", main_ids):
            person = persons[same.main(gr.person_id)]
            person.all_groups[gr.group_id] = GroupInfo(
                group=gr.group, assertion=gr)
            if gr.source_id:
                src = getattr(gr.group, "sources", [])
                src.append(gr.source_id)
                gr.group.sources = src
            gr.group.role = gr.role

            if schemes is not None:
                schemes.add(gr.surety.scheme_id)

    #########
    # Get all characteristics of these personas
    #########

    p2c = dict()  # characteristic_id -> person
    all_p2c = models.P2C.objects.select_related(
        'characteristic', 'characteristic__place')

    for p in sql_in(all_p2c, "person", main_ids):
        c = p.characteristic
        person = persons[same.main(p.person_id)]
        p2c[c.id] = person

        c.sources = getattr(c, "sources", set())
        c.sources.add(p.source_id)
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

    for part in sql_in(chars, "characteristic", ids and p2c.keys()):
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

    return persons


def extended_personas(ids, styles, event_types=None, as_css=False, same=None,
                      schemes=None, query_groups=True):
    """Return a dict indexed on id containing extended instances of Persona,
       with additional fields for the birth, the death,...
       IDS can be None to get all persons from the database.
       AS_CSS should be True to get the styles as a CSS string rather than a
       python dict.
       If specified, SAME must be an instance of SameAs.

       See __get_events for a definition of SCHEMES
    """
    if styles:
        styles.start ()

    same = same or SameAs()
    persons = __get_events(
        ids=ids, styles=styles, same=same, types=event_types, schemes=schemes,
        query_groups=query_groups)

    if styles:
        for p in persons.itervalues():
            styles.compute(p, as_css=as_css)

    return persons


def view(request, id):
   """Display all details known about persona ID"""

   id = int(id)
   same = SameAs()
   tree = Tree(same=same)
   schemes = set() # The surety schemes that are needed
   styles = None
   p = extended_personas(ids=[id], styles=styles, as_css=True, same=same,
                         schemes=schemes)

   surety_schemes = dict()
   for s in schemes:
       surety_schemes[s] = models.Surety_Scheme.objects.get(id=s).parts.all()

   return render_to_response(
       'geneapro/persona.html',
       {"decujus":p[id],
        "decujusid":same.main(id),
        "chars": p[id].all_chars,
        "events": p[id].all_events,
        "groups": p[id].all_groups,
        "schemes": surety_schemes,
        "p2p": same.main_and_reason(id),
       },
       context_instance=RequestContext(request))


def view_list(request):
    """View the list of all personas"""

    tree = Tree()
    styles = Styles(style_rules, tree, decujus=1) # ??? Why "1"
    all = extended_personas(
        ids=None, styles=styles, event_types=event_types_for_pedigree,
        as_css=True)

    all = [p for p in all.itervalues()]
    all.sort(key=lambda x: x.surname)

    return render_to_response(
        'geneapro/persona_list.html',
        {"persons":all,
         "name":[p.name.encode("utf-8") for p in all],
         "legend":getLegend()},
        context_instance=RequestContext(request))


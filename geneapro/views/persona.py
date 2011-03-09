"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date, DateRange
from mysites.geneapro.views.custom_highlight import style_rules
from mysites.geneapro.views.styles import Styles
from mysites.geneapro.views.rules import getLegend
from mysites.geneapro.views.tree import Tree
from mysites.geneapro.views.queries import sql_in
import collections


event_types_for_pedigree = (
    models.Event_Type.birth,
    models.Event_Type.death,
    models.Event_Type.marriage)


def __add_default_person_attributes (person):
   """Add the default computed attributes for the person.
      PERSON is an instance of Persona"""

   person.sex = "?"
   person.birth = None
   person.death = None
   person.marriage = None
   person.all_events = dict() # All events of the person (id -> Event)
                              # where Event has fields like "source", "Date"
                              # "place"
   person.all_chars = dict()  # All characteristics of the person (id -> data)
   person.all_groups = dict() # All groups the person belongs to (id -> Group)
                              # Where Group has fields like "source", "Date"

   n = person.name.split('/', 2)
   person.given_name = n[0]
   person.base_given_name = n[0]
   if len(n) >= 2:
      person.surname = n[1]
   else:
      person.surname = ""

   person.base_surname = person.surname

def __get_characteristics(persons, ids):
   """Compute characteristics for all the PERSONS.
      PERSONS is a dictionary associating an id to an instance of PERSONA.
      This sets persons[*].chars to a list of the characteristics.
      IDS is the list of IDS for the persons. If it is None, we query info for
      all personas in the database.
   """

   p2c = dict()  # characteristic_id -> person
   sources = collections.defaultdict(set) # event_id -> [source_id...]

   all_p2c = models.P2C.objects.select_related(
       'characteristic', 'characteristic__place')
   if ids is not None:
       all_p2c = all_p2c.filter(person__in=ids)

   for p in all_p2c:
       c = p.characteristic
       person = persons[p.person_id]
       p2c[c.id] = person
       sources[c.id].add(p.source_id)
       person.all_chars[c.id] = {
           "place":c.place,
           "Date":c.date and DateRange(c.date),
           "sources":sources[c.id],
           "parts":[]}

   chars = models.Characteristic_Part.objects.select_related(
       'type', 'characteristic', 'characteristic__place')

   for part in sql_in(chars, "characteristic", ids and p2c.keys()):
       person = p2c[part.characteristic_id]
       ch = person.all_chars[part.characteristic_id]
       ch["parts"].append((part.type.name, part.name))

       if part.type_id == models.Characteristic_Part_Type.sex:
          person.sex = part.name
       elif part.type_id == models.Characteristic_Part_Type.given_name:
          person.given_name = part.name
       elif part.type_id == models.Characteristic_Part_Type.surname:
          person.surname = part.name


def __get_groups(persons, ids):
    """Get all groups to which the persons belong"""

    groups = models.P2G.objects.select_related('group')
    for gr in sql_in(groups, "person", ids):
        persons[gr.person_id].all_groups[gr.group_id] = gr.group
        if gr.source_id:
            src = getattr(gr.group, "sources", [])
            src.append(gr.source_id)
            gr.group.sources = src
        gr.group.role = gr.role


def __get_events(persons, ids, styles, types=None):
    """Compute the events for the various persons in IDS (all all persons in
       the database if None)
       Only the events of type in TYPES are returned
    """

    compute_parts = styles and styles.need_place_parts()

    sources = collections.defaultdict(set) # event_id -> [source_id...]
    roles = dict()  # role_id  -> name
    places = dict() # place_id -> place

    # Get the role names

    for role in models.Event_Type_Role.objects.all():
        roles[role.id] = role.name

    # Check all events that the persons where involved in.

    events = models.P2E.objects.select_related(
        'event', 'event__place', 'event__type')
    if types:
        events = events.filter(event__type__in=types)

    for p in sql_in(events, "person", ids):
        e = p.event
        person = persons[p.person_id]
        person.all_events[e.id] = (e, roles[p.role_id])
        sources[e.id].add(p.source_id)
        e.sources = sources[e.id]
        e.Date = e.date and DateRange(e.date)

        if compute_parts and e.place:
            places[e.place_id] = e.place

        if styles:
            styles.process(person, p.role_id, e)

        if p.role_id == models.Event_Type_Role.principal:
            if e.type_id == models.Event_Type.birth:
                person.birth = e
            elif e.type_id == models.Event_Type.death:
                person.death = e
            elif e.type_id == models.Event_Type.marriage:
                person.marriage = e

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


def extended_personas(ids, styles, event_types=None, as_css=False):
    """Return a dict indexed on id containing extended instances of Persona,
       with additional fields for the birth, the death,...
       IDS can be None to get all persons from the database.
       AS_CSS should be True to get the styles as a CSS string rather than a
       python dict.
    """
    persons = dict() # id -> person

    for p in sql_in(models.Persona.objects, "id", ids):
        persons[p.id] = p
        __add_default_person_attributes(p)

    if styles:
        styles.start ()

    __get_events(persons=persons, ids=ids, styles=styles, types=event_types)
    __get_groups(persons=persons, ids=ids)
    __get_characteristics(persons=persons, ids=ids)

    if styles:
        for p in persons.itervalues():
            styles.compute (p, as_css=as_css)

    return persons


def view(request, id):
   """Display all details known about persona ID"""

   id = int(id)

   tree = Tree()
   # styles = Styles(style_rules, tree, decujus=id)
   styles = None
   p = extended_personas(ids=[id], styles=styles, as_css=True)

   return render_to_response(
       'geneapro/persona.html',
       {"p":p[id],
        "chars": p[id].all_chars,
        "events": p[id].all_events,
        "groups": p[id].all_groups,
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


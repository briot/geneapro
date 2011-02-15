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
   sources = dict() # event_id -> [source_id...]

   all_p2c = models.P2C_Assertion.objects.all()
   if ids is not None:
       all_p2c = all_p2c.filter(person__in=ids)

   for p, s, char in all_p2c.values_list(
       'person', 'source_id', 'characteristic'):

       p2c[char] = persons[p]

       if s:
           if sources.get(char, None) is None:
               sources[char] = [s]
           else:
               sources[char].append(s)

   chars = models.Characteristic_Part.objects.select_related()

   # Query all chars if ids==None, otherwise a subset
   for c in sql_in(chars, "characteristic", ids and p2c.keys()):
       p = p2c[c.characteristic_id]
       chars = p.all_chars
       ch = chars.get(c.characteristic_id, None)
       if not ch:
           ch = chars[c.characteristic_id] = {
               "place":c.characteristic.place,
               "Date":c.characteristic.date and Date(c.characteristic.date),
               "sources":sources.get(c.characteristic_id, []),
               "parts":[]}

       ch["parts"].append ((c.type.name, c.name))

       # Some special cases, for the sake of the pedigree view and the styles

       if c.type_id == models.Characteristic_Part_Type.sex:
          p.sex = c.name
       elif c.type_id == models.Characteristic_Part_Type.given_name:
          p.given_name = c.name
       elif c.type_id == models.Characteristic_Part_Type.surname:
          p.surname = c.name


def __get_events(persons, ids, styles, types=None):
   """Compute the events for the various persons in IDS (all all persons in the
      database if None)
      Only the events of type in TYPES are returned
   """

   compute_parts = styles.need_place_parts()

   p2e = dict()     # event_id -> (person, role_id)
   sources = dict() # event_id -> [source_id...]
   roles = dict()   # role_id  -> name

   for role in models.Event_Type_Role.objects.all():
       roles[role.id] = role.name

   for p in sql_in(models.P2E_Assertion.objects, "person", ids):
      if p.event_id in p2e:
         p2e[p.event_id].add((persons[p.person_id], p.role_id))
         if p.source_id is not None:
            sources[p.event_id].append(p.source_id)
      else:
         p2e[p.event_id] = set([(persons[p.person_id], p.role_id)])
         if p.source_id is None:
            sources[p.event_id] = []
         else:
            sources[p.event_id] = [p.source_id]

   places = dict()

   events = models.Event.objects.select_related('place', 'type')
   if types:
       events = events.filter(type__in=types)

   # Query all events if ids==None, otherwise a subset
   # Store all events in a list, since we'll need to refer to them
   # afterward anyway
   all_events = list(sql_in(events, "id", ids and p2e.keys()))

   for e in all_events:
       if compute_parts and e.place:
          if e.place_id not in places:
             places[e.place_id] = e.place
          else:
             e.place = places[e.place_id]

       e.sources = sources[e.id]
       e.Date = e.date and DateRange(e.date)

       for p, role in p2e[e.id]:
           p.all_events[e.id] = (e, roles[role])

           if e.type_id == models.Event_Type.birth \
                 and role == models.Event_Type_Role.principal:
              p.birth = e

           elif e.type_id == models.Event_Type.death \
                 and role == models.Event_Type_Role.principal:
              p.death = e

           elif e.type_id == models.Event_Type.marriage \
                 and role == models.Event_Type_Role.principal:
              p.marriage = e

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

   # Process styles after we have computed birth (since we need age)

   for e in all_events:
      source = sources [e.id]
      for p, role in p2e [e.id]:
         styles.process (p, role, e, source)


def extended_personas(ids, styles, event_types=None, as_css=False):
   """Return a dict indexed on id containing extended instances of Persona,
      with additional fields for the birth, the death,...
      IDS can be None to get all persons from the database.
      AS_CSS should be True to get the styles as a CSS string rather than a python
      dict.
   """
   persons = dict() # id -> person

   for p in sql_in(models.Persona.objects, "id", ids):
      persons[p.id] = p
      __add_default_person_attributes(p)

   styles.start ()

   __get_characteristics(persons=persons, ids=ids)
   __get_events(persons=persons, ids=ids, styles=styles, types=event_types)

   for p in persons.itervalues():
      styles.compute (p, as_css=as_css)

   return persons


def view(request, id):
   """Display all details known about persona ID"""

   id = int(id)

   tree = Tree()
   styles = Styles(style_rules, tree, decujus=id)
   p = extended_personas(ids=[id], styles=styles, as_css=True)

   return render_to_response(
       'geneapro/persona.html',
       {"p":p[id],
        "chars": p[id].all_chars,
        "events": p[id].all_events,
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
         "legend":getLegend()},
        context_instance=RequestContext(request))


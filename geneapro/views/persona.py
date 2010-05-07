"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date
from mysites.geneapro.views.styles import *

def __add_default_person_attributes (person):
   """Add the default computed attributes for the person.
      PERSON is an instance of Persona"""

   person.sex = "?"
   person.birth = None
   person.death = None
   person.marriage = None

   n = person.name.split ('/',3)
   person.given_name = n[0]
   if len (n) >= 2:
      person.surname = n[1]
   else:
      person.surname = ""

def __get_characteristics (persons, ids):
   """Compute characteristics for all persons in IDS.
      PERSONS is a dictionary associating an id to an instance of PERSONA
   """

   p2c = dict ()  # characteristic_id -> person
   chars = set ()

   for p in models.P2C_Assertion.objects.filter (person__in = ids) \
      .values_list ('person', 'characteristic'):

      p2c [p[1]] = persons [p[0]]  
      chars.add (p[1])

   chars = models.Characteristic_Part.objects.filter (
      type__in = (models.Characteristic_Part_Type.sex,
                  models.Characteristic_Part_Type.given_name,
                  models.Characteristic_Part_Type.surname),
      characteristic__in = chars)

   for c in chars:
      if c.type_id == models.Characteristic_Part_Type.sex:
         p2c [c.id].sex = c.name
      elif c.type_id == models.Characteristic_Part_Type.given_name:
         p2c [c.id].given_name = c.name
      elif c.type_id == models.Characteristic_Part_Type.surname:
         p2c [c.id].surname = c.name

def __get_events (persons, ids, styles):
   """Compute the events for the various persons in IDS"""

   compute_parts = styles.need_place_parts()

   p2e = dict () # event_id -> person
   events = set ()
   sources = dict ()

   for p in models.P2E_Assertion.objects.filter (person__in = ids) \
            .select_related ('assertion'):
      if p.event_id in p2e:
         p2e [p.event_id].add ((persons [p.person_id], p.role_id))
         if p.source_id is not None:
            sources [p.event_id].append (p.source_id)
      else:
         p2e [p.event_id] = set ([(persons [p.person_id], p.role_id)])
         if p.source_id is None:
            sources [p.event_id] = []
         else:
            sources [p.event_id] = [p.source_id]

      events.add (p.event_id)

   events = models.Event.objects.filter (
      id__in = events,
      type__in = (models.Event_Type.birth,
                  models.Event_Type.death,
                  models.Event_Type.marriage)).select_related ('place')

   places = dict ()

   for e in events:
      if compute_parts and e.place:
         if e.place_id not in places:
            places [e.place_id] = e.place
         else:
            e.place = places [e.place_id]

      e.sources = sources [e.id]
      if e.date:
         e.Date = Date (e.date)
      else:
         e.Date = None
      for p, role in p2e [e.id]:
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
      parts = models.Place_Part.objects.filter (
         place__in = places.keys ()).select_related ('type')
      for p in parts:
         setattr (places [p.place_id], p.type.gedcom, p.name)

   # Process styles after we have computed birth (since we need age)
   for e in events:
      source = sources [e.id]
      for p, role in p2e [e.id]:
         styles.process (p, role, e, source)

def extended_personas (ids, styles):
   """Return a dict indexed on id containing extended instances of Persona,
      with additional fields for the birth, the death,...
   """
   persons = dict () # id -> person
   for p in models.Persona.objects.filter (id__in = ids):
      persons [p.id] = p
      __add_default_person_attributes (p)

   styles.start ()

   __get_characteristics (persons=persons, ids=ids)
   __get_events (persons=persons, ids=ids, styles=styles)

   for p in persons.itervalues():
      styles.compute (p)

   return persons

def view (request, id):
   """Display all details known about persona ID"""

   p = PersonsData (ids = int (id))

   return render_to_response (
       'geneapro/persona.html',
       context_instance=RequestContext(request))

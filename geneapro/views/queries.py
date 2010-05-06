"""
Some queries to the database that are common to a number of views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date
from mysites.geneapro.views.styles import *

class PersonsData:
   def __init__ (self, ids, event_filter=None, char_filter=dict()):
      """Get information about all the persons whose id is in IDS.
         This information include all related events and characteristics in
         which the persona took part.
   
         event_filter can be used to reduce the list of events that are
         returned. It should always be the result of calling
            Event.objects....
         For instance, you can get only birth events if you specify
            event_filter = Event.objects.filter (type=1)
   
         char_filter is used to filter the list of characteristic. It is a dict
         of parameters to pass to filter. For instance, to only get sex info:
            char_filter = {"type":models.Characteristic_Part_Type.sex}
   
         The return type includes persons, events and chars, but no query has
         been performed yet, only when you actually use these fields.
      """

      if not isinstance (ids, list):
         ids = [ids]

      self.persons = models.Persona.objects.filter (pk__in=ids)
      self.events = models.get_related_persons (
         queryset=event_filter, person_ids=ids).values ()

      self.chars = dict ()

      for id in ids:
         ## ??? Could we do a single query that returns the char along
         ## with the person id

         char_filter ["characteristic__in"] = \
            models.P2C_Assertion.objects.filter (person=id) \
            .values_list('characteristic').query
         self.chars [id] = apply (
            models.Characteristic_Part.objects.filter, (), char_filter) \
            .values ('name','type_id')

def get_extended_personas (ids, styles):
   """Return a list of instances of Persona with additional attributes.
      These attributes are computed from the list of events and characteristics
      known for the person.
      styles must be an instance of Styles.
   """

   result = dict ()

   persons = PersonsData (
      ids=ids,
      char_filter={"type__in":
          (models.Characteristic_Part_Type.sex,
           models.Characteristic_Part_Type.given_name,
           models.Characteristic_Part_Type.surname)},
      event_filter=models.Event.objects.filter
          (type__in=(models.Event_Type.birth,
                     models.Event_Type.death,
                     models.Event_Type.marriage)))

   for p in persons.persons:
      p.father_id = None
      p.mother_id = None
      p.birth_place = None
      p.birth = None
      p.birth_sources = None
      p.death_place = None
      p.death = None
      p.death_sources = None
      p.marriage = None
      p.marriage_sources = None
      n = p.name.split ('/',3)
      p.given_name = n[0]
      if len (n) >= 2:
         p.surname = n[1]
      else:
         p.surname = ""
      p.sex = "?"

      for t in persons.chars[p.id]:
         if t["type_id"] == models.Characteristic_Part_Type.sex:
            p.sex = t["name"]
         elif t["type_id"] == models.Characteristic_Part_Type.given_name:
            p.given_name = t["name"]
         elif t["type_id"] == models.Characteristic_Part_Type.surname:
            p.surname = t["name"]

      p.children = []
      result [p.id] = p

   # Note: an event will occur several times (once per source), so we
   # avoid duplicates here to save time
   # ??? This could be done directly in the SQL query

   last_id = None

   for e in persons.events:
      who = e ["person"]

      # ??? This relies on the order_by from get_extended_persona
      new_id = (e["id"], e["related"], who, e["role"])
      if new_id == last_id:
         continue
      last_id=new_id

      if who == e["related"]:  # ??? Should be done directly in the SQL query
         continue
      if e["type_id"] == models.Event_Type.birth \
        and e["role"] == models.Event_Type_Role.principal:

         result [who].birth = Date (e["date"])
         result [who].birth_place = e["place"]
         result [who].birth_sources = e["sources"]

         if e["related_role"] == models.Event_Type_Role.birth__father:
            result [who].father_id = e["related"]
         elif e["related_role"] == models.Event_Type_Role.birth__mother:
            result [who].mother_id = e["related"]

      elif e["type_id"] == models.Event_Type.death \
        and e["role"] == models.Event_Type_Role.principal:
         result [who].death = Date (e["date"])
         result [who].death_place = e["place"]
         result [who].death_sources = e["sources"]

      elif e["type_id"] == models.Event_Type.birth \
        and e["related_role"] == models.Event_Type_Role.principal \
        and e["role"] in (models.Event_Type_Role.birth__father,
                          models.Event_Type_Role.birth__mother):
         result [who].children.append (e["related"])

      elif e["type_id"] == models.Event_Type.marriage \
        and e["role"] in (models.Event_Type_Role.marriage__husband,
                          models.Event_Type_Role.marriage__wife):
         # If this is the marriage with the other person in the list
         if e["related"] in ids:
            result [who].marriage = str (Date (e["date"]))
            result [who].marriage_sources = e["sources"]

   if styles:
      # Process the styles only after we have computed the birth and death
      styles.start ()
      last_id = None
      for e in persons.events:
         new_id = (e["id"], e["related"], who, e["role"])
         if new_id == last_id:
            continue
         last_id=new_id

         if e["person"] != e["related"] \
            or e["role"] == models.Event_Type_Role.principal:
            styles.process (result [e ["person"]], e)

      for p in persons.persons:
         p.styles = styles.compute (p)

   return result.values()

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from django.db import connection
from django.db.models import Q
from mysites.geneapro.models import *
import sys, traceback

class ModelEncoder (simplejson.JSONEncoder):
   def default(self, obj):
      if isinstance (obj, GeneaproModel):
         return obj.to_json()
      return super (ModelEncoder, self).default (obj)

def to_json (obj):
   """Converts a type to json data, properly converting database instances"""
   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))

def get_extended_personas (ids):
   """Return a list of personas with additional attributes"""

   result = dict ()
   if not isinstance (ids, list):
      ids=[ids]
   persons = Persona.objects.filter (pk__in=ids)

   for p in persons:
      p.father_id = None
      p.mother_id = None
      p.birth = None
      p.death = None

      tmp = Characteristic_Part.objects.filter (
         type=Characteristic_Part_Type.sex,
         characteristic__in=
             P2C_Assertion.objects.filter (person=p)
               .values_list('characteristic').query)
      if tmp:
         p.sex = tmp[0].name
      else:
         p.sex = "?"

      p.children = []
      result [p.id] = p

   events = get_related_persons (
     Event.objects.filter (type__in=(Event_Type.birth,
                                     Event_Type.death,
                                     Event_Type.marriage)),
     person_ids = ids).values ()

   for e in events:
      id = e ["person"]
      if e["type_id"] == Event_Type.birth \
        and e["role"] == Event_Type_Role.principal:

         result [id].birth = e["date"]

         if e["related_role"] == Event_Type_Role.birth__father:
            result [id].father_id = e["related"]
         elif e["related_role"] == Event_Type_Role.birth__mother:
            result [id].mother_id = e["related"]

      elif e["type_id"] == Event_Type.death \
        and e["role"] == Event_Type_Role.principal:
         result [id].death = e["date"]

      elif e["type_id"] == Event_Type.birth \
        and e["related_role"] == Event_Type_Role.principal \
        and e["role"] in (Event_Type_Role.birth__father,
                          Event_Type_Role.birth__mother):
         result [id].children.append (e["related"])

   return result.values()

def get_parents (dic, person_id, max_level, sosa=1):
   """Complete the ancestors data for person (who has SOSA number sosa).
      The keys in dic are set to the sosa number for each ancestor.
      This searches up to max_level generations"""

   if max_level == 0:
      return

   person = get_extended_personas (person_id)[0]
   dic[sosa] = person

   if max_level > 1 and person.father_id:
      get_parents (dic, person.father_id, max_level-1, sosa=sosa*2)
   if max_level > 1 and person.mother_id:
      get_parents (dic, person.mother_id, max_level-1, sosa=sosa*2+1)

   return person

def data (request):
  # We currently use 49 queries to display a pedigree with 17 persons,
  # including the two children of the main person

  try:
    generations = int (request.GET.get ("generations", 4))
    id          = int (request.GET ["id"])
    tree = dict ()

    try:
       person = get_parents (tree, id, generations)
       children = get_extended_personas (person.children)
    except Persona.DoesNotExist:
       pass

    #children.sort (cmp=lambda x,y: cmp (x.birth,y.birth))

    data = to_json ({'generations':generations, 'sosa':tree,
                     'children':children})

  except:
    traceback.print_exc()
    data = []

  for q in connection.queries:
     print q["sql"]
  print "total=" + str (len (connection.queries))

  return HttpResponse (data, mimetype="application/javascript")

def view (request):
    return render_to_response (
        'geneapro/pedigree.html',
        {},
        context_instance=RequestContext(request))


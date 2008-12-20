from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from django.db import connection
from mysites.geneapro.models import *
import sys

class ModelEncoder (simplejson.JSONEncoder):
   def default(self, obj):
      if isinstance(obj, GeneaproModel):
         return obj.to_json()
      return super (ModelEncoder, self).default (ob)

def to_json (obj):
   """Converts a type to json data, properly converting database instances"""
   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))

def get_parents (dic, person, max_level, sosa=1):
   """Complete the ancestors data for person (who has SOSA number sosa).
      The keys in dic are set to the sosa number for each ancestor.
      This searches up to max_level generations"""
   dic[sosa] = person

   if max_level != 1 and person.father_id:
      get_parents (dic, \
         Persona.parents.get (pk=person.father_id),
         max_level - 1, sosa=sosa * 2)

   if max_level != 1 and person.mother_id:
      get_parents (dic, \
         Persona.parents.get (pk=person.mother_id),
         max_level - 1, sosa=sosa * 2 + 1)

def data (request):
    generations = int (request.GET.get ("generations", 4))
    id          = int (request.GET ["id"])
    tree = dict ()
    try:
       get_parents (tree, Persona.parents.get (pk=id), generations)
    except Persona.DoesNotExist:
       pass
    data = to_json ({'generations':generations, 'sosa':tree})
    for q in connection.queries:
       print q["sql"]
    print "total=" + str (len (connection.queries))
    return HttpResponse (data, mimetype="application/javascript")

def view (request):
    return render_to_response (
        'geneapro/pedigree.html',
        {},
        context_instance=RequestContext(request))


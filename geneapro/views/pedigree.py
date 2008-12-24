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
  try:
    generations = int (request.GET.get ("generations", 4))
    id          = int (request.GET ["id"])

    # Get ancestors

    tree = dict ()
    try:
       p = Persona.parents.get (pk=id)
       get_parents (tree, p, generations)
    except Persona.DoesNotExist:
       pass

    # Get id of children (2 queries)
    #    6 => "father of" for a birth
    #    7 => "mother of" for a birth
    # explain analyze: 4.27 .. 11.99   (0.057ms)
    # explain analyze: 8.55 .. 19.35   (0.069ms)
    
    #child_assert = p.p2e_subject1.filter (role__in=(6,7)) \
    #    .values_list ("subject2", flat=True) 
    #child_ids = P2E_Assertion.objects.filter (
    #    # "5" = "principal"
    #    subject2__in=child_assert, role=5) \
    #    .exclude (subject1=p)

    # This can be done in only 1 query with

    # explain analyze => "12.00 .. 20.31"
    # select e2.subject1_id
    # from p2e e1, p2e e2
    # where e1.subject2_id=e2.subject2_id
    #     --  and e1.assertion_ptr_id != e2.assertion_ptr_id   # not needed?
    # and e1.subject1_id=  <p.id>   # "p" is main subject   
    # and e1.role_id in (6,7)       # Where "p" is father or mother
    # and e2.role_id=5;             # Who was the principal of this birth ?

    # which can be approximated with
    # explain analyze => 4.27 .. 20.30" (0.110ms)
    # select e2.subject1_id
    # from p2e e2
    # where e2.role_id=5
    # and e2.subject2_id in
    # (select e1.subject2_id from p2e e1 where e1.role_id in (6,7)
    #    and e1.subject1_id=1);

    # The latter is written in python as:

    #child_ids = P2E_Assertion.objects.filter (
    #    role=5,  # "principal" of the birth, ie who was born
    #    subject2__in= \
    #       p.p2e_subject1.filter (role__in=(6,7)).values('subject2').query)
    #
    #children = Persona.parents.filter (
    #    id__in=child_ids.values_list ("subject1",flat=True))
    
    # Can the two above be reduced to a single query ?

    children = Persona.parents.filter (
       id__in= P2E_Assertion.objects.filter (
          role=5,  # "principal" of the birth, ie who was born
          subject2__in= \
            p.p2e_subject1.filter (role__in=(6,7)).values('subject2').query) \
        .values ('subject1').query)



    # Query to get the events
#select geneapro_assertion.value, geneapro_assertion.subject1_id,
#geneapro_assertion.subject2_id, geneapro_event.name, geneapro_event.type_id,
#geneapro_event.date, geneapro_characteristic_part.type_id,
#geneapro_characteristic_part.name, geneapro_persona.name from
#((geneapro_assertion LEFT JOIN geneapro_event
#  ON geneapro_assertion.subject2_id = geneapro_event.entity_ptr_id)
#LEFT JOIN geneapro_characteristic_part
#ON geneapro_assertion.subject2_id =
#   geneapro_characteristic_part.characteristic_id)
#LEFT JOIN geneapro_persona
#ON geneapro_assertion.subject2_id = geneapro_persona.entity_ptr_id
#where subject1_id=1 and not disproved;

    data = to_json ({'generations':generations, 'sosa':tree,
                     'children':list (children)})

  except:
    traceback.print_exc()
    data = []

  #print str (sys.exc_info ()[1])
  #print dir (sys.exc_info()[2])
  for q in connection.queries:
     print q["sql"]
  print "total=" + str (len (connection.queries))

  return HttpResponse (data, mimetype="application/javascript")

def view (request):
    return render_to_response (
        'geneapro/pedigree.html',
        {},
        context_instance=RequestContext(request))


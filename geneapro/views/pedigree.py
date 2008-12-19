from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from mysites.geneapro.models import *
import sys

###############################################################
## Implementation 1
###############################################################
# 1252 queries
#def get_single_parent (assertion_value, assertions):
#    try:
#       parent = assertions.filter (value=assertion_value).get()
#       parent = Persona.objects.get (id=parent.subject1.id)
#       if parent:
#          return get_parents (parent)
#    except:
#       return None
#
#def get_parents (person):
#    ass = Assertion.objects.filter (subject2=person)
#    father = get_single_parent ("father of", ass)
#    mother = get_single_parent ("mother of", ass)
#    if father or mother:
#       return [person, father, mother]
#    else:
#       return person

###############################################################
## Implementation 1
###############################################################
# 3524 queries
#
#mother_of = None
#father_of = None
#
#def get_parents (person):
#    f = father_of.get (person.id)
#    if f:
#       father = Persona.objects.get (pk=f)
#       if father:
#          return get_parents (father)
#    else:
#       father = None
#
#    m = mother_of.get (person.id)
#    if m:
#       mother = Persona.objects.get (pk=m)
#       if mother:
#          return get_parents (mother)
#    else:
#       mother = None
#
#    if father or mother:
#       return [person, father, mother]
#    else:
#       return person
#
#def view (request):
#    global father_of, mother_of
#     #That does too many queries to create objects we will not use afterward
#     #in most cases (Entity for subject1 and subject2)
#    father_of = dict ()
#    for v in Assertion.objects.filter (value="father of"):
#       father_of [v.subject2] = v.subject1
#    mother_of = dict ()
#    for v in Assertion.objects.filter (value="mother of"):
#       mother_of [v.subject2] = v.subject1

#################################################################
## Implementation 2
#################################################################
## 1002 queries
#
#def get_single_parent (assertion_value, assertions):
#    try:
#       parent = assertions.filter (value=assertion_value).get()
# 
#       # The following does 2 queries: one to get an Entity, and another to
#       # get the Persona
#       parent = Persona.objects.get (id=parent.subject1.id)
#
#       if parent:
#          return get_parents (parent)
#    except Assertion.DoesNotExist:
#       return None
#
#def get_parents (person):
#    # Using person.subject2 instead of 
#    #    ass=Assertion.objects.filter (subject2=person)
#    # seems to go from 1252 queries down to 1002. Seems we also go down from
#    #  8s down to 2s (506 elements in result list in both cases)
#    father = get_single_parent ("father of", person.subject2)
#    mother = get_single_parent ("mother of", person.subject2)
#    if father or mother:
#       return [person, father, mother]
#    else:
#       return person
#
#def view (request):
#    p = Persona.objects.filter (name="Emmanuel Christophe/Briot/")[0]
#    tree = get_parents (p)
#    print tree
#    return render_to_response (
#        'geneapro/pedigree.html',
#        {},
#        context_instance=RequestContext(request))

#################################################################
## Implementation
#################################################################
# 253 queries

# Query would be: complexity: 99..145 with 1348 personas    12ms
#     select geneapro_persona.entity_ptr_id, father.subject1_id, mother.subject1_id from geneapro_persona INNER JOIN geneapro_assertion father ON (father.subject2_id=geneapro_persona.entity_ptr_id and father.value='father of') INNER JOIN geneapro_assertion mother ON (mother.subject2_id=geneapro_persona.entity_ptr_id and mother.value='mother of');

# Other query (much slower: 0 .. 27000 with 1348 persona)   31ms
#    select geneapro_persona.entity_ptr_id, (SELECT subject1_id FROM geneapro_assertion WHERE subject2_id=geneapro_persona.entity_ptr_id AND value='father of' LIMIT 1), (SELECT subject1_id FROM geneapro_assertion WHERE subject2_id=geneapro_persona.entity_ptr_id AND value='mother of' LIMIT 1) FROMgeneapro_persona;

# Each of the small queries with these extra fields, for one person, with 1348
# persons in the database:
#    cost=0..36.57
# Without the extra fields, we have  cost=0..16.55
# So certainly less expensive than doing five different queries (one to get
# the person, one for each parent (gets the Entity) and then one to get the
# Person). We now do three queries (one to get persona and parents, and then
# one to get a Person for the parents)

class ModelEncoder (simplejson.JSONEncoder):
   def default(self, obj):
      if isinstance(obj, GeneaproModel):
         return obj.to_json()
      return super (ModelEncoder, self).default (ob)

def to_json (obj):
   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))

def get_parents (dic, person, max_level, sosa):
    dic[sosa] = person

    if max_level == 1:
       return

    if person.father_id:
       get_parents (dic, \
          Persona.parents.get (pk=person.father_id),
          max_level - 1, sosa=sosa * 2)

    if person.mother_id:
       get_parents (dic, \
          Persona.parents.get (pk=person.mother_id),
          max_level - 1, sosa=sosa * 2 + 1)

def view (request):
    max_level = 4

    p = Persona.parents.filter (name="Emmanuel Christophe/Briot/")[0]
    #p = Persona.parents.filter (name="Joseph Marie Francois/Briot/")[0]
    tree = dict ()
    get_parents (tree, p, max_level, sosa=1)
    return render_to_response (
        'geneapro/pedigree.html',
        {'pedigree': to_json (tree),
         'generations': max_level},
        context_instance=RequestContext(request))


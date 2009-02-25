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

def to_json (obj, year_only):
   """Converts a type to json data, properly converting database instances.
      If year_only is true, then the dates will only include the year"""

   class ModelEncoder (simplejson.JSONEncoder):
      """Encode an object or a list of objects extracted from our model into
         JSON"""

      def default (self, obj):
         """See inherited documentation"""

         if isinstance (obj, models.Persona):
            if obj.birth:
               b = obj.birth.display (year_only=year_only)
            else:
               b = ""
 
            d = ""
            if obj.death:
               d = obj.death.display (year_only=year_only)
               if not year_only:
                  a = obj.death.years_since (obj.birth)
                  if a:
                     d += " (age " + str (a) + ")"
            elif not year_only:
               a = Date.today().years_since (obj.birth)
               if a:
                  d = "(age " + str (a) + ")"

            return {"id":obj.id, "givn":obj.given_name,
                    'surn':obj.surname,
                    'birth':b, 'sex':obj.sex, 'death':d,
                    'birthp':obj.birth_place or "",
                    'deathp':obj.death_place or ""}

         elif isinstance (obj, models.GeneaproModel):
            return obj.to_json()
         return super (ModelEncoder, self).default (obj)

   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))

def get_extended_personas (ids):
   """Return a list of personas with additional attributes"""

   result = dict ()
   persons = models.Persona.objects.filter (pk__in=ids)

   for p in persons:
      p.father_id = None
      p.mother_id = None
      p.birth_place = None
      p.birth = None
      p.death_place = None
      p.death = None
      p.marriage = None
      n = p.name.split ('/',3)
      p.given_name = n[0]
      if len (n) >= 2:
         p.surname = n[1]
      else:
         p.surname = ""
      p.sex = "?"

      tmp = models.Characteristic_Part.objects.filter (
         type__in = (models.Characteristic_Part_Type.sex,
                     models.Characteristic_Part_Type.given_name,
                     models.Characteristic_Part_Type.surname),
         characteristic__in=
             models.P2C_Assertion.objects.filter (person=p)
               .values_list('characteristic').query).values ('name','type_id')
      for t in tmp:
         if t["type_id"] == models.Characteristic_Part_Type.sex:
            p.sex = t["name"]
         elif t["type_id"] == models.Characteristic_Part_Type.given_name:
            p.given_name = t["name"]
         elif t["type_id"] == models.Characteristic_Part_Type.surname:
            p.surname = t["name"]

      p.children = []
      result [p.id] = p

   events = models.get_related_persons (
     models.Event.objects.filter (type__in=(models.Event_Type.birth,
                                            models.Event_Type.death,
                                            models.Event_Type.marriage)),
     person_ids = ids).values ()

   for e in events:
      who = e ["person"]
      if e["type_id"] == models.Event_Type.birth \
        and e["role"] == models.Event_Type_Role.principal:

         result [who].birth = Date (e["date"])
         result [who].birth_place = e["place"]

         if e["related_role"] == models.Event_Type_Role.birth__father:
            result [who].father_id = e["related"]
         elif e["related_role"] == models.Event_Type_Role.birth__mother:
            result [who].mother_id = e["related"]

      elif e["type_id"] == models.Event_Type.death \
        and e["role"] == models.Event_Type_Role.principal:
         result [who].death = Date (e["date"])
         result [who].death_place = e["place"]

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

   return result.values()

def get_parents (tree, marriage, person_ids, max_level, sosa=1):
   """Complete the ancestors data for persons.
      The first person in the list has SOSA number sosa, the others
      are +1, +2,...
      The keys in dic are set to the sosa number for each ancestor.
      This searches up to max_level generations"""

   if not isinstance (person_ids, list):
      person_ids = [person_ids]

   persons = get_extended_personas (person_ids)

   for p in persons:
      s = sosa + person_ids.index (p.id)
      tree [s] = p

      # Marriage data indexed on the husbands' sosa number
      marriage [s - (s % 2)] = p.marriage

      if max_level > 1:
         if p.father_id and p.mother_id:
            get_parents (tree, marriage, [p.father_id, p.mother_id],
                         max_level - 1, sosa=s*2)
         elif p.father_id:
            get_parents (tree, marriage, p.father_id, max_level-1, sosa=s*2)
         elif p.mother_id:
            get_parents (tree, marriage, p.mother_id, max_level-1, sosa=s*2+1)

   return persons

def data (request):
   """Compute, and send back to the user, information about the pedigree of a
      specific person. This includes ancestors and children
   """

   # We currently use 35 queries to display a pedigree with 17 persons,
   # including the two children of the main person

   generations = int (request.GET.get ("generations", 4))
   year_only   = request.GET.get ("yearonly", "false") == "true"
   who         = int (request.GET ["id"])
   tree = dict ()

   ## Marriage data is indexed on the husband's sosa number
   marriage = dict()
   children = None

   def sort_by_birth (pers1, pers2):
      """Compare two persons by birth date"""
      return cmp (pers1.birth, pers2.birth)

   p = get_parents (tree, marriage, who, generations)
   if p:
      p = p[0]
      if p.children:
         children = get_extended_personas (p.children)
         children.sort (cmp=sort_by_birth)

   result = to_json ({'generations':generations, 'sosa':tree,
                   'children':children, 'marriage':marriage},
                  year_only=year_only)
   return HttpResponse (result, mimetype="application/javascript")

def pedigree_view (request):
   """Display the pedigree of a person as a tree"""
   return render_to_response (
      'geneapro/pedigree.html',
      {"type":"pedigree"},
      context_instance=RequestContext(request))

def fanchart_view (request):
   """Display the pedigree of a person as a fanchart"""
   return render_to_response (
       'geneapro/pedigree.html',
       {"type":"fanchart"},
       context_instance=RequestContext(request))

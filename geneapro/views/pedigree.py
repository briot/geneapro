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
from mysites.geneapro.views.tree import *
from mysites.geneapro.views.styles import *
from mysites.geneapro.views.persona import extended_personas
from mysites.geneapro.views.json import to_json

style_rules = [
 (RULE_ATTR, [("ALIVE", RULE_IS, "Y")], {"font-weight":"bold"}),

 # Born or dead in La Baussaine before 1862
 (RULE_EVENT,
    [("type",  RULE_IN,         (models.Event_Type.birth,
                                 models.Event_Type.death)),
     ("place.name", RULE_CONTAINS_INSENSITIVE, "baussaine"),
     ("role",  RULE_IS,         models.Event_Type_Role.principal),
     ("date",  RULE_BEFORE,     "1862")], {"color":"red"}),

 # "Age at death" <= 60 years
 (RULE_EVENT,
   [("type", RULE_IS, models.Event_Type.death),
    ("role", RULE_IS, models.Event_Type_Role.principal),
    ("age",  RULE_SMALLER_EQUAL, 60)],
   {"color":"blue"}),

 # Person's age today is more than 80, and is alive
 (RULE_ATTR,
   [("age",   RULE_GREATER, 80),
    ("ALIVE", RULE_IS,      "Y")], {"color":"orange"}),

 # Foreign people in different color
 (RULE_EVENT,
  [("type", RULE_IS, models.Event_Type.birth),
   ("role", RULE_IS, models.Event_Type_Role.principal),
   ("place.country", RULE_IS_NOT, ""),
   ("place.country", RULE_CONTAINS_NOT_INSENSITIVE, "france")],
  {"fill":"#AAAAAA"}),

 # Person's with more than one marriage
 (RULE_EVENT,
   [("type",  RULE_IS, models.Event_Type.marriage),
    ("role",  RULE_IS, models.Event_Type_Role.principal),
    ("count", RULE_GREATER, 1)],  {"fill":"#AA0000"}),

 # Persons too young at birth of child, or too old at death
 (RULE_EVENT,
  [("type", RULE_IS, models.Event_Type.birth),
   ("role", RULE_IN, (models.Event_Type_Role.birth__father,
                      models.Event_Type_Role.birth__mother)),
   ("age",  RULE_SMALLER, 17)], {"fill":"red"}),
 (RULE_EVENT,
  [("type", RULE_IS, models.Event_Type.death),
   ("role", RULE_IS, models.Event_Type_Role.principal),
   ("age",  RULE_GREATER, 110)], {"fill":"red"}),

 # If the person appears multiple time in the current tree
 (RULE_ATTR, [("IMPLEX", RULE_GREATER, 1)], {"fill":"yellow"}),

 # All ancestors of person id=1. Use different colors depending on the
 # sex. These two rules do not cost any additional query if "14" is in the
 # ancestor tree of the decujus
 (RULE_ATTR,
   [("ancestor", RULE_IS, 1), ("SEX", RULE_IS, "M")],
   {"fill":"#D6E0EA", "stroke":"#9CA3D4"}),
 (RULE_ATTR,
   [("ancestor", RULE_IS, 1), ("SEX", RULE_IS, "F")],
   {"fill":"#E9DAF1", "stroke":"#fF2080"}),
 (RULE_ATTR,
   [("descendant", RULE_IS, 1), ("SEX", RULE_IS, "M")],
   {"fill":"#D6E0EA", "stroke":"#9CA3D4"}),
 (RULE_ATTR,
   [("descendant", RULE_IS, 1), ("SEX", RULE_IS, "F")],
   {"fill":"#E9DAF1", "stroke":"#fF2080"}),


 # Do we know both parents ?
 (RULE_ATTR, [("UNKNOWN_FATHER", RULE_IS, "Y")], {"color":"violet"}),
 (RULE_ATTR, [("UNKNOWN_MOTHER", RULE_IS, "Y")], {"color":"violet"}),

 # "Person's name is DELAMOTTE"
 (RULE_ATTR,
   [("surname", RULE_IS_INSENSITIVE, "delamotte")], {"color":"green"}),
]

# ??? Other rules that would be nice to have:
#   "Is descendant of ..."
#   "Project Explorer contains (or not) the person"
#   "Son's name is"
#   "Has sources", "Has sources with reliability >= "

def get_sosa_tree (id, max_levels, style_ruless):
   tree = Tree ()
   ids  = set (tree.ancestors (id, generations=max_levels).keys())
   styles = Styles (style_rules, tree, decujus=id)
   ids.add (id) # we'll need info on the person

   children = tree.children (id)

   persons = extended_personas (ids.union (children), styles)

   for index,c in enumerate (children):
      children [index] = persons [c]

   sosa = tree.sosa_tree (id, persons, generations=max_levels)
   return {'generations': max_levels,
           'sosa':        sosa[0],
           'children':    children,
           'marriage':    sosa[1],
           'styles':      styles.all_styles()}

def compute_data (generations, year_only, who):
   """Compute, and send back to the user, information about the pedigree of a
      specific person. This includes ancestors and children
   """

   result = get_sosa_tree (who, generations, style_rules)
   result = to_json (result, year_only=year_only)
   return result

def data (request):
   generations = int (request.GET.get ("generations", 5))
   year_only   = request.GET.get ("yearonly", "false") == "true"
   who         = int (request.GET.get ("id", 1))

   return HttpResponse (compute_data (generations, year_only, who),
                        mimetype="application/javascript")

def pedigree_view (request):
   """Display the pedigree of a person as a tree"""
   return render_to_response (
      'geneapro/pedigree.html',
      {"type":"pedigree",
       "pedigree_data":compute_data(6, False, 1)},
      context_instance=RequestContext(request))

def pedigree_canvas_view (request):
   """Display the pedigree of a person as a tree"""
   return render_to_response (
      'geneapro/pedigree2.html',
      {"pedigree_data":compute_data(6, False, 1)},
      context_instance=RequestContext(request))

def fanchart_view (request):
   """Display the pedigree of a person as a fanchart"""
   return render_to_response (
       'geneapro/pedigree.html',
       {"type":"fanchart",
        "pedigree_data":compute_data(6, True, 1)},
       context_instance=RequestContext(request))

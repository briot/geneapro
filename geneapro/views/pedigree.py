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
from mysites.geneapro.views.tree import Tree, SameAs
from mysites.geneapro.views.styles import *
from mysites.geneapro.views.persona import extended_personas, event_types_for_pedigree
from mysites.geneapro.views.json import to_json
from mysites.geneapro.views.custom_highlight import style_rules
from mysites.geneapro.views.rules import getLegend


def get_sosa_tree(id, max_levels, style_ruless):
   same = SameAs()
   same.compute(None) # Compute all "same as" groups. This is more efficient
                      # at least for small databases.

   tree = Tree(same=same)
   ids  = set(tree.ancestors(id, generations=max_levels).keys())
   styles = Styles(style_rules, tree, decujus=id)
   ids.add(id) # we'll need info on the person

   children = tree.children(id)

   persons = extended_personas(
       ids.union(children), styles, event_types=event_types_for_pedigree,
       same=same)

   for index,c in enumerate(children):
      children[index] = persons[c]

   sosa = tree.sosa_tree(id, persons, generations=max_levels)
   return {'generations': max_levels,
           'sosa':        sosa[0],
           'children':    children,
           'marriage':    sosa[1],
           'styles':      styles.all_styles()}


def compute_data(generations, year_only, who):
   """Compute, and send back to the user, information about the pedigree of a
      specific person. This includes ancestors and children
   """

   result = get_sosa_tree(who, generations, style_rules)
   result = to_json(result, year_only=year_only)
   return result


def data(request):
   generations = int(request.GET.get ("generations", 5))
   year_only   = request.GET.get("yearonly", "false") == "true"
   who         = int(request.GET.get("id", 1))

   return HttpResponse(compute_data(generations, year_only, who),
                       mimetype="application/javascript")


def pedigree_view(request):
   """Display the pedigree of a person as a tree"""
   return render_to_response(
      'geneapro/pedigree.html',
      {"pedigree_data":compute_data(6, False, 1),
       "legend": getLegend()},
      context_instance=RequestContext(request))


def fanchart_view(request):
   """Display the pedigree of a person as a fanchart"""
   return render_to_response(
       'geneapro/fanchart.html',
       {"type":"fanchart",
        "legend": getLegend(),
        "pedigree_data":compute_data(6, True, 1)},
       context_instance=RequestContext(request))

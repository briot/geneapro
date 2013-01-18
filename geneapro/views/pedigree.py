"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from geneapro import models
from geneapro.views.tree import Tree, SameAs
from geneapro.views.styles import ColorScheme, Styles
from geneapro.views.persona import extended_personas, event_types_for_pedigree
from geneapro.views.json import to_json
from geneapro.views.custom_highlight import style_rules
from geneapro.views.rules import getLegend
from geneapro.views.graph import graph
import logging

logger = logging.getLogger(__name__)


def get_sosa_tree(graph, id, max_levels, style_rules, last_gen_known=-1):
   """
       :param last_gen_known: is the number of the last generation for which the
           client already has data, and thus do not need to be sent again. -1
           to retrieve all.
   """
   # ??? "same" can be computed from graph

   same = SameAs()
   same.compute(None) # Compute all "same as" groups. This is more efficient
                      # at least for small databases.
   id = same.main(id)

   tree = Tree(same=same)
   # ??? This calls tree.ancestors() again, which is fast but could be avoided
   # with a clever use of the graph.
   styles = Styles(style_rules, tree, decujus=id)

   children = tree.children(id)

   ids  = set(tree.ancestors(
       id, generations=max_levels, generations_ignored=last_gen_known)
       .keys())
   ids.add(id) # we'll need info on the person

   # ??? Should cache extended_persons in the cache
   persons = extended_personas(
       ids.union(children), styles, event_types=event_types_for_pedigree,
       same=same)

   for index,c in enumerate(children):
      children[index] = persons[c]

   # ??? Should use the graph to compute the tree

   sosa = tree.sosa_tree(id, persons, generations=max_levels,
                         generations_ignored=last_gen_known)
   return {'generations': max_levels,
           'sosa':        sosa[0],
           'children':    children,
           'marriage':    sosa[1],
           'styles':      styles.all_styles()}


def compute_data(graph, generations, year_only, who, last_gen_known=-1):
    """Compute, and send back to the user, information about the pedigree of a
       specific person. This includes ancestors and children.

       :param last_gen_known: is the number of the last generation for which the
           client already has data, and thus do not need to be sent again. -1
           to retrieve all.
    """
    result = get_sosa_tree(graph, who, max_levels=generations, style_rules=style_rules,
                           last_gen_known=last_gen_known)
    return to_json(result, year_only=year_only)


def pedigree_view(request, decujus=1):
   """Display the pedigree of a person as a tree"""
   decujus = int(decujus)
   gens = int(request.GET.get("gens", 4))

   # ??? Should lock the graph until the view has been generated
   graph.update_if_needed()

   return render_to_response(
       'geneapro/pedigree.html',
       {"pedigree_data": compute_data(graph, gens, False, decujus),
        "decujus": decujus,
        "decujusid": decujus,
        "legend": getLegend()},
       context_instance=RequestContext(request))


def fanchart_view(request, decujus=1):
   """Display the pedigree of a person as a fanchart"""
   decujus = int(decujus)
   gens = int(request.GET.get("gens", 4))

   # ??? Should lock the graph until the view has been generated
   graph.update_if_needed()

   return render_to_response(
       'geneapro/fanchart.html',
       {"legend": getLegend(),
        "decujus": decujus,
        "decujusid": decujus,
        "pedigree_data":compute_data(graph, gens, True, decujus)},
       context_instance=RequestContext(request))


def pedigree_data(request, decujus):
    """Return the data for the Pedigree or Fanchart views. This is only
       needed when the user changes the settings, since initially this data
       is already part of the view.
    """
    decujus = int(decujus)
    generations = int(request.GET.get("gens", 5))
    generations_known = int(request.GET.get("gens_known", -1))
    graph.update_if_needed()   # ??? Should lock until the view has been generated
    return HttpResponse(
        compute_data(graph, generations, year_only=True, who=decujus,
                     last_gen_known=generations_known),
        content_type="application/json")

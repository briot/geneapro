"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from geneapro import models
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

   styles = Styles(style_rules, graph, decujus=id)

   distance = dict()
   ancestors = graph.people_in_tree(
       id=id, maxdepthAncestors=max_levels - 1, maxdepthDescendants=0,
       distance=distance)
   ancestors = [a.main_id() for a in ancestors
                if distance[a] >= last_gen_known]

   descendants = graph.people_in_tree(
       id=id, maxdepthAncestors=0, maxdepthDescendants=1, distance=distance)
   descendants = [a.main_id() for a in descendants if distance[a] != 0]

   # ??? Should cache extended_persons in the cache
   persons = extended_personas(
       set(ancestors).union(descendants), styles,
       event_types=event_types_for_pedigree, graph=graph)

   def build_sosa_tree(sosa_tree, marriage, sosa, id):
       if id in persons:
           sosa_tree[sosa] = persons[id]
           if persons[id].marriage:
               marriage[sosa] = persons[id].marriage
       fathers = graph.fathers(id)
       if fathers:
           build_sosa_tree(sosa_tree, marriage, sosa * 2, fathers[0].main_id())
       mothers = graph.mothers(id)
       if mothers:
           build_sosa_tree(
               sosa_tree, marriage, sosa * 2 + 1, mothers[0].main_id())

   sosa_tree = dict()
   marriage = dict()
   build_sosa_tree(sosa_tree, marriage, 1, graph.node_from_id(id).main_id())

   return {'generations': max_levels,
           'sosa':        sosa_tree,
           'children':    [persons[c] for c in descendants],
           'marriage':    marriage,
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

"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from geneaprove import models
from geneaprove.views.styles import ColorScheme, Styles
from geneaprove.views.persona import extended_personas, event_types_for_pedigree
from geneaprove.views.json import to_json
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.rules import getLegend
from geneaprove.views.graph import graph
import logging

logger = logging.getLogger(__name__)


def get_sosa_tree(graph, id, max_levels, style_rules,
                  last_descendant_known=-1,
                  maxdepthDescendants=1, last_gen_known=-1):
   """
       :param last_gen_known: is the number of the last generation for which the
           client already has data, and thus do not need to be sent again. -1
           to retrieve all.
       :param maxdepthDescendants:
           The number of generations for which we compute the children.
   """

   decujus = graph.node_from_id(id)

   styles = Styles(style_rules, graph, decujus=decujus.main_id)

   distance = dict()
   ancestors = graph.people_in_tree(
       id=decujus.main_id, maxdepthAncestors=max_levels - 1,
       maxdepthDescendants=0, distance=distance)
   ancestors = [a for a in ancestors if distance[a] >= last_gen_known]

   descendants = graph.people_in_tree(
       id=decujus.main_id, maxdepthAncestors=0,
       distance=distance, maxdepthDescendants=maxdepthDescendants)
   descendants.remove(decujus)
   descendants = [a for a in descendants if distance[a] >= last_descendant_known]

   sosa_tree = dict()
   marriage = dict()
   children = {}
   persons = {}

   all_person_nodes = set(ancestors).union(descendants)
   if all_person_nodes:
       persons = extended_personas(
           all_person_nodes, styles,
           event_types=event_types_for_pedigree, graph=graph)

       def build_sosa_tree(sosa_tree, marriage, sosa, id):
           # A person might not be in 'persons', and yet its parent be there,
           # in case we have filtered out earlier generations.
           if id in persons:
               sosa_tree[sosa] = id
               persons[id].generation = distance[graph.node_from_id(id)]
               if persons[id].marriage:
                   marriage[sosa] = persons[id].marriage
           fathers = graph.fathers(id)
           if fathers:
               build_sosa_tree(sosa_tree, marriage, sosa * 2, fathers[0].main_id)
           mothers = graph.mothers(id)
           if mothers:
               build_sosa_tree(
                   sosa_tree, marriage, sosa * 2 + 1, mothers[0].main_id)

       def build_children_tree(children, id, gen):
           if id in persons:
               children[id] = []
           sorted = [(persons[node.main_id] if node.main_id in persons else None, node)
                     for node in graph.children(id)]
           sorted.sort(key=lambda p: p[0].birth.Date if p[0] and p[0].birth else None)
           for p in sorted:
               if p[0]:
                   p[0].generation = -distance[p[1]]
                   if id in persons:
                       children[id].append(p[0].id)
               if gen < maxdepthDescendants:
                   build_children_tree(children, id=p[0].id, gen=gen + 1)

       build_sosa_tree(sosa_tree, marriage, 1, decujus.main_id)
       build_children_tree(children, id=decujus.main_id, gen=1)

   return {'generations': max_levels,
           'descendants': maxdepthDescendants,
           'persons':     persons,    # All persons indexed by id
           'sosa':        sosa_tree,  # sosa_number -> person_id
           'children':    children,   # personId -> [children_id*]
           'marriage':    marriage,   # sosa_number -> marriage info
           'styles':      styles.all_styles()}


def pedigree_view(request, decujus=1):
   """Display the pedigree of a person as a tree"""
   decujus = int(decujus)
   gens = int(request.GET.get("gens", 4))

   # ??? Should lock the graph until the view has been generated
   graph.update_if_needed()
   if len(graph) == 0:
       return render_to_response(
           'geneaprove/firsttime.html',
            context_instance=RequestContext(request))

   data = get_sosa_tree(
       graph, id=decujus, max_levels=gens, style_rules=style_rules)
   dec = data['persons'][decujus]

   return render_to_response(
       'geneaprove/pedigree.html',
       {"pedigree_data": to_json(data),
        "decujus": decujus,
        "decujus_name": "%s %s" % (dec.given_name, dec.surname),
        "legend": getLegend()},
       context_instance=RequestContext(request))


def fanchart_view(request, decujus=1):
   """Display the pedigree of a person as a fanchart"""
   decujus = int(decujus)
   gens = int(request.GET.get("gens", 4))

   # ??? Should lock the graph until the view has been generated
   graph.update_if_needed()
   if len(graph) == 0:
       return render_to_response(
           'geneaprove/firsttime.html',
            context_instance=RequestContext(request))

   data = get_sosa_tree(
       graph, id=decujus, max_levels=gens, style_rules=style_rules)
   dec = data['persons'][decujus]
   return render_to_response(
       'geneaprove/fanchart.html',
       {"legend": getLegend(),
        "decujus": decujus,
        "decujus_name": "%s %s" % (dec.given_name, dec.surname),
        "pedigree_data":to_json(data)},
       context_instance=RequestContext(request))


def pedigree_data(request, decujus):
    """Return the data for the Pedigree or Fanchart views. This is only
       needed when the user changes the settings, since initially this data
       is already part of the view.
    """
    decujus = int(decujus)
    generations = int(request.GET.get("gens", 5))
    descendant_gens = int(request.GET.get("descendant_gens", 1))
    desc_known = int(request.GET.get("desc_known", -1))
    generations_known = int(request.GET.get("gens_known", -1))
    graph.update_if_needed()   # ??? Should lock until the view has been generated

    data = get_sosa_tree(
        graph, id=decujus, max_levels=generations, style_rules=style_rules,
                           maxdepthDescendants=descendant_gens,
                           last_descendant_known=desc_known,
                           last_gen_known=generations_known)
    return HttpResponse(
        to_json(data),
        content_type="application/json")

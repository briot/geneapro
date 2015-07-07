"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.http import HttpResponse
from geneaprove import models
from geneaprove.views.styles import ColorScheme, Styles
from geneaprove.views.persona import extended_personas, event_types_for_pedigree
from geneaprove.views.to_json import to_json
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.graph import graph


def __get_json_sosa_tree(graph, id, max_levels, style_rules,
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
    descendants = [
        a for a in descendants
        if a != decujus and distance[a] >= last_descendant_known]

    sosa_tree = dict()
    marriage = dict()
    children = {}

    persons = {}
    all_person_nodes = set(ancestors).union(descendants)
    if all_person_nodes:
        persons = extended_personas(
            all_person_nodes, styles,
            event_types=event_types_for_pedigree, graph=graph)

    def add_parents(p):
        p.generation = distance[graph.node_from_id(p.id)]
        if p.generation >= max_levels:
            return

        fathers = graph.fathers(p.id)
        mothers = graph.mothers(p.id)
        p.parents = [
            None if not fathers else persons.get(fathers[0].main_id, None),
            None if not mothers else persons.get(mothers[0].main_id, None)]

        for pa in p.parents:
            if pa:
                add_parents(pa)

    def add_children(p, gen):
        p.children = []
        sorted = [(persons[node.main_id] if node.main_id in persons else None,
                   node)
                  for node in graph.children(p.id)]
        sorted.sort(
            key=lambda c: c[0].birth.Date if c[0] and c[0].birth else None)
        for c in sorted:
            if c[0]:
                c[0].generation = -gen # distance[c[1]]
                p.children.append(c[0])
                if gen < maxdepthDescendants:
                    add_children(c[0], gen + 1)

    main = persons[decujus.main_id]
    add_parents(main)
    add_children(main, gen=1)

    # We will however return a simpler version of the information computed
    # above (which includes all known events for the persons)

    show_age = False
    def person_to_json_for_pedigree(obj):
        if isinstance(obj, models.Persona):
            d = obj.death
            if show_age and obj.birth:
                if d:
                    if d.Date:
                        d.Date += " (age %s)" % (
                            str(d.Date.years_since(obj.birth.Date)), )
                else:
                    d = {Date: " (age %s)" % (
                       str(DateRange.today().years_since(obj.birth.Date)), )}

            return {
                'id':   obj.id,
                'givn': obj.given_name,
                'surn': obj.surname,
                'sex':  obj.sex,
                'generation': obj.generation,
                'parents': obj.parents if hasattr(obj, 'parents') else None,
                'children': obj.children if hasattr(obj, 'children') else None,
                'style': obj.styles,
                'birth': obj.birth,
                'marriage': obj.marriage,
                'death': d}

    return to_json(
        obj= {'generations': max_levels,
              'descendants': maxdepthDescendants,
              'decujus':     main, 
              'styles':      styles.all_styles()},
        custom=person_to_json_for_pedigree) 


def pedigree_data(request, decujus):
    """Return the data for the Pedigree or Fanchart views. This is only
       needed when the user changes the settings, since initially this data
       is already part of the view.
    """
    # ??? Should lock until the view has been generated
    graph.update_if_needed()

    data = __get_json_sosa_tree(
        graph, id=int(decujus),
        style_rules=style_rules,
        max_levels=int(request.GET.get("gens", 5)),
        maxdepthDescendants=int(request.GET.get("descendant_gens", 1)),
        last_descendant_known=int(request.GET.get("desc_known", -1)),
        last_gen_known=int(request.GET.get("gens_known", -1)))
    return HttpResponse(data, content_type="application/json")

"""
Various views related to displaying the pedgree of a person graphically
"""

from geneaprove import models
from django.db import transaction
from geneaprove.utils.date import DateRange
from geneaprove.views.styles import Styles
from geneaprove.views.persona import extended_personas, \
    event_types_for_pedigree
from geneaprove.views.to_json import JSONView, to_json
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.graph import global_graph


class PedigreeData(JSONView):
    """Return the data for the Pedigree or Fanchart views."""

    def __init__(self):
        super(PedigreeData, self).__init__()
        # Whether to show full dates or only the year
        self.year_only = False

    @transaction.atomic
    def get_json(self, params, id):
        # ??? Should lock until the view has been generated
        global_graph.update_if_needed()

        max_levels = int(params.get("gens", 5))
        last_descendant_known = int(params.get("desc_known", -1))

        # The number of generations for which we compute the children.
        maxdepthDescendants = int(params.get("descendant_gens", 1))

        # the number of the last generation for which the client already has
        # data, and thus do not need to be sent again. -1 to retrieve all.
        last_gen_known = int(params.get("gens_known", -1))

        self.year_only = params.get('year_only', '') == 'true'

        decujus = global_graph.node_from_id(id)
        styles = Styles(style_rules(), global_graph, decujus=decujus.main_id)

        distance = dict()
        people = global_graph.people_in_tree(
            id=decujus.main_id,
            maxdepthAncestors=max_levels - 1,
            maxdepthDescendants=maxdepthDescendants,
            distance=distance)
        ancestors = [a for a in people
                     if distance[a] >= 0 and distance[a] >= last_gen_known]
        descendants = [a for a in people
                       if a != decujus and distance[a] < 0 and
                       distance[a] <= -last_descendant_known]

        sosa_tree = dict()
        marriage = dict()
        children = {}

        persons = {}
        all_person_nodes = set(ancestors).union(descendants)
        if all_person_nodes:
            persons = extended_personas(
                all_person_nodes, styles,
                event_types=event_types_for_pedigree(), graph=global_graph)

        def add_parents(p):
            p.generation = distance[global_graph.node_from_id(p.id)]
            if p.generation >= max_levels:
                return

            fathers = global_graph.fathers(p.id)
            mothers = global_graph.mothers(p.id)
            p.parents = [
                None if not fathers else fathers[0].main_id,
                None if not mothers else mothers[0].main_id]

            if fathers and fathers[0].main_id in persons:
                add_parents(persons[fathers[0].main_id])
            if mothers and mothers[0].main_id in persons:
                add_parents(persons[mothers[0].main_id])

        def add_children(p, gen):
            p.children = []
            sorted = [
                (persons[node.main_id] if node.main_id in persons else None,
                 node)
                for node in global_graph.children(p.id)]
            sorted.sort(
                key=lambda c: (False, c[0].birth.Date) \
                    if c[0] and c[0].birth
                    else (True, None))
            for c in sorted:
                if c[0]:
                    c[0].generation = -gen  # distance[c[1]]
                    p.children.append(c[0].id)
                    if gen < maxdepthDescendants:
                        add_children(c[0], gen + 1)

        main = persons[decujus.main_id]
        add_parents(main)
        add_children(main, gen=1)
        main = persons[decujus.main_id]
        return {'generations': max_levels,
                'descendants': maxdepthDescendants,
                'decujus':     decujus.main_id,
                'persons':     persons,
                'styles':      styles.all_styles()}

    def to_json(self, value):
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
                        d = {}
                        d.Date = " (age %s)" % (
                            DateRange.today().years_since(obj.birth.Date),)

                return {
                    'id':   obj.id,
                    'givn': obj.givn,
                    'surn': obj.surn,
                    'sex':  obj.sex,
                    'generation': obj.generation,
                    'parents':
                        obj.parents if hasattr(obj, 'parents') else None,
                    'children':
                        obj.children if hasattr(obj, 'children') else None,
                    'style': obj.styles,
                    'birth': obj.birth,
                    'marriage': obj.marriage,
                    'death': d}

        return to_json(value, custom=person_to_json_for_pedigree,
                       year_only=self.year_only)

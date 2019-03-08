"""
Various views related to displaying the pedgree of a person graphically
"""

from geneaprove import models
from django.db import transaction
from geneaprove.utils.date import DateRange
from geneaprove.views.styles import Styles
from geneaprove.views.persona import extended_personas
from geneaprove.views.to_json import JSONView, to_json
from geneaprove.views.graph import global_graph
import logging

logger = logging.getLogger('geneaprove.pedigree')


class PedigreeData(JSONView):
    """Return the data for the Pedigree or Fanchart views."""

    def __init__(self):
        super().__init__()
        # Whether to show full dates or only the year
        self.year_only = False

    @transaction.atomic
    def get_json(self, params, id):
        logger.debug('get pedigree data')

        # ??? Should lock until the view has been generated
        global_graph.update_if_needed()

        max_levels = int(params.get("gens", 5))
        last_descendant_known = int(params.get("desc_known", -1))
        theme_id = int(params.get("theme", None))

        # The number of generations for which we compute the children.
        maxdepthDescendants = int(params.get("descendant_gens", 1))

        # the number of the last generation for which the client already has
        # data, and thus do not need to be sent again. -1 to retrieve all.
        last_gen_known = int(params.get("gens_known", -1))

        self.year_only = params.get('year_only', '') == 'true'

        decujus = global_graph.node_from_id(id)

        styles = Styles(theme_id, global_graph, decujus=decujus.main_id)

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
        asserts = []

        logger.debug('loading extended personas')
        all_person_nodes = set(ancestors).union(descendants)
        if all_person_nodes:
            persons = extended_personas(
                all_person_nodes, styles, asserts=asserts,
                event_types=(models.Event_Type.PK_birth,
                             models.Event_Type.PK_death,
                             models.Event_Type.PK_marriage),
                graph=global_graph)

        main = persons[decujus.main_id]

        # Add parents. Do not use a recursive function, since we want to
        # handle deep trees
        logger.debug('setting parents relationships')
        queue = [main]
        seen = set()
        while queue:
            p = queue.pop()

            if p.id in seen:
                # Same person seen multiple times
                continue

            seen.add(p.id)

            p.generation = distance[global_graph.node_from_id(p.id)]
            if p.generation >= max_levels:
                continue

            fathers = global_graph.fathers(p.id)
            mothers = global_graph.mothers(p.id)
            p.parents = [
                None if not fathers else fathers[0].main_id,
                None if not mothers else mothers[0].main_id]

            if fathers and fathers[0].main_id in persons:
                queue.append(persons[fathers[0].main_id])
            if mothers and mothers[0].main_id in persons:
                queue.append(persons[mothers[0].main_id])

        # Add children
        logger.debug('setting child relationships')
        queue = [(main, 1)]
        while queue:
            p, gen = queue.pop()

            p.children = []
            sorted = [
                (persons[node.main_id] if node.main_id in persons else None,
                 node)
                for node in global_graph.children(p.id)]
            for c in sorted:
                if c[0]:
                    c[0].generation = -gen  # distance[c[1]]
                    p.children.append(c[0].id)
                    if gen < maxdepthDescendants:
                        queue.append((c[0], gen + 1))

        layout = {}
        for p in persons.values():
            layout[p.id] = {'children': getattr(p, 'children', None),
                            'parents': getattr(p, 'parents', None)}

        logger.debug('computing style')
        all_styles, computed_styles = styles.compute(
            persons, asserts=asserts)

        return {'generations': max_levels,
                'descendants': maxdepthDescendants,
                'decujus':     decujus.main_id,
                'persons':     list(persons.values()),
                'layout':      layout,
                'allstyles':   all_styles,
                'styles':      computed_styles}

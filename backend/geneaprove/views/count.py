"""
Statistics
"""

import datetime
from geneaprove import models
from geneaprove.views.graph import global_graph
from geneaprove.views.to_json import JSONView


class CountView(JSONView):
    """
    Count number of items in the database
    """

    def get_json(self, params):
        # pylint: disable=redefined-builtin
        # pylint: disable=arguments-differ

        global_graph.update_if_needed()

        return {
            "places": models.Place.objects.count(),
            "sources": models.Source.objects.count(),
            "personas": models.Persona.objects.count(),
            "persons": global_graph.nodes_count(),
        }

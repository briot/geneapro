"""
Statistics
"""

import datetime
from django.db.models import Count, F
from geneaprove import models
from .to_json import JSONView


class CountView(JSONView):
    """
    Count number of items in the database
    """

    def get_json(self, params):
        total_persons = models.Persona.objects \
            .filter(id=F('main_id')) \
            .aggregate(count=Count('id'))

        personas_count = models.Persona.objects \
            .aggregate(count=Count('id'))

        return {
            "places": models.Place.objects.count(),
            "sources": models.Source.objects.count(),
            "personas": int(personas_count['count']),
            "persons": int(total_persons['count']),
        }

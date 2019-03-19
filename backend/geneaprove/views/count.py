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

        persons = PersonSet()
        persons.add_ancestors(person_id=...)
        person.add_descendants(person_id=...)

        return {
            "places": models.Place.objects.count(),
            "sources": models.Source.objects.count(),
            "personas": models.Persona.objects.count(),
            "persons": int(total_persons['count']),
        }

"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db.models import F, Count
from .. import models
from ..sql import AssertList, PersonSet
from .to_json import JSONView
from .styles import Styles

class PersonaView(JSONView):
    """Display all details known about persona ID"""

    def get_json(self, params, id):
        persons = PersonSet()
        persons.add_ids(ids=[int(id)])
        persons.fetch_p2e(event_types=None)
        persons.fetch_p2c()
        persons.fetch_p2p()
        return {
            "person": persons.get_unique_person(),
            **persons.asserts.to_json()  # fetch related
        }


class SuretySchemesList(JSONView):
    """
    Return the list of all defined surety schemes
    """

    def get_json(self, params):
        return {
            "schemes": [
                {"id": s.id,
                 "name": s.name,
                 "description": s.description,
                 "parts": [
                     {"id": p.id,
                      "name": p.name,
                      "description": p.description,
                      "sequence": p.sequence_number}
                     for p in s.parts.all()
                 ]} for s in models.Surety_Scheme.objects.all()]}


class PersonCount(JSONView):
    """Number of persons in the database"""

    def get_json(self, params):
        namefilter = params.get('filter')

        r = models.Persona.objects \
            .filter(id=F('main_id')) \

        if namefilter:
            r = r.filter(display_name__icontains=namefilter)

        r = r.aggregate(count=Count('id'))
        return int(r['count'])


class PersonaList(JSONView):
    """View the list of all personas"""

    def get_json(self, params, decujus=1):
        theme_id = int(params.get('theme', -1))
        ids = params.get('ids', None)

        persons = PersonSet(styles=Styles(theme_id, decujus=decujus))
        persons.add_ids(
            ids=[int(d) for d in ids.split(',')] if ids else None,
            compute_sex=theme_id >= 0,
            namefilter=params.get('filter', None),
            offset=params.get('offset', None),
            limit=params.get('limit', None))
        persons.fetch_p2e()
        return persons

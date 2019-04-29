"""
Event-related views
"""

from django.db.models import Count
from django.db.models.functions import Lower
from .. import models
from ..sql import AssertList, PlaceSet
from .to_json import JSONView

class PlaceList(JSONView):
    """View the list of a all known places"""

    def get_json(self, params):
        offset = params.get('offset', None)
        limit = params.get('limit', None)
        namefilter = params.get('filter', None)
        ids = params.get('ids', None)
        pm = models.Place.objects.order_by(Lower('name'))

        if namefilter:
            pm = pm.filter(name__icontains=namefilter)
        if ids:
            pm = pm.filter(id__in=ids.split(','))

        if limit:
            li = int(limit)
            if offset:
                off = int(offset)
                pm = pm[off:off + li]
            else:
                pm = pm[:li]

        return pm.all()


class PlaceCount(JSONView):

    def get_json(self, params):
        namefilter = params.get('filter', None)

        pm = models.Place.objects.all()
        if namefilter:
            pm = pm.filter(name__icontains=namefilter)
        pm = pm.aggregate(count=Count('id'))
        return int(pm['count'])


class PlaceAssertsCount(JSONView):
    def get_json(self, params, id):
        places = PlaceSet()
        places.add_ids([id])
        return places.count_asserts()


class PlaceAsserts(JSONView):
    def get_json(self, params, id):
        places = PlaceSet()
        places.add_ids([id])
        return places.fetch_asserts(
            offset=params.get('offset', None),
            limit=params.get('limit', None)
        )


class PlaceView(JSONView):
    """
    JSON data for a specific place
    """

    def get_json(self, params, id):
        place = models.Place.objects.get(id=id)
        return place

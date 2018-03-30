"""
Event-related views
"""

from geneaprove import models
from geneaprove.views.to_json import JSONView
from geneaprove.views.related import JSONResult

class PlaceList(JSONView):
    """View the list of a all known places"""

    def get_json(self, params):
        return models.Place.objects.all()


class PlaceView(JSONView):
    """
    JSON data for a specific place
    """

    def get_json(self, params, id):
        place = models.Place.objects.get(id=id)
        asserts = place.get_asserts()
        r = JSONResult(asserts=asserts)
        return r.to_json({
           "asserts": asserts,
        })

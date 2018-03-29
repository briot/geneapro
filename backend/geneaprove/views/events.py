"""
Event-related views
"""

from django.http import HttpResponse
from geneaprove import models
from geneaprove.views.queries import sql_in
from geneaprove.views.to_json import JSONView


def extended_events(ids):
    """Return a dict of Event instances, augmented with the following fields:
        - "p2e": a list of instances of P2E for this event
    """

    return events


class EventDetailsView(JSONView):
    def get_json(self, params, id):
        """JSON data for a specific event"""

        asserts = list(models.P2E.objects.select_related().filter(event_id=id))

        return dict({
            'id': id,
            'asserts': asserts,
        }, **models.Assertion.getEntities(asserts))

"""
Event-related views
"""

from geneaprove import models
from ..sql.asserts import AssertList
from geneaprove.views.to_json import JSONView


def extended_events(ids):
    """
    Return a dict of Event instances, augmented with the following fields:
      - "p2e": a list of instances of P2E for this event
    """
    return None


class EventDetailsView(JSONView):
    def get_json(self, params, id):
        """JSON data for a specific event"""

        asserts = AssertList(models.P2E.objects.filter(event_id=id))
        return {
            "id": id,
            **asserts.to_json()
        }

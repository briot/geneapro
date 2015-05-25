"""
Event-related views
"""

from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from geneaprove import models
from geneaprove.views.queries import sql_in
from collections import namedtuple
from geneaprove.views.to_json import to_json


def extended_events(ids):
    """Return a dict of Event instances, augmented with the following fields:
        - "p2e": a list of instances of P2E for this event
    """

    assert(isinstance(ids, list))

    events = dict()  # id -> ExtendedEvent
    p2e = models.P2E.objects.select_related()
    for a in sql_in(p2e, "event", ids):
        assert isinstance(a, models.P2E)

        ev = events.get(a.event_id, {'p2e': []})
        events[a.event_id] = ev

        p2e = {
            'disproved': a.disproved,
            'rationale': a.rationale,
            'role_name': a.role.name,
            'person': {
                'name': a.person.name,
                'id': a.person_id
            },
            'surety': a.surety_id,
            'source': {
                'id': a.source_id
            }
        }
        ev['p2e'].append(p2e)

    return events


def view(request, id):
    """JSON data for a specific event"""
    id = int(id)
    data = extended_events([id]).get(id, None)
    return HttpResponse(
        to_json(data, year_only=False),
        content_type='application/json')

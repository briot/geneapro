"""
Event-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from geneaprove import models
from geneaprove.views.queries import sql_in
from collections import namedtuple


def extended_events(ids):
    """Return a dict of Event instances, augmented with the following fields:
        - "p2e": a list of instances of P2E for this event
    """

    assert(isinstance(ids, list))

    events = dict()  # id -> ExtendedEvent
    p2e = models.P2E.objects.select_related()
    for a in sql_in(p2e, "event", ids):
        events[a.event_id] = ev = events.get(a.event_id, a.event)
        p = ev.p2e = getattr(ev, "p2e", [])
        p.append(a)

    return events


def view(request, id):
    """View a specific event"""

    id = int(id)
    e = extended_events([id])
    return render_to_response (
        'geneaprove/event.html',
        {"e": e.get(id, None),
        },
        context_instance=RequestContext(request))

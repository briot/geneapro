"""
Event-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from geneaprove import models
from geneaprove.views.queries import sql_in


def view_list(request):
    """View the list of a all known places"""

    # ??? How do we get the list of parts immediately too ?
    places = models.Place.objects.order_by('name')
    return render_to_response(
        'geneaprove/places_list.html',
        {"places": places,
        },
        context_instance=RequestContext(request))

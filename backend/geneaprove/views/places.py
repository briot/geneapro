"""
Event-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.http import HttpResponse
from geneaprove import models
from geneaprove.views.queries import sql_in
from geneaprove.views.to_json import to_json


def view_list(request):
    """View the list of a all known places"""

    # ??? How do we get the list of parts immediately too ?
    places = models.Place.objects.order_by('name')
    return HttpResponse(
        to_json(places),
        content_type='application/json')

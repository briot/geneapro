"""
Source-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext


def view(request, id):
    """View a specific source"""

    return render_to_response (
      'geneapro/sources.html',
      {},
      context_instance=RequestContext(request))

    return None


def list(request):
    """View the list of all sources"""
    return None

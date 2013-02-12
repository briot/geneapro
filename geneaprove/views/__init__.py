"""
Provides a number of simple views for geneaprove
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from geneaprove import models

def index (request):
   """The root page of geneaprove"""
   places = models.Place.objects.all()
   return render_to_response (
     'geneaprove/index.html',
     {'placesCount': len (places),
      'places'     : places,
      'hello'      : _("Hello")},
     context_instance=RequestContext(request))

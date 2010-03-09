"""
Various views related to displaying the pedgree of a person graphically
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from mysites.geneapro import models
from mysites.geneapro.views.queries import *

def view (request, id):
   """Display all details known about persona ID"""

   p = PersonsData (ids = int (id))

   return render_to_response (
       'geneapro/persona.html',
       context_instance=RequestContext(request))

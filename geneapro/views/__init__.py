from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from mysites.geneapro.models import *

def index (request):
	"""The root page of GeneaPro"""

	places = Place.objects.all ()
	return render_to_response (
		'geneapro/index.html',
		{'placesCount': len (places),
		 'places'     : places,
		 'hello'      : _("Hello"),
		},
		context_instance=RequestContext(request))

def sources (request):
	return render_to_response (
		'geneapro/sources.html',
		{},
		context_instance=RequestContext(request))

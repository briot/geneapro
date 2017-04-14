"""
The URLs supported by geneaprove
"""
import os
from django.conf.urls import url
from django.shortcuts import render_to_response
from django.template.context_processors import csrf
import django.views
from geneaprove.views.pedigree import PedigreeData
import geneaprove.views.persona
from geneaprove.views.persona import \
    PersonaList, PersonaView, SuretySchemesList, GlobalSettings
import geneaprove.views.places
import geneaprove.views.representation
import geneaprove.views.rules
from geneaprove.views.stats import StatsView
from geneaprove.views.sources import \
    SourceView, SourceCitation, EditSourceCitation, \
    CitationModels, CitationModel, SourcesList, \
    SourceRepresentations, AddSourceRepr, DelSourceRepr
from geneaprove.views.graph import QuiltsView
import geneaprove.views.events
import geneaprove.views.merge
import geneaprove.views.graph
from geneaprove.views.importers import GedcomImport


def index(request):
    """
    Send the index.html file back to the user
    """
    c = {}
    c.update(csrf(request))
    return render_to_response('index.html', c)


def static(request):
    """
    Send static resources (CSS, javascript,...)
    """

    # Special case to handle the templateUrl attributes when we have
    # not used webpack to package them up
    p = os.path.join(os.getcwd(), 'resources/ts', request.path[1:])
    if os.path.isfile(p):
        return django.views.static.serve(request, p, document_root='/')
    else:
        return index(request)


urlpatterns = [
    url(r'^$', index, name='index'),
    url(r'^data/pedigree/(?P<id>\d+)$', PedigreeData.as_view()),
    url(r'^data/persona/list$', PersonaList.as_view()),
    url(r'^data/persona/(?P<id>\d+)$', PersonaView.as_view()),
    url(r'^data/places$', geneaprove.views.places.view_list),
    url(r'^data/sources/list$', SourcesList.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)$', SourceView.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)/saveparts$',
        EditSourceCitation.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)/parts$', SourceCitation.as_view()),
    url(r'^data/sources/(\d+)/addRepr', AddSourceRepr.as_view()),
    url(r'^data/sources/(\d+)/allRepr', SourceRepresentations.as_view()),
    url(r'^data/sources/(\d+)/delRepr/(\d+)', DelSourceRepr.as_view()),
    url(r'^data/suretySchemes$', SuretySchemesList.as_view()),
    url(r'^data/event/(\d+)$', geneaprove.views.events.view),
    url(r'^data/legend$', geneaprove.views.rules.getLegend),
    url(r'^data/stats/(?P<id>\d+)$', StatsView.as_view()),
    url(r'^data/import$', GedcomImport.as_view()),
    url(r'^data/citationModel/(?P<model_id>.+)$', CitationModel.as_view()),
    url(r'^data/citationModels$', CitationModels.as_view()),
    url(r'^data/settings', GlobalSettings.as_view()),
    url(r'^data/repr/(?P<id>\d+)(?:/(?P<size>\d+))?$',
        geneaprove.views.representation.view),
    url(r'^data/quilts/(?P<id>\d+)$', QuiltsView.as_view()),

    # Fallback to support the path location strategy in URLs
    url(r'^.*', static, name='index'),

    # ... below: not moved to angularJS yet

    url(r'^merge$', geneaprove.views.merge.view),
]
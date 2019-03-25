"""
The URLs supported by geneaprove
"""
import os
import logging
from django.conf.urls import url
import django.contrib
from django.shortcuts import render_to_response
from django.template.context_processors import csrf
import django.views
from .views import events
from .views import importers
from .views import metadata
from .views import pedigree
from .views import persona
from .views import places
from .views import quilts
from .views import representation
from .views import sources
from .views import stats
from .views import themelist
import sys


def index(request):
    """
    Send the index.html file back to the user
    """
    c = {}
    c.update(csrf(request))
    return render_to_response('index.html', c)


def send_csrf(request):
    logging.getLogger('geneaprove').info("Sending csrf")
    c = {}
    c.update(csrf(request))
    return render_to_response('csrf.html', c)


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
    url(r'^data/pedigree/(?P<id>\d+)$', pedigree.PedigreeData.as_view()),
    url(r'^data/persona/list$', persona.PersonaList.as_view()),
    url(r'^data/persona/count$', persona.PersonCount.as_view()),
    url(r'^data/persona/(?P<id>\d+)$', persona.PersonaView.as_view()),
    url(r'^data/place/(?P<id>\d+)$', places.PlaceView.as_view()),
    url(r'^data/places/list$', places.PlaceList.as_view()),
    url(r'^data/places/count$', places.PlaceCount.as_view()),
    url(r'^data/sources/list$', sources.SourcesList.as_view()),
    url(r'^data/sources/count$', sources.SourcesCount.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)$', sources.SourceView.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)/saveparts$',
        sources.EditSourceCitation.as_view()),
    url(r'^data/sources/(\d+)/addRepr', sources.AddSourceRepr.as_view()),
    url(r'^data/sources/(\d+)/allRepr', sources.SourceRepresentations.as_view()),
    url(r'^data/sources/(\d+)/delRepr/(\d+)', sources.DelSourceRepr.as_view()),
    url(r'^data/suretySchemes$', persona.SuretySchemesList.as_view()),
    url(r'^data/event/(\d+)$', events.EventDetailsView.as_view()),
    url(r'^data/stats/(?P<id>\d+)$', stats.StatsView.as_view()),
    url(r'^data/metadata$', metadata.MetadataList.as_view()),
    url(r'^data/theme/(?P<theme_id>\d+)/rules', themelist.ThemeRules.as_view()),
    url(r'^data/theme/(?P<theme_id>-?\d+)/delete', themelist.ThemeDelete.as_view()),
    url(r'^data/theme/(?P<theme_id>-?\d+)/save', themelist.ThemeSave.as_view()),
    url(r'^data/import$', importers.GedcomImport.as_view()),
    url(r'^data/citationModel/(?P<model_id>.+)$',
        sources.CitationModel.as_view()),
    url(r'^data/citationModels$', sources.CitationModels.as_view()),
    url(r'^data/repr/(?P<id>\d+)(?:/(?P<size>\d+))?$',
        representation.view),
    url(r'^data/quilts/(?P<id>\d+)$', quilts.QuiltsView.as_view()),

    # Getting the CSRF token
    url(r'^data/csrf', send_csrf),

    # Fallback to support the path location strategy in URLs
    # url(r'^.*', static, name='index'),

    # url(r'^merge$', geneaprove.views.merge.view),
]

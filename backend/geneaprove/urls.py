"""
The URLs supported by geneaprove
"""
import os
import logging
from django.urls import path, re_path, register_converter
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


class NegativeOrPositive:
    regex = '-?\d+'
    def to_python(self, value):
        return int(value)
    def to_url(self, value):
        return str(value)
register_converter(NegativeOrPositive, 'negpos')


urlpatterns = [
    re_path(r'^$', index, name='index'),

    path('data/persona/list', persona.PersonaList.as_view()),
    path('data/persona/count', persona.PersonCount.as_view()),
    path('data/persona/<int:id>', persona.PersonaView.as_view()),

    path('data/places/list', places.PlaceList.as_view()),
    path('data/places/count', places.PlaceCount.as_view()),
    path('data/places/<int:id>', places.PlaceView.as_view()),
    path('data/places/<int:id>/asserts', places.PlaceAsserts.as_view()),
    path('data/places/<int:id>/asserts/count',
        places.PlaceAssertsCount.as_view()),

    path('data/sources/list', sources.SourcesList.as_view()),
    path('data/sources/count', sources.SourcesCount.as_view()),
    path('data/sources/<negpos:id>', sources.SourceView.as_view()),
    path('data/sources/<negpos:id>/asserts', sources.SourceAsserts.as_view()),
    path('data/sources/<negpos:id>/asserts/count',
        sources.SourceAssertsCount.as_view()),
    path('data/sources/<negpos:id>/saveparts',
        sources.EditSourceCitation.as_view()),
    path('data/sources/<int:id>addRepr', sources.AddSourceRepr.as_view()),
    path('data/sources/<int:id>/allRepr',
        sources.SourceRepresentations.as_view()),
    path('data/sources/<int:id>/delRepr/<int:repr_id>',
        sources.DelSourceRepr.as_view()),

    path('data/theme/<negpos:theme_id>/rules',
        themelist.ThemeRules.as_view()),
    path('data/theme/<negpos:theme_id>/delete',
        themelist.ThemeDelete.as_view()),
    path('data/theme/<negpos:theme_id>/save', themelist.ThemeSave.as_view()),

    path('data/pedigree/<int:id>', pedigree.PedigreeData.as_view()),
    path('data/suretySchemes', persona.SuretySchemesList.as_view()),
    path('data/event/<int:id>', events.EventDetailsView.as_view()),
    path('data/stats/<int:id>', stats.StatsView.as_view()),
    path('data/metadata', metadata.MetadataList.as_view()),
    path('data/import', importers.GedcomImport.as_view()),
    path('data/citationModel/<int:model_id>', sources.CitationModel.as_view()),
    path('data/citationModels', sources.CitationModels.as_view()),
    re_path(r'^data/repr/(?P<id>\d+)(?:/(?P<size>\d+))?$',
        representation.view),
    path('data/quilts/<int:id>', quilts.QuiltsView.as_view()),

    # Getting the CSRF token
    path('data/csrf', send_csrf),

    # Fallback to support the path location strategy in URLs
    # url(r'^.*', static, name='index'),

    # url(r'^merge$', geneaprove.views.merge.view),
]

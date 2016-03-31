from django.conf import settings
from django.conf.urls import *
from django.shortcuts import render_to_response
from django.core.context_processors import csrf
from geneaprove.views.pedigree import PedigreeData
import geneaprove.views.persona
from geneaprove.views.persona import \
        PersonaList, PersonaView, SuretySchemesList, GlobalSettings
import geneaprove.views.places
import geneaprove.views.representation
import geneaprove.views.rules
import geneaprove.views.stats
from geneaprove.views.sources import \
        SourceView, SourceCitation, EditSourceCitation, \
        CitationModels, CitationModel, SourcesList, \
        SourceRepresentations, AddSourceRepr, DelSourceRepr
import geneaprove.views.events
import geneaprove.views.merge
import geneaprove.views.graph
import geneaprove.views.importers

def index(request):
    c = {}
    c.update(csrf(request))
    return render_to_response('index.html', c)

urlpatterns = patterns(
    '',
    url(r'^$', index, name='index'),
    (r'^data/pedigree/(?P<id>\d+)$',        PedigreeData.as_view()),
    (r'^data/persona/list$',                PersonaList.as_view()),
    (r'^data/persona/(?P<id>\d+)$',         PersonaView.as_view()),
    (r'^data/places$',         geneaprove.views.places.view_list),
    (r'^data/sources/list$',                SourcesList.as_view()),
    (r'^data/sources/(?P<id>-?\d+)$',       SourceView.as_view()),
    (r'^data/sources/(?P<id>-?\d+)/saveparts$',   EditSourceCitation.as_view()),
    (r'^data/sources/(?P<id>-?\d+)/parts$', SourceCitation.as_view()),
    (r'^data/sources/(\d+)/addRepr',        AddSourceRepr.as_view()),
    (r'^data/sources/(\d+)/allRepr',        SourceRepresentations.as_view()),
    (r'^data/sources/(\d+)/delRepr/(\d+)',  DelSourceRepr.as_view()),
    (r'^data/suretySchemes$',               SuretySchemesList.as_view()),
    (r'^data/event/(\d+)$',    geneaprove.views.events.view),
    (r'^data/legend$',         geneaprove.views.rules.getLegend),
    (r'^data/stats$',          geneaprove.views.stats.view),
    (r'^import$',              geneaprove.views.importers.import_gedcom),
    (r'^data/citationModel/(?P<model_id>.+)$', CitationModel.as_view()),
    (r'^data/citationModels$',           CitationModels.as_view()),
    (r'^data/settings',                  GlobalSettings.as_view()),
    (r'^repr/(?P<id>\d+)(?:/(?P<size>\d+))?$',
                               geneaprove.views.representation.view),

    # ... below: not moved to angularJS yet

    (r'^quilts/(\d+)?$', geneaprove.views.graph.quilts_view),
    (r'^merge$',         geneaprove.views.merge.view),
    )

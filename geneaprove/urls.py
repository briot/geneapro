from django.conf import settings
from django.conf.urls import url
from django.shortcuts import render_to_response
from django.template.context_processors import csrf
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

urlpatterns = [
    url(r'^$', index, name='index'),
    url(r'^data/pedigree/(?P<id>\d+)$',        PedigreeData.as_view()),
    url(r'^data/persona/list$',                PersonaList.as_view()),
    url(r'^data/persona/(?P<id>\d+)$',         PersonaView.as_view()),
    url(r'^data/places$',         geneaprove.views.places.view_list),
    url(r'^data/sources/list$',                SourcesList.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)$',       SourceView.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)/saveparts$',   EditSourceCitation.as_view()),
    url(r'^data/sources/(?P<id>-?\d+)/parts$', SourceCitation.as_view()),
    url(r'^data/sources/(\d+)/addRepr',        AddSourceRepr.as_view()),
    url(r'^data/sources/(\d+)/allRepr',        SourceRepresentations.as_view()),
    url(r'^data/sources/(\d+)/delRepr/(\d+)',  DelSourceRepr.as_view()),
    url(r'^data/suretySchemes$',               SuretySchemesList.as_view()),
    url(r'^data/event/(\d+)$',    geneaprove.views.events.view),
    url(r'^data/legend$',         geneaprove.views.rules.getLegend),
    url(r'^data/stats$',          geneaprove.views.stats.view),
    url(r'^data/import$',              geneaprove.views.importers.import_gedcom),
    url(r'^data/citationModel/(?P<model_id>.+)$', CitationModel.as_view()),
    url(r'^data/citationModels$',           CitationModels.as_view()),
    url(r'^data/settings',                  GlobalSettings.as_view()),
    url(r'^data/repr/(?P<id>\d+)(?:/(?P<size>\d+))?$',
                               geneaprove.views.representation.view),

    # ... below: not moved to angularJS yet

    url(r'^quilts/(\d+)?$', geneaprove.views.graph.quilts_view),
    url(r'^merge$',         geneaprove.views.merge.view),
] 

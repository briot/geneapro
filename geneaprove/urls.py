from django.conf.urls import *
from django.shortcuts import render_to_response
from django.core.context_processors import csrf
import geneaprove.views.pedigree
import geneaprove.views.persona
import geneaprove.views.places
import geneaprove.views.representation
import geneaprove.views.rules
import geneaprove.views.stats
import geneaprove.views.sources
import geneaprove.views.events
import geneaprove.views.merge
import geneaprove.views.graph
import geneaprove.views.importers

def index(request):
    c = {}
    c.update(csrf(request))
    return render_to_response('geneaprove/index.html', c)

urlpatterns = patterns(
    '',
    url(r'^$', index, name='index'),
    (r'^data/pedigree/(\d+)$', geneaprove.views.pedigree.pedigree_data),
    (r'^data/persona/list$',   geneaprove.views.persona.view_list),
    (r'^data/persona/(\d+)$',  geneaprove.views.persona.view),
    (r'^data/places$',         geneaprove.views.places.view_list),
    (r'^data/sources/lists$',  geneaprove.views.sources.view_list),
    (r'^data/sources/(-?\d+)$',  geneaprove.views.sources.view),
    (r'^data/suretySchemes$',  geneaprove.views.persona.surety_schemes_view),
    (r'^data/event/(\d+)$',    geneaprove.views.events.view),
    (r'^data/legend$',         geneaprove.views.rules.getLegend),
    (r'^data/stats$',          geneaprove.views.stats.view),
    (r'^import$',              geneaprove.views.importers.import_gedcom),
    (r'^data/citationModel/(.+)$', geneaprove.views.sources.citation_model),

    (r'^data/settings', geneaprove.views.persona.get_settings),

    # ... below: not moved to angularJS yet


    # Returns JSON, the list of all events for the person.
    # Param is the id
    (r'^personaEvents/(\d+)$',
     geneaprove.views.persona.personaEvents),

    # The image for a specific representation
    (r'^repr/(.*)/(\d+)$',
     geneaprove.views.representation.view),

    # The list of representations for the higher sources
    (r'^reprList/(?P<source_id>\d+)',
        geneaprove.views.representation.higherSourceReprList),

    (r'^quilts/(\d+)?$',
     geneaprove.views.graph.quilts_view),

    (r'^editCitation/(?P<source_id>\w+)$',
        geneaprove.views.sources.editCitation),

    # Experimental, does not work yet
    (r'^merge$',        geneaprove.views.merge.view),
    )

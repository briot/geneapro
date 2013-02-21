from django.conf.urls.defaults import *
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

urlpatterns = patterns('',
    (r'^$', geneaprove.views.pedigree.pedigree_view),
    (r'^sources$', geneaprove.views.sources.source_list),
    (r'^sources/(\d+)$', geneaprove.views.sources.view),
    (r'^event/(\d+)$', geneaprove.views.events.view),

    (r'^personas$',  geneaprove.views.persona.view_list),
    (r'^persona/(\d+)$', geneaprove.views.persona.view),

    # Returns JSON, the list of all events for the person. Param is the id
    (r'^personaEvents/(\d+)$', geneaprove.views.persona.personaEvents),

    (r'^places$', geneaprove.views.places.view_list),
    (r'^repr/(.*)/(\d+)$', geneaprove.views.representation.view),

    (r'^pedigree/(\d+)$', geneaprove.views.pedigree.pedigree_view),
    (r'^fanchart/(\d+)$', geneaprove.views.pedigree.fanchart_view),

    (r'^pedigreeData/(\d+)$', geneaprove.views.pedigree.pedigree_data),

    (r'^stats$',        geneaprove.views.stats.view),
    (r'^stats/(\d+)$',  geneaprove.views.stats.view),
    (r'^quilts/(\d+)?$',        geneaprove.views.graph.quilts_view),

    (r'^editCitation/(?P<source_id>\w+)$', geneaprove.views.sources.editCitation),
    (r'^citationParts/(?P<medium>\w+)$', geneaprove.views.sources.citationParts),
    (r'^fullCitation$', geneaprove.views.sources.fullCitation),

    # Importing a GEDCOM file
    (r'^import$',   geneaprove.views.importers.import_gedcom),

    # Experimental, does not work yet
    (r'^merge$',        geneaprove.views.merge.view),
)

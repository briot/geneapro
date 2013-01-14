from django.conf.urls.defaults import *
import geneapro.views.pedigree
import geneapro.views.persona
import geneapro.views.places
import geneapro.views.representation
import geneapro.views.rules
import geneapro.views.stats
import geneapro.views.sources
import geneapro.views.events
import geneapro.views.merge
import geneapro.views.graph

urlpatterns = patterns('',
    (r'^$', geneapro.views.pedigree.pedigree_view),
    (r'^sources$', geneapro.views.sources.source_list),
    (r'^sources/(\d+)$', geneapro.views.sources.view),
    (r'^event/(\d+)$', geneapro.views.events.view),
    (r'^personas$',  geneapro.views.persona.view_list),
    (r'^persona/(\d+)$', geneapro.views.persona.view),
    (r'^places$', geneapro.views.places.view_list),
    (r'^repr/(.*)/(\d+)$', geneapro.views.representation.view),
    #url (r'^pedigreeData$', geneapro.views.pedigree.data, name="pedigree_data"),
    (r'^pedigree/(\d+)$', geneapro.views.pedigree.pedigree_view),
    (r'^fanchart/(\d+)$', geneapro.views.pedigree.fanchart_view),
    (r'^pedigreeData/(\d+)/(\d+)$', geneapro.views.pedigree.pedigree_data),
    (r'^stats$',        geneapro.views.stats.view),
    (r'^stats/(\d+)$',  geneapro.views.stats.view),
    (r'^quilts/(\d+)?$',        geneapro.views.graph.quilts_view),

    # Experimental, does not work yet
    (r'^merge$',        geneapro.views.merge.view),
)

from django.conf.urls.defaults import *
from mysites.geneapro import views
import mysites.geneapro.views.pedigree
import mysites.geneapro.views.persona
import mysites.geneapro.views.representation
import mysites.geneapro.views.rules
import mysites.geneapro.views.stats
import mysites.geneapro.views.sources

urlpatterns = patterns('',
	(r'^$', views.pedigree.fanchart_view),  # used to be views.index
	(r'^sources$', views.sources.source_list),
	(r'^sources/(\d+)$', views.sources.view),
    (r'^personas$',  views.persona.view_list),
    (r'^persona/(\d+)$', views.persona.view),
    (r'^repr/(.*)/(\d+)$', views.representation.view),
	url (r'^pedigreeData$', views.pedigree.data, name="pedigree_data"),
	(r'^pedigree$',     views.pedigree.pedigree_view),
	(r'^pedigree2$',    views.pedigree.pedigree_canvas_view),
	(r'^fanchart$',     views.pedigree.fanchart_view),
	(r'^stats$',        views.stats.view),
)

from django.conf.urls.defaults import *
from mysites.geneapro import views
import mysites.geneapro.views.pedigree
import mysites.geneapro.views.persona
import mysites.geneapro.views.representation
import mysites.geneapro.views.rules
import mysites.geneapro.views.stats
import mysites.geneapro.views.sources

urlpatterns = patterns('',
	(r'^$', views.pedigree.pedigree_view),
	(r'^sources$', views.sources.source_list),
	(r'^sources/(\d+)$', views.sources.view),
    (r'^personas$',  views.persona.view_list),
    (r'^persona/(\d+)$', views.persona.view),
    (r'^repr/(.*)/(\d+)$', views.representation.view),
    #url (r'^pedigreeData$', views.pedigree.data, name="pedigree_data"),
	(r'^pedigree/(\d+)$', views.pedigree.pedigree_view),
	(r'^fanchart/(\d+)$', views.pedigree.fanchart_view),
	(r'^stats$',        views.stats.view),
)

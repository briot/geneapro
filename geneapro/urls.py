from django.conf.urls.defaults import *
from mysites.geneapro import views
import mysites.geneapro.views.pedigree
import mysites.geneapro.views.persona
import mysites.geneapro.views.rules
import mysites.geneapro.views.stats

urlpatterns = patterns('',
	(r'^$', views.pedigree.fanchart_view),  # used to be views.index
	(r'^sources$', views.sources),
    (r'^personas$',  views.persona.view_list),
    (r'^persona/(\d+)', views.persona.view),
	url (r'^pedigreeData$', views.pedigree.data, name="pedigree_data"),
	(r'^pedigree$',     views.pedigree.pedigree_view),
	(r'^pedigree2$',    views.pedigree.pedigree_canvas_view),
	(r'^fanchart$',     views.pedigree.fanchart_view),
	(r'^stats$',        views.stats.view),
)

from django.conf.urls.defaults import *
from mysites.geneapro import views
import mysites.geneapro.views.pedigree

urlpatterns = patterns('',
	(r'^$', views.index),
	(r'^sources$', views.sources),
	url (r'^pedigreeData$', views.pedigree.data, name="pedigree_data"),
	(r'^pedigree$',     views.pedigree.pedigree_view),
	(r'^fanchart$',     views.pedigree.fanchart_view),
)

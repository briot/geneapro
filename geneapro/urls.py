from django.conf.urls.defaults import *
from mysites.geneapro import views

urlpatterns = patterns('',
	(r'^$', views.index),
	(r'^sources$', views.sources),
	(r'^pedigree$', views.pedigree),
)

from django.conf.urls import patterns, include, url
from django.conf import settings
from django.views import static
import django.views.defaults
import geneaprove.urls

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
	(r'^', include(geneaprove.urls)),
	(r'^geneaprove/', include(geneaprove.urls)),

    ## Serve static files (images and CSS). This is not recommended for use
    ## in production since this is insecure and inefficient according to the
    ## doc. One trick is commented out below and is to add a new variable
    ## in settings.py
    (r'^%s(?P<path>.*)$' % settings.MEDIA_URL[1:],
          static.serve, {"document_root": settings.MEDIA_ROOT}),
	#if settings.LOCAL_DEVELOPMENT:
	#    urlpatterns += patterns("django.views",
	#        url(r"%s(?P<path>.*)/$" % settings.MEDIA_URL[1:], "static.serve", {
	#            "document_root": settings.MEDIA_ROOT,
	#        })

    # Uncomment the admin/doc line below and add 'django.contrib.admindocs'
    # to INSTALLED_APPS to enable admin documentation:
    #(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    #(r'^admin/(.*)', admin.site.root),
)

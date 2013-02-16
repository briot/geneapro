##
## See http://www.djangosnippets.org/snippets/650/
## When debugging AJAX with Firebug, if a response is 500, it is a pain
## to have to view the entire source of the pretty exception page. This is
## a simple middleware that just returns the exception without any markup.
## You can add this anywhere in your python path and then put it in you
## settings file. It will only unprettify your exceptions when there is a
## XMLHttpRequest header

from django.conf import settings
from django.http import HttpResponseServerError
from django.db   import connection
from django.core.management import color
import time

style = color.color_style ()

class AJAXSimpleExceptionResponse:
    def process_request(self, request):
        self.start = time.clock ()
        self.has_exception = False

    def process_response(self, request, response):
        if settings.DEBUG and len (connection.queries) != 0:
           end = time.clock ()
           total = 0.0

           for r, q in enumerate (connection.queries):
              if not 'duration' in q:  # created by django toolbar
                 q['duration'] = ''

              if 'time' in q:   # default
                 total += float (q['time'])
              else:  # with django toolbar
                 total += float (q['duration'])

           if self.has_exception:
              print "Exception raised"

           print style.SQL_COLTYPE (
              "Number of queries: %d" % len (connection.queries))
           print style.SQL_COLTYPE (
              "Total queries time: %fs" % total)
           print style.SQL_COLTYPE (
              "Total time: %fs" % (end - self.start))

        return response

    def process_exception(self, request, exception):
        if settings.DEBUG:
            self.has_exception = True
            if request.is_ajax():
                import sys, traceback
                (exc_type, exc_info, tb) = sys.exc_info()
                response = "%s\n" % exc_type.__name__
                response += "%s\n\n" % exc_info
                response += "TRACEBACK:\n"
                for tb in traceback.format_tb(tb):
                    response += "%s\n" % tb
                print response
                return HttpResponseServerError(response)

from django.conf import settings
from django.http import HttpResponseServerError
from django.db   import connection
from django.core.management import color
import time


class AJAXSimpleExceptionResponse(object):
    def __init__(self, get_response):
        self.get_response = get_response
        self.style = color.color_style ()

    def __call__(self, request):

        # Code to be executed before the view
        start = time.clock ()
        self.has_exception = False

        response = self.get_response(request)

        # Code to be executed after the view
        if settings.DEBUG and len(connection.queries):
           end = time.clock()
           total = 0.0

           for r, q in enumerate(connection.queries):
              if 'time' in q:   # default
                 total += float(q['time'])
              elif 'duration' in q:  # with django toolbar
                 total += float(q['duration'])

              # print(self.style.SQL_COLTYPE("%s" % q['sql']))

           if self.has_exception:
               format = self.style.ERROR_OUTPUT
           else:
               format = self.style.SQL_COLTYPE

           print('\n'.join('%s (%s)' % (q['sql'], q['time']) for q in connection.queries))

           print(format(
               "Total time: %fs  /  queries time (%s queries): %fs" % (
                   end - start, len(connection.queries), total)))

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
                print(response)

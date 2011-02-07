from datetime import datetime
import cProfile

# Invokes the profiler when processing a query.
# Postprocess results with:
#     pyprof2calltree -i /tmp/*.pro -k


class ProfileMiddleware(object):
    def __doprofile(self):
        """Whether to do profiling"""
        # One way to profile only from a single session
        return True or hasattr(request, 'profiler')

    def process_request(self, request):
        if self.__doprofile():
            request.profiler = cProfile.Profile()
            request.profiler.enable()

    def process_response(self, request, response):
        if self.__doprofile():
            request.profiler.disable()
            stamp = "%s" % (request.path.replace("/", "__"),)
            #stamp = "%s-%s" % (request.META['REMOTE_ADDR'], datetime.now())
            request.profiler.dump_stats('/tmp/%s.pro' % stamp)
        return response

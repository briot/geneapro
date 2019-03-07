from datetime import datetime
import cProfile

# Invokes the profiler when processing a query.
# Postprocess results with:
#     pyprof2calltree -k -i /tmp/*.pro
#
# or, when kcachegrind is not available, you can also use
#     cprofilev -f /tmp/*.pro
#     navigate to http://127.0.0.1:4000

class ProfileMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if hasattr(request, 'profiler'):
            profiler = cProfile.Profile()
            profiler.enable()

            response = self.get_response(request)

            profiler.disable()
            stamp = f'{request.path.replace("/", "__")}'
            profiler.dump_stats(f'/tmp/{stamp}.pro')
            print(f"Dumped profile info in /tmp/{stamp}.pro")

            return response

        else:
            return self.get_response(request)

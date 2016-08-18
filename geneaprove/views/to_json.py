"""Convert data to JSON"""

import json
import collections
import datetime
import copy
import django.db.models.query
from django.conf import settings
from django.views.generic import View
from django.http import HttpResponse, QueryDict, JsonResponse
from django.core.serializers.json import DjangoJSONEncoder
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.styles import get_place


###########################################################################
# Exporting to JSON
###########################################################################

class ModelEncoder(DjangoJSONEncoder):
    """
    Encode an object or a list extracted from our model to a JSON
    representation.
    """

    def __init__(self, custom=None, year_only=False, **kwargs):
        """
        :param custom: a function that gets an object, and returns its JSON
           encoding as a string, or a simple version of the object that should
           be encoded recursively It should return None to fallback to the
           default encoding.
        """
        if 'separators' not in kwargs:
            kwargs['separators'] = (',', ':')
        super(ModelEncoder, self).__init__(**kwargs)
        self.year_only = year_only
        self.custom = custom

    def default(self, obj):
        """See inherited documentation"""

        if self.custom:
            p = self.custom(obj)
            if p:
                return p

        if isinstance(obj, DateRange):
            return obj.display(year_only=self.year_only)

        elif isinstance(obj, datetime.datetime):
            if self.year_only:
                return obj.strftime('%Y')
            else:
                return obj.isoformat()

        elif isinstance(obj, django.db.models.query.QuerySet):
            return list(obj)

        elif isinstance(obj, set):
            return list(obj)

        # Must be last, since all model objects have a default to_json
        elif hasattr(obj, 'to_json'):
            return obj.to_json()

        else:
            return super(ModelEncoder, self).default(obj)

def to_json(obj, custom=None, year_only=True):
    """
    Converts a type to json data, properly converting database instances.
    If year_only is true, then the dates will only include the year
    :param custom: a function that gets an object, and returns its JSON
       encoding as a string, or a simple version of the object that should
       be encoded recursively It should return None to fallback to the default
       encoding.
    """
    return ModelEncoder(year_only=year_only, custom=custom).encode(obj)


class JSONViewParams(QueryDict):
    """
    A structure that encapsulates the HTTP parameters given to a JSONView.
    This replaces the use of request.POST or request.GET, since AngularJS
    encodes the information in the body of the request.
    Moreover, when a request provides files, it is invalid to access this
    body.

    The parameters are accessed via::
        self['param1']
    The upload files are accessed via::
        self.FILES

    This extends a QueryDict, since django encodes parameters as lists
    even when they are not lists, and properly return them as simple values
    later on.
    """

    def __init__(self):
        super(JSONViewParams, self).__init__('', mutable=True)

    def setFiles(self, files):
        self.FILES = files

    def setFromBody(self, body):
        if body:
            self.update(json.loads(body))


class JSONView(View):
    def get_json(self, params, *args, **kwargs):
        """
        Builds the JSON data to be returned by the view.
        :param id: id parameters are always converted to integers
        """
        return {}

    def to_json(self, value):
        """
        Converts value to json
        """
        return to_json(value)

    # internal implementation

    def __internal(self, method, params, *args, **kwargs):
        # Always convert an "id" parameter to integer
        if 'id' in kwargs:
            kwargs['id'] = int(kwargs['id'])
        r = method(params, *args, **kwargs) or {"success": True}
        return JsonResponse(r, encoder=ModelEncoder)

    def get(self, request, *args, **kwargs):
        try:
            params = JSONViewParams()
            params.update(request.GET)
            if settings.DEBUG:
                print "=========== %s =============" % (self.__class__, )
                print "Params: %s" % (params, )
            return self.__internal(self.get_json, params, *args, **kwargs)
        except Exception as e:
            print "Error %s" % e
            return JsonResponse({'error': '%s' % e})
    
    def post(self, request, *args, **kwargs):
        try:
            # decode the parameters from the body, since that's where AngularJS
            # puts them with AJAX requests
            params = JSONViewParams()
            params.update(request.POST)
            if not request.FILES:
                params.setFromBody(request.body)
            else:
                params.setFiles(request.FILES)
            if settings.DEBUG:
                print "=========== %s =============" % (self.__class__, )
                print "Params: %s" % (params, )
            return self.__internal(self.post_json, params, *args, **kwargs)
        except Exception as e:
            print "Error %s" % e
            return JsonResponse({'error': '%s' % e})

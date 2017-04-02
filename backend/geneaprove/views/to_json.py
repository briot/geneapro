"""Convert data to JSON"""

import json
import datetime
import django.db.models.query
from django.conf import settings
from django.views.generic import View
from django.http import HttpResponse, QueryDict
from django.core.serializers.json import DjangoJSONEncoder
from geneaprove.utils.date import DateRange


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
        # pylint: disable=method-hidden
        # pylint: disable=too-many-return-statements
        """See inherited documentation"""

        if self.custom:
            from_custom = self.custom(obj)
            if from_custom:
                return from_custom

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
        self.files

    This extends a QueryDict, since django encodes parameters as lists
    even when they are not lists, and properly return them as simple values
    later on.
    """

    def __init__(self):
        super(JSONViewParams, self).__init__('', mutable=True)
        self.files = []

    def set_files(self, files):
        """
        Set the list of UploadedFiles sent by the client.
        """
        self.files = files

    def set_from_body(self, body):
        """
        Read the request's JSON parameters from the body of the request.
        """
        if body:
            self.update(json.loads(body))


class JSONView(View):
    """
    A base class for all views that read parameters either via http
    or as JSON-encoded body, and then return some JSON data.
    """

    def get_json(self, params, *args, **kwargs):
        # pylint: disable=no-self-use
        # pylint: disable=unused-argument
        """
        Builds the JSON data to be returned by the view.

        The parameters come from the request as sent by the browser.
        As a special case, an 'id' parameter is always converted to integer.
        """
        return {}

    def post_json(self, params, *args, **kwargs):
        # pylint: disable=no-self-use
        # pylint: disable=unused-argument
        """
        Builds the JSON data to be returned by the view, when handling POST.
        """
        return {}

    def to_json(self, value):
        """
        Converts value to JSON.
        This can be overridden if necessary.
        """
        return to_json(value)

    def __internal(self, method, params, *args, **kwargs):
        """
        internal implementation
        """

        # Always convert an "id" parameter to integer
        if 'id' in kwargs:
            kwargs['id'] = int(kwargs['id'])
        resp = method(params, *args, **kwargs) or {"success": True}

        # Can't use JsonResponse since we want our own converter
        result = self.to_json(resp)
        return HttpResponse(result, content_type='application/json')

    def get(self, request, *args, **kwargs):
        """
        Handles GET requests
        """
        params = JSONViewParams()
        params.update(request.GET)
        if settings.DEBUG:
            print("   %s.get() => %s" % (self.__class__, params))
        return self.__internal(self.get_json, params, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        """
        Handles POST requests
        """
        # decode the parameters from the body, since that's where AngularJS
        # puts them with AJAX requests
        params = JSONViewParams()
        params.update(request.POST)
        if not request.FILES:
            params.set_from_body(request.body)
        else:
            params.set_files(request.FILES)
        if settings.DEBUG:
            print("   %s.post() => %s" % (self.__class__, params))
        return self.__internal(self.post_json, params, *args, **kwargs)

"""Convert data to JSON"""

import json
import collections
import datetime
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.styles import get_place
import django.db.models.query


def event_for_json(evt, year_only=True):
    """
    Extract relevant data from an event, to include in JSON.
    """
    if evt is None:
        return []
    else:
        place = get_place(evt, "name") or ""
        if year_only and evt.Date:
            return [evt.Date.display(year_only=year_only), place, evt.sources]
        else:
            # Reuse user date if possible
            return [evt.date, place, evt.sources]


def to_json(obj, year_only=True, show_age=False):
    """Converts a type to json data, properly converting database instances.
       If year_only is true, then the dates will only include the year"""

    class ModelEncoder(json.JSONEncoder):
        """Encode an object or a list of objects extracted from our model into
           JSON"""

        def default(self, obj):
            """See inherited documentation"""

            if isinstance(obj, DateRange):
                return obj.display(year_only=year_only)

            elif isinstance(obj, models.Event):
                return event_for_json(obj)

            elif isinstance(obj, set):
                return list(obj)

            elif isinstance(obj, datetime.datetime):
                return obj.isoformat()

            elif isinstance(obj, django.db.models.query.QuerySet):
                return list(obj)

            elif hasattr(obj, 'to_json'):
                return obj.to_json()

            return super(ModelEncoder, self).default(obj)

    return json.dumps(obj, cls=ModelEncoder, separators=(',', ':'))

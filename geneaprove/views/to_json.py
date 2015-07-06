"""Convert data to JSON"""

import json
import collections
import datetime
import copy
from geneaprove import models
from geneaprove.utils.date import DateRange
from geneaprove.views.styles import get_place
import django.db.models.query


############################################################
# Building information for json export
############################################################

class EventInfo(object):
    __slots__ = ['event', 'role', 'assertion']
    def __init__(self, event, role, assertion):
        # "event" has fields like "sources", "place", "Date"
        #   where "Date" is a geneaprove.utils.DateRange object and should not
        #   be used for display
        self.event = event
        self.role = role
        self.assertion = assertion


class CharInfo(object):
    __slots__ = ['char', 'parts', 'assertion']
    def __init__(self, char, parts, assertion):
        self.char = char
        self.parts = parts
        self.assertion = assertion


class CharPartInfo(object):
    __slots__ = ['name', 'value']
    def __init__(self, name, value):
        self.name = name
        self.value = value


class GroupInfo(object):
    __slots__ = ['group', 'assertion']
    def __init__(self, group, assertion):
        # "group" has fields like "source",...
        self.group = group
        self.assertion = assertion


###########################################################################
# Exporting to JSON
###########################################################################

class ModelEncoder(json.JSONEncoder):
    """
    Encode an object or a list extracted from our model to a JSON
    representation.
    """

    def __init__(self, custom=None, year_only=False):
        """
        :param custom: a function that gets an object, and returns its JSON
           encoding as a string, or a simple version of the object that should
           be encoded recursively It should return None to fallback to the
           default encoding.
        """
        super(ModelEncoder, self).__init__(separators=(',', ':'))
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
            return obj.isoformat()

        elif isinstance(obj, django.db.models.query.QuerySet):
            return list(obj)

        elif isinstance(obj, GroupInfo):
            return dict(
                group=obj.group,
                assertion=obj.assertion)

        elif isinstance(obj, CharInfo):
            return dict(
                char=obj.char,
                parts=obj.parts,
                assertion=obj.assertion)

        elif isinstance(obj, CharPartInfo):
            return dict(name=obj.name, value=obj.value)

        elif isinstance(obj, models.Characteristic):
            return dict(
                name=obj.name,
                sources=list(obj.sources if hasattr(obj, 'sources') else []),
                date=obj.date,
                date_sort=obj.date_sort,
                place=obj.place)

        elif isinstance(obj, models.Assertion):
            result = dict(
                disproved=obj.disproved,
                rationale=obj.rationale,
                surety=obj.surety_id)

            if isinstance(obj, models.P2P):
                result['person1'] = obj.person1
                result['person2'] = obj.person2

            elif isinstance(obj, models.P2E):
                result['date'] = obj.event.date and DateRange(obj.event.date)
                result['place'] = obj.event.place and obj.event.place.name
                result['person1'] = obj.person
                result['event2'] = (obj.event, obj.role.name)

            elif isinstance(obj, models.P2C):
                parts = []
                for p in models.Characteristic_Part.objects.filter(
                        characteristic=obj.characteristic).select_related():
                    parts.append((p.type.name, p.name))
                result['date'] = \
                     obj.characteristic.date and DateRange(obj.characteristic.date)
                result['place'] = \
                     obj.characteristic.place and obj.characteristic.place.name
                result['person1'] = obj.person
                result['char2'] = (obj.characteristic, parts)

            return result

        elif isinstance(obj, models.Source):
            return dict(
                higher_source_id=obj.higher_source_id,
                subject_place=obj.subject_place,
                jurisdiction_place=obj.jurisdiction_place,
                researcher=obj.researcher,
                subject_date=obj.subject_date,
                medium=obj.medium,
                title=obj.title,
                abbrev=obj.abbrev,
                biblio=obj.biblio,
                last_change=obj.last_change,
                comments=obj.comments)

        elif isinstance(obj, EventInfo):
            return dict(
                event=obj.event,
                role=obj.role,
                assertion=obj.assertion)

        elif isinstance(obj, models.Event):
            return dict(
                id=obj.id,
                name=obj.name,
                type=obj.type,
                place=obj.place,
                sources=list(obj.sources if hasattr(obj, 'sources') else []),
                date=obj.date,
                date_sort=obj.date_sort)

        elif isinstance(obj, set):
            return list(obj)

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

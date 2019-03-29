"""
Given a dict containing list of persona ids, source ids,... fetch
the related entities so that they are also sent along to the
client.
"""

import collections
from django.conf import settings
from django.db.models import Q
from geneaprove import models
import logging
from .sqlsets import SQLSet


logger = logging.getLogger('geneaprove.related')


class AssertList(SQLSet):

    def __init__(self, asserts=[]):
        """
        Fetch all data needed for the asserts
        """
        self.asserts = set(asserts)
        self._known_events = set()     # list of Event
        self._known_persons = set()    # list of Person
        self._known_places = set()     # list of Place
        self._known_sources = set()    # list of Source
        self._missing_persons = set()  # list of ids
        self._missing_places = set()   # list of ids
        self._missing_sources = set()  # list of ids
        self._missing_events = set()   # list of ids

    def __iter__(self):
        return iter(self.asserts)

    def add(self, assertions):
        self.asserts.add(assertions)

    def extend(self, assertions):
        self.asserts.update(assertions)

    def add_known(self, *, events=[], persons=[], places=[], sources=[]):
        """
        List already known sources, they will not be fetched again
        """
        if settings.DEBUG:
            # Check the iterable seem to contain proper types. We only check
            # the first element
            events = list(events)
            assert not events or isinstance(events[0], models.Event)
            persons = list(persons)
            assert not persons or isinstance(persons[0], models.Persona)
            places = list(places)
            assert not places or isinstance(places[0], models.Place)
            sources = list(sources)
            assert not sources or isinstance(sources[0], models.Source)

        self._known_events.update(events)
        self._known_persons.update(persons)
        self._known_places.update(places)
        self._known_sources.update(sources)

    def add_missing(self, *, persons=[], places=[], sources=[], events=[]):
        """
        List already known sources, they will not be fetched again
        """
        if settings.DEBUG:
            # Check the iterable seem to contain proper types. We only check
            # the first element
            events = list(events)
            assert not events or isinstance(events[0], int)
            persons = list(persons)
            assert not persons or isinstance(persons[0], int)
            places = list(places)
            assert not places or isinstance(places[0], int) \
                    or places[0] is None
            sources = list(sources)
            assert not sources or isinstance(sources[0], int) \
                    or sources[0] is None

        self._missing_events.update(events)
        self._missing_persons.update(persons)
        self._missing_places.update(places)
        self._missing_sources.update(sources)

    def to_json(self):
        """
        Convert to JSON, after fetching related entities. The result also
        includes entities given to `set_known`
        """
        logger.debug('fetching related entities')

        for a in self.asserts:
            a.getRelatedIds(into=self)

        def _fetch(queryset, missing, known):
            missing.difference_update(a.id for a in known)
            if not missing:
                return known
            result = [row
                    for chunk in self.sqlin(queryset.objects, id__in=missing)
                    for row in chunk]
            result.extend(known)
            return result

        # as part of converting the P2C to json, we will need to know the
        # parts, so fetch them now.
        self.prefetch_related(
            [a for a in self.asserts if isinstance(a, models.P2C)],
            'characteristic__parts')

        return {
            'asserts': self.asserts,
            'events': _fetch(
                models.Event, self._missing_events, self._known_events),
            'persons': _fetch(
                models.Persona, self._missing_persons, self._known_persons),
            'places': _fetch(
                models.Place, self._missing_places, self._known_places),
            'sources': _fetch(
                models.Source, self._missing_sources, self._known_sources),
        }

"""
Given a dict containing list of persona ids, source ids,... fetch
the related entities so that they are also sent along to the
client.
"""

from django.db.models import Q
from geneaprove import models
import logging


logger = logging.getLogger('geneaprove.related')


class JSONResult(object):

    def __init__(self,
                 asserts=[],
                 event_ids=[],
                 person_ids=[],
                 place_ids=[],
                 source_ids=[]):
        """
        Builds a response for the client.
        We start with list of ids that are referenced elsewhere,
        and will then fetch related entities before we convert
        to JSON.
        Assertions will, in turn, request further related entites

        :param models.Assertion[] asserts: list of assertions
        :param int[] *_ids: list of ids
        """
        self.asserts = set(asserts)
        self.event_ids = set(event_ids)
        self.person_ids = set(person_ids)
        self.place_ids = set(place_ids)
        self.source_ids = set(source_ids)

    def update(self,
               asserts=[],
               event_ids=[],
               person_ids=[],
               place_ids=[],
               source_ids=[]):
        """
        Add some ids to be fetched
        """
        self.asserts.update(asserts)
        self.event_ids.update(event_ids)
        self.person_ids.update(person_ids)
        self.place_ids.update(place_ids)
        self.source_ids.update(source_ids)

    def to_json(self, extra=dict()):
        """
        Convert to JSON, after fetching related entities

        :param dict extra: other values that need to be returned in the
           same dictionary. Exceptions are raised if they duplicate keys
           from the fields that are added automatically.
        """
        logger.debug('JSONResult.to_json')

        # Check arguments

        if not extra.keys().isdisjoint([
            'events', 'persons', 'places', 'sources']):

            raise Exception(
                f"Duplicate info given to JSONResult: {extra}")

        # Assertions require their own related entities. We need to
        # handle the case where getRelatedIds would in turn add extra
        # assertions

        while self.asserts:
            tmp = self.asserts
            self.asserts = set()
            for a in tmp:
                a.getRelatedIds(into=self)

        # Fetch related entities

        logger.debug('fetching related entities events=%s',
                     self.event_ids)

        result = dict(extra)

        if self.event_ids:
            result['events'] = list(models.Event.objects.
                select_related('type').filter(id__in=self.event_ids))

        if self.person_ids:
            result['persons'] = list(
                models.Persona.objects.filter(id__in=self.person_ids))

        if self.place_ids:
            result['places'] = list(
                models.Place.objects.filter(id__in=self.place_ids))

        if self.source_ids:
            result['sources'] = list(
                models.Source.objects.filter(id__in=self.source_ids))

        logger.debug('done fetching related entities')

        return result

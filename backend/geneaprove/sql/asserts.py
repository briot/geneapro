"""
Given a dict containing list of persona ids, source ids,... fetch
the related entities so that they are also sent along to the
client.
"""

from django.db.models import F, Value, IntegerField, TextField, QuerySet
import logging
from .sqlsets import SQLSet
from ..models.base import GeneaProveModel
from ..models.asserts import Assertion, P2E, P2C, P2P, P2G, AssertListProtocol
from ..models.event import Event
from ..models.persona import Persona
from ..models.place import Place
from ..models.source import Source
from typing import (
    Iterable, Set, Iterator, Optional, Any, Dict, List, Union, TypeVar,
    Protocol, Type)


logger = logging.getLogger('geneaprove.related')


class With_Id(Protocol):
    id: int


T = TypeVar("T", bound=With_Id)


class AssertList(SQLSet, AssertListProtocol):

    def __init__(self, asserts: Iterable[Assertion] = []):
        """
        Fetch all data needed for the asserts
        """
        self.asserts: List[Assertion] = [a for a in asserts]
        self._known_events: Set[Event] = set()     # list of Event
        self._known_persons: Set[Persona] = set()    # list of Person
        self._known_places: Set[Place] = set()     # list of Place
        self._known_sources: Set[Source] = set()    # list of Source
        self._missing_persons: Set[int] = set()  # list of ids
        self._missing_places: Set[int] = set()   # list of ids
        self._missing_sources: Set[int] = set()  # list of ids
        self._missing_events: Set[int] = set()   # list of ids

    def __iter__(self) -> Iterator[Assertion]:
        return iter(self.asserts)

    def add(self, assertions: Assertion) -> None:
        self.asserts.append(assertions)

    def extend(self, assertions: Iterable[Assertion]) -> None:
        self.asserts.extend(assertions)

    def add_known(
            self,
            *,
            events: Iterable[Event] = [],
            persons: Iterable[Persona] = [],
            places: Iterable[Place] = [],
            sources: Iterable[Source] = [],
            ) -> None:
        """
        List already known sources, they will not be fetched again
        """
        self._known_events.update(events)
        self._known_persons.update(persons)
        self._known_places.update(places)
        self._known_sources.update(sources)

    def add_missing(
            self,
            *,
            persons: Iterable[int] = [],
            places: Iterable[int] = [],
            sources: Iterable[int] = [],
            events: Iterable[int] = [],
            ):
        """
        List already known sources, they will not be fetched again
        """
        self._missing_events.update(events)
        self._missing_persons.update(persons)
        self._missing_places.update(places)
        self._missing_sources.update(sources)

    def fetch_asserts_subset(
            self,
            tables: Iterable[QuerySet],
            offset: int = None,
            limit: int = None,
            ) -> None:
        """
        Fetch a subset of assertions.
        :param list tables:
            The list of tables that should be queried, as ini
               [models.P2E.objects.filter(...),
                models.P2C.objects.filter(...)]
        """
        pm: Optional[QuerySet] = None
        for idx, queryset in enumerate(tables):
            # ??? Should we use a dispatching operation
            date = (
                F('event__date_sort')
                if queryset.model == P2E
                else F('characteristic__date_sort')
                if queryset.model == P2C
                else Value("", TextField())
                if queryset.model == P2P
                else Value("", TextField())
                if queryset.model == P2G
                else None
            )
            if date is None:
                raise Exception(f'Unknown queryset {queryset}')

            a = (
                queryset
                .values('id')
                .annotate(kind=Value(idx, IntegerField()), date_sort=date)
            )
            pm = (
                a
                if pm is None
                else pm.union(a)
            )

        if pm is None:
            return

        pm = pm.order_by('date_sort')
        pm = self.limit_offset(pm, offset=offset, limit=limit)

        asserts = list(pm)
        result: List[Optional[Assertion]] = [None] * len(asserts)

        for kind, queryset in enumerate(tables):
            ids = [a['id'] for a in asserts if a['kind'] == kind]
            if ids:
                # Memorize the sort order, because the next query (using "IN")
                # will not preserve it.
                order = {a['id']: idx
                         for idx, a in enumerate(asserts)
                         if a['kind'] == kind}
                prefetch = queryset.model.related_json_fields()
                for chunk in self.sqlin(queryset.model.objects, id__in=ids):
                    for c in self.prefetch_related(chunk, *prefetch):
                        result[order[c.id]] = c

        assert not any(a for a in result if a is None)
        self.asserts.extend(result)   # type: ignore

    def to_json(self) -> Union[List[Any], Dict[str, Any]]:
        """
        Convert to JSON, after fetching related entities. The result also
        includes entities given to `set_known`
        """
        logger.debug('fetching related entities')

        for a in self.asserts:
            a.getRelatedIds(into=self)

        def _fetch(
                queryset: Type[GeneaProveModel],
                missing: Set[int],
                known: Set[T],
                ) -> Union[Set[T], List[T]]:
            missing.difference_update(a.id for a in known)
            if not missing:
                return known
            result = [
                row
                for chunk in self.sqlin(queryset.objects.all(), id__in=missing)
                for row in chunk
            ]
            result.extend(known)
            return result

        # as part of converting the P2C to json, we will need to know the
        # parts, so fetch them now.
        self.prefetch_related(
            [a for a in self.asserts if isinstance(a, P2C)],
            'characteristic__parts'
        )

        return {
            'asserts': self.asserts,
            'events': _fetch(
                Event, self._missing_events, self._known_events),
            'persons': _fetch(
                Persona, self._missing_persons, self._known_persons),
            'places': _fetch(
                Place, self._missing_places, self._known_places),
            'sources': _fetch(
                Source, self._missing_sources, self._known_sources),
        }

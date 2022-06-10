from django.db.models import prefetch_related_objects, QuerySet, Model
from django.conf import settings
import logging
from typing import Optional, Iterable, Generator, List, TypeVar, Union


logger = logging.getLogger(__name__)

# Add max query size for other database backends
CHUNK_SIZE = settings.DATABASES['default']['CHUNK_SIZE']


T = TypeVar("T")
M = TypeVar("M", bound=Model)


class SQLSet:
    """
    Helpers to fetch related objects.
    By default, django doesn't properly handle sqlite because it easily
    generate queries with more than 1000 parameters.
    These various helpers can be used to break those into multiple queries.
    """

    ENGINE = settings.DATABASES['default']['ENGINE']

    def sql_split(
            self,
            ids: Optional[Iterable[T]],
            chunk_size=CHUNK_SIZE,
            ) -> Generator[Optional[List[T]], None, None]:
        """
        Generate multiple tuples to split a long list of ids into more
        manageable chunks for Sqlite
        """
        if ids is None:
            yield None
        else:
            ids = list(ids)  # need a list to extract parts of it
            for i in range(0, len(ids), chunk_size):
                yield ids[i:i + chunk_size]

    def prefetch_related(
            self,
            objects: Iterable[M],
            *attrs: str,
            ) -> List[M]:
        """
        Performs a prefetch_related_objects on the list, and splits into chunks
        to make it compatible with sqlite.
        Returns `objects` again, as a list, after updating related objects.
        """
        logger.debug('prefetch related %s', attrs)
        obj = list(objects)
        for chunk in self.sql_split(obj):
            if chunk is not None:
                prefetch_related_objects(chunk, *attrs)
        return obj

    def group_concat(self, field: str) -> str:
        """
        An aggregate function for the database, that takes all values for
        the field and returns a comma-separated list of values
        """
        if 'postgresql' in self.ENGINE:
            return f"string_agg({field}::text, ',')"
        else:
            return f"group_concat({field})"

    def cast(self, field: Union[int, str], typename: str) -> str:
        """
        Cast a field to a specific type
        """
        # Use standard SQL syntax, though historically postgresql used ::
        return f"CAST({field} AS {typename})"

    def sqlin(
            self,
            queryset: QuerySet,
            **kwargs: Optional[Iterable[T]],
            ) -> Generator[QuerySet, None, None]:
        """
        Return one or more querysets, after adding additional:
             WHERE  param_name IN param_value
        As opposed to django's builtin support, this works with sqlite even
        when there are more than 1000 values.

        example:
            for q in sqlin(model.Table.objects, ids__in=[...]):
                for row in q;
                   ...
        """
        assert len(kwargs) == 1

        for k, v in kwargs.items():
            assert k.endswith('__in')

            if v is None:
                yield queryset
            else:
                for chunk in self.sql_split(v):
                    if chunk is not None:
                        yield queryset.filter(**{k: chunk})

    def limit_offset(
            self,
            queryset: QuerySet,
            *,
            offset: int = None,
            limit: int = None,
            ) -> QuerySet:
        if limit is not None:
            if offset is not None:
                return queryset[int(offset):int(offset) + int(limit)]
            else:
                return queryset[:int(limit)]
        return queryset

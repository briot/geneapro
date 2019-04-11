from django.db.models import F, Value, IntegerField, TextField, \
        prefetch_related_objects
from django.conf import settings
import logging
from .. import models

logger = logging.getLogger(__name__)

# Add max query size for other database backends
CHUNK_SIZE = settings.DATABASES['default']['CHUNK_SIZE']

class SQLSet(object):
    """
    Helpers to fetch related objects.
    By default, django doesn't properly handle sqlite because it easily
    generate queries with more than 1000 parameters.
    These various helpers can be used to break those into multiple queries.
    """

    ENGINE = settings.DATABASES['default']['ENGINE']

    def sql_split(self, ids, chunk_size=CHUNK_SIZE):
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

    def prefetch_related(self, objects, *attrs):
        """
        Performs a prefetch_related_objects on the list, and splits into chunks
        to make it compatible with sqlite.
        Returns `objects` again, as a list, after updating related objects.
        """
        logger.debug('prefetch related %s', attrs)
        obj = list(objects)
        for chunk in self.sql_split(obj):
            prefetch_related_objects(chunk, *attrs)
        return obj

    @classmethod
    def group_concat(cls, field):
        """
        An aggregate function for the database, that takes all values for
        the field and returns a comma-separated list of values
        """
        if 'postgresql' in cls.ENGINE:
            return f"string_agg({field}::text, ',')"
        else:
            return f"group_concat({field})"

    @classmethod
    def cast(cls, field, typename):
        """
        Cast a field to a specific type
        """
        # Use standard SQL syntax, though historically postgresql used ::
        return f"CAST({field} AS {typename})"


    def sqlin(self, queryset, **kwargs):
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

        for k in kwargs:
            if not k.endswith('__in'):
                raise Exception(f'Invalid parameter {k}')

        for k, v in kwargs.items():
            if v is None:
                yield queryset
            else:
                for chunk in self.sql_split(v):
                    yield queryset.filter(**{k: chunk})

    def limit_offset(self, queryset, *, offset=None, limit=None):
        if limit is not None:
            if offset is not None:
                return queryset[int(offset):int(offset) + int(limit)]
            else:
                return queryset[:int(limit)]
        return queryset

    def fetch_asserts_subset(self, tables, offset=None, limit=None):
        """
        Fetch a subset of assertions.
        :param list tables:
            The list of tables that should be queried, as ini
               [models.P2E.objects.filter(...),
                models.P2C.objects.filter(...)]
        """
        pm = None
        for idx, queryset in enumerate(tables):
            # ??? Should we use a dispatching operation
            if queryset.model == models.P2E:
                date = F('event__date_sort')
            elif queryset.model == models.P2C:
                date = F('characteristic__date_sort')
            elif queryset.model == models.P2P:
                date = Value("", TextField())
            elif queryset.model == models.P2G:
                date = Value("", TextField())
            else:
                raise Exception('Unknown queryset %s' % queryset)

            a = queryset \
                .values('id') \
                .annotate(kind=Value(idx, IntegerField()), date_sort=date)
            pm = a if pm is None else pm.union(a)

        pm = pm.order_by('date_sort')
        pm = self.limit_offset(pm, offset=offset, limit=limit)

        asserts = list(pm)
        result = []
        for idx, queryset in enumerate(tables):
            ids = [a['id'] for a in asserts if a['kind'] == idx]
            if ids:
                prefetch = queryset.model.related_json_fields()
                for chunk in self.sqlin(queryset.model.objects, id__in=ids):
                    result.extend(self.prefetch_related(chunk, *prefetch))
        return result


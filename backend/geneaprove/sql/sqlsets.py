import django.db.models
import logging

logger = logging.getLogger(__name__)

class SQLSet(object):
    """
    Helpers to fetch related objects.
    By default, django doesn't properly handle sqlite because it easily
    generate queries with more than 1000 parameters.
    These various helpers can be used to break those into multiple queries.
    """

    def sql_split(self, ids, chunk_size=900):
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
            django.db.models.prefetch_related_objects(chunk, *attrs)
        return obj

    def sqlin(self, queryset, **kwargs):
        """
        Return one or more querysets, after adding additional:
             WHERE  param_name IN param_value
        As opposed to django's builtin support, this works with sqlite even
        when there are more than 1000 values.

        example:
            for q in sqlin(model.Table.objects, ids__in=[...]):
                for row in q.all();
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

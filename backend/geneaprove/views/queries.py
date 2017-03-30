from django.db.models import Q


# Maximum number of elements in a SQL_IN
MAX_SQL_IN = 800


def sql_split(ids):
    """Generate multiple tuples to split a long list of ids into more
       manageable chunks for Sqlite
    """
    if ids is None:
        yield None
    else:
        ids = list(ids)  # need a list to extract parts of it
        offset = 0
        while offset < len(ids):
            yield ids[offset:offset + MAX_SQL_IN]
            offset += MAX_SQL_IN


def sql_in(objects, field_in, ids, or_q=None):
    """A generator that performs the OBJECTS query, with extra filtering
       on FIELD_IN. This is equivalent to
           objects.filter("field_in"__in = ids)
       except it repeats the query multiple times if there are too many
       entries in IDS (a limitation of sqlite).
       IDS should be None to just perform the OBJECTS query without any
       additional filtering.

       :param or_q:
           An instance of django.db.models which is OR-ed with the "in"
           statement. So the query really is:
                WHERE  field_in  IN ids   OR or_q
    """

    if ids is None:
        if or_q is not None:
            for obj in objects.filter(or_q).all():
                yield obj
        else:
            for obj in objects.all():
                yield obj
    else:
        field_in += "__in"   # Django syntax for SQL's IN operator
        for subids in sql_split(ids):
            kwargs = {field_in: subids}
            base_q = Q(*(), **kwargs)
            if or_q is not None:
                query = objects.filter(base_q | or_q)
            else:
                query = objects.filter(base_q)
            for obj in query:
                yield obj

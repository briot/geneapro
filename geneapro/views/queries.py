# Maximum number of elements in a SQL_IN
MAX_SQL_IN = 900


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


def sql_in(objects, field_in, ids):
    """A generator that performs the OBJECTS query, with extra filtering
       on FIELD_IN. This is equivalent to
           objects.filter("field_in"__in = ids)
       except it repeats the query multiple times if there are too many
       entries in IDS (a limitation of sqlite).
       IDS should be None to just perform the OBJECTS query without any
       additional filtering.
    """

    if ids is None:
        for obj in objects.all():
            yield obj
    else:
        field_in += "__in"   # Django syntax for SQL's IN operator
        for subids in sql_split(ids):
            query = apply(objects.filter, [], {field_in:subids})
            for obj in query:
                yield obj

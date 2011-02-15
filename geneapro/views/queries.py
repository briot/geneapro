
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
        # Maximum number of elements in a SQL_IN
        MAX_SQL_IN = 900

        field_in += "__in"   # Django syntax for SQL's IN operator
        ids = list(ids)      # need a list to extract parts of it
        offset = 0

        while offset < len(ids):
            query = apply(
                objects.filter, [],
                {field_in:ids[offset:offset + MAX_SQL_IN]})
            for obj in query:
                yield obj

            offset += MAX_SQL_IN


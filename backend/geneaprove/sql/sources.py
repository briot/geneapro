import collections
import django.db
import logging
from .. import models
from .sqlsets import SQLSet
from .asserts import AssertList


logger = logging.getLogger(__name__)


CitationDetails = collections.namedtuple(
    'CitationDetails', 'name value fromHigh')


class SourceSet(SQLSet):

    def __init__(self):
        self.sources = collections.OrderedDict()  # id -> Source
        self.asserts = AssertList()
        self._higher = None  # id -> list of higher source ids, recursively
        self._citations = None  # id -> list of CitationDetails

    def add_ids(self, ids=None, offset=None, limit=None):
        """
        Fetch sources for all the given ids, along with related data like
        researcher and repository.
        """
        assert ids is None or isinstance(ids, collections.abc.Iterable)

        pm = models.Source.objects.select_related()
        pm = self.limit_offset(pm, offset=offset, limit=limit)

        for chunk in self.sqlin(pm, id__in=ids):
            for s in chunk:
                self.sources[s.id] = s

        self._higher = None
        self._citations = None
        self.asserts.add_known(
            sources=self.sources.values())   # Do not fetch them again

    def fetch_higher_sources(self):
        """
        Fetch the 'higher' source relationships. This only gets the ids
        """
        if self._higher is not None:
            return   # already computed

        logger.debug('SourceSet.fetch_higher_sources')
        with django.db.connection.cursor() as cur:
            ids = ", ".join(str(k) for k in self.sources.keys())
            q = (
                "WITH RECURSIVE higher(source_id, parent) AS ("
                    "SELECT id, higher_source_id FROM source "
                        "WHERE higher_source_id IS NOT NULL "
                    "UNION "
                    "SELECT higher.source_id, source.higher_source_id "
                        "FROM source, higher "
                        "WHERE source.id=higher.parent "
                        "AND source.higher_source_id IS NOT NULL"
                ") SELECT higher.source_id, higher.parent "
                "FROM higher "
                f"WHERE higher.source_id IN ({ids}) "
            )
            cur.execute(q)

            self._higher = collections.defaultdict(list)
            for s, parent in cur.fetchall():
                self._higher[s].append(parent)

    def count_asserts(self):
        """
        Count all asserts for the sources, but doesn't fetch them
        """
        assert len(self.sources) == 1
        sid = next(iter(self.sources))

        count = 0
        for table in (models.P2E, models.P2C, models.P2P, models.P2G):
            count += table.objects.filter(source=sid).count()
        return count

    def fetch_asserts(self, offset=None, limit=None):
        """
        Fetch all assertions for all sources
        """
        logger.debug('SourceSet.fetch_asserts')

        assert len(self.sources) == 1
        sid = next(iter(self.sources))

        self.asserts.fetch_asserts_subset(
            [models.P2E.objects.filter(source=sid),
             models.P2C.objects.filter(source=sid),
             models.P2P.objects.filter(source=sid),
             models.P2G.objects.filter(source=sid)],
            offset=offset,
            limit=limit)

    def fetch_citations(self):
        """
        Fetch all citation parts for all sources and their higher sources
        """
        if self._citations is not None:
            return   # already computed

        self.fetch_higher_sources()

        logger.debug('SourceSet.fetch_citations')
        all_ids = set(self.sources.keys())
        all_ids.update(
            h
            for higher_list in self._higher.values()
            for h in higher_list)

        self._citations = collections.defaultdict(list)
        for p in models.Citation_Part.objects.filter(source__in=all_ids):
            self._citations[p.source_id].append(CitationDetails(
                name=p.type_id,
                value=p.value,
                fromHigh=False))

    def get_citations(self, source):
        """
        Return the citations for a given source, recursively looking at
        higher sources
        """
        if isinstance(source, models.Source):
            source = source.id
        assert isinstance(source, int)

        if source not in self.sources:
            self.add_ids([source])

        self.fetch_citations()
        result = list(self._citations[source])

        for h in self._higher[source]:
            for c in self._citations[h]:
                result.append(CitationDetails(
                    name=c.name, value=c.value, fromHigh=True))
        return result

    def get_higher_sources(self, source):
        """
        Get the ids of higher sources for a specific source
        """
        if isinstance(source, models.Source):
            source = source.id
        assert isinstance(source, int)

        if source not in self.sources:
            self.add_ids([source])
        self.fetch_higher_sources()

        return self._higher[source]

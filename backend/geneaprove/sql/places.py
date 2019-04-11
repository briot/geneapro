from .. import models
from .asserts import AssertList
from .sqlsets import SQLSet


class PlaceSet(SQLSet):

    def __init__(self):
        self.place_ids = set()

    def add_ids(self, ids):
        self.place_ids.update(ids)

    def count_asserts(self):
        p2c = models.P2C.objects \
                .filter(characteristic__place_id__in=self.place_ids) \
                .count()
        p2e = models.P2E.objects \
                .filter(event__place_id__in=self.place_ids) \
                .count()
        return p2c + p2e

    def fetch_asserts(self, offset=None, limit=None):
        a = self.fetch_asserts_subset(
            [models.P2C.objects
                .filter(characteristic__place__in=self.place_ids),
             models.P2E.objects
                .filter(event__place__in=self.place_ids)],
            offset=offset,
            limit=limit)

        result = AssertList()
        result.extend(a)
        return result

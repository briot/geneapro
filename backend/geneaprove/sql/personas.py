"""
Support for writing custom SQL queries
"""

import collections
import django.db
from django.db.models import F, Q
import logging
from .. import models
from .asserts import AssertList
from .sqlsets import SQLSet


logger = logging.getLogger(__name__)


AncestorInfo = collections.namedtuple(
    'AncestorInfo', "main_id generation parents")
DescendantInfo = collections.namedtuple(
    'DescendantInfo', "main_id generation children")


class PersonSet(SQLSet):
    """
    Contains a set of persons, made up of low-level personas.
    This class provides various support to efficiently fetch such
    persons.
    """

    BMD = None
    # Will be set to the list of events for birth-marriage-death.
    # Cannot be computed immediately, since it needs a database lookup, and
    # the database might not event exist yet.

    def __init__(self, styles=None):
        self.asserts = AssertList() # All Assertions used to compute persons
        self.persons = collections.OrderedDict() # main_id -> Persona instance
        self.styles = styles

        # main_id -> parents and children
        self.layout = collections.defaultdict(
            lambda: {'children': [], 'parents': []})

        if PersonSet.BMD is None:
            PersonSet.BMD = (models.Event_Type.PK_birth,
                             models.Event_Type.PK_death,
                             models.Event_Type.PK_marriage)

    def add_ids(self, ids=None, namefilter=None, offset=None, limit=None,
                compute_sex=True):
        """
        Append to the list all persons for which one of the base personas has
        an id in `ids`.
        The exact set of persons depends on the following parameters:
            - if ids is specified, all persons in that iterable are fetched.
            - otherwise, all persons in the database are returned,
              which could take a long time.

        The additional parameters can be used to restrict that subset to
        [offset:offset+limit]
        """
        assert ids is None or isinstance(ids, collections.abc.Iterable)

        # This query is much slower than the one below, though it returns a real
        # manager that we can further manipulate.
        #     .annotate(sex=RawSQL(
        #         "SELECT c.name FROM characteristic_part c, p2c, persona p "
        #         "WHERE c.characteristic_id=p2c.characteristic_id "
        #         "AND c.type_id=%s "
        #         "AND p2c.person_id=p.id "
        #         "AND p.main_id=persona.id",
        #         (models.Characteristic_Part_Type.PK_sex,)))
        #
        # ??? Doesn't work, second instance of persona disappears
        #     .extra(
        #        select={'sex': 'characteristic_part.name', 'foo': 't2.id'},
        #         tables=['characteristic_part', 'p2c', 'persona'],
        #         where=["characteristic_part.characteristic_id="
        #                "p2c.characteristic_id",
        #                "characteristic_part.type_id=%s",
        #                "p2c.person_id=t2.id",
        #                "t2.main_id=persona.id"],
        #         params=(models.Characteristic_Part_Type.PK_sex,))

        if ids:
            # Convert from ids to main ids
            ids = ','.join('%d' % n for n in ids)
            id_to_main = (
                f"persona.id IN ("
                f"SELECT p.main_id FROM persona p WHERE p.id IN ({ids}))")
        else:
            id_to_main = "persona.main_id=persona.id"

        args = []
        if namefilter:
            args.append(f"%{namefilter}%")

        if compute_sex:
            sex_field = "sub1.sex"
            sex_query = (
                f"LEFT JOIN ({self._query_get_sex()}) sub1 ON "
                f"sub1.main_id=persona.id "
            )
        else:
            sex_field = "'?' as sex"
            sex_query = ""

        pm = models.Persona.objects.raw(
            f"SELECT persona.*, {sex_field} "
            f"FROM persona {sex_query}"
            f"WHERE {id_to_main} " +
            (f"AND persona.name LIKE %s " if namefilter else "") +
            "ORDER BY lower(persona.name) ASC " +
            (f"LIMIT {int(limit)} " if limit is not None else "") +
            (f"OFFSET {int(offset)} " if offset else ""),
            args)

        self.persons.update({p.id: p for p in pm.iterator()})

        # Do not fetch them again
        self.asserts.add_known(persons=self.persons.values())

    @staticmethod
    def _query_get_sex():
        """
        A query to compute the sex of persons
        """
        return (
            "SELECT p.main_id, c.name AS sex "
            "FROM characteristic_part c, p2c, persona p "
            "WHERE c.characteristic_id=p2c.characteristic_id "
            f"AND c.type_id={models.Characteristic_Part_Type.PK_sex} "
            "AND p2c.person_id=p.id "
            "AND NOT p2c.disproved "
            "GROUP BY p.main_id, c.name")

    @staticmethod
    def _query_get_parents():
        """
        A query that computes the list of direct parents for a person
        """
        return (
            "SELECT DISTINCT persona.main_id, pp.main_id as parent "
            "FROM persona, p2e, event, p2e p2, persona pp "
            "WHERE event.id=p2e.event_id "
            f"AND p2e.role_id={models.Event_Type_Role.PK_principal} "
            f"AND event.type_id={models.Event_Type.PK_birth} "
            f"AND p2.role_id IN ({models.Event_Type_Role.PK_birth__father},"
            f"{models.Event_Type_Role.PK_birth__mother}) "
            "AND p2e.person_id=persona.id "
            "AND p2.event_id=event.id "
            "AND p2.person_id=pp.id")

    @staticmethod
    def _query_get_children():
        """
        A query that computes the list of direct children for a person
        """
        return (
            "SELECT DISTINCT persona.main_id, pp.main_id as child "
            "FROM persona, p2e, event, p2e p2, persona pp "
            "WHERE event.id=p2e.event_id "
            f"AND p2e.role_id IN ({models.Event_Type_Role.PK_birth__father},"
            f"{models.Event_Type_Role.PK_birth__mother}) "
            f"AND event.type_id={models.Event_Type.PK_birth} "
            f"AND p2.role_id={models.Event_Type_Role.PK_principal} "
            "AND p2e.person_id=persona.id "
            "AND p2.event_id=event.id "
            "AND p2.person_id=pp.id")

    def get_ancestors(self, person_id, max_depth=None, skip=0):
        """
        :returntype: list of AncestorInfo
           This includes person_id itself, at generation 0
        """
        assert isinstance(person_id, int)

        with django.db.connection.cursor() as cur:
            pid = self.cast(person_id, 'bigint')
            zero = self.cast(0, 'bigint')  # ??? do we really need to cast
            initial = f"VALUES({pid}, {zero})"

            md = f"AND ancestors.generation<={max_depth} " if max_depth else ""
            sk = f"WHERE ancestors.generation>{skip} " if skip else ""
            q = (
                "WITH RECURSIVE parents(main_id, parent) AS (" +
                    self._query_get_parents() +
                "), ancestors(main_id,generation) AS ("
                    f"{initial} "
                    "UNION "
                    "SELECT parents.parent, ancestors.generation + 1 "
                    "FROM parents, ancestors "
                    "WHERE parents.main_id = ancestors.main_id "
                    f"{md}"
                ") SELECT ancestors.main_id, ancestors.generation, "
                f"{self.group_concat('parents.parent')} AS parents "
                "FROM ancestors LEFT JOIN parents "
                "ON parents.main_id=ancestors.main_id "
                f"{sk}"
                "GROUP BY ancestors.main_id, ancestors.generation"
            )
            cur.execute(q)

            return [
                AncestorInfo(
                    main_id,
                    generation,
                    [] if not p else [int(a) for a in p.split(',')]
                )
                for main_id, generation, p in cur.fetchall()]

    def get_descendants(self, person_id, max_depth=None, skip=0):
        """
        :returntype: list of DescendantInfo
           This includes person_id itself, at generation 0
        """
        with django.db.connection.cursor() as cur:
            pid = self.cast(person_id, 'bigint')
            zero = self.cast(0, 'bigint')  # ??? do we really need to cast
            initial = f"VALUES({pid}, {zero})"
            md = (
                f"AND descendants.generation<={max_depth} "
                if max_depth else "")
            sk = f"WHERE descendants.generation>{skip} " if skip else ""
            q = (
                "WITH RECURSIVE children(main_id, child) AS (" +
                    self._query_get_children() +
                "), descendants(main_id,generation) as ("
                    f"{initial} "
                    "UNION "
                    "SELECT children.child, descendants.generation + 1 "
                    "FROM children, descendants "
                    "WHERE children.main_id = descendants.main_id "
                    f"{md}"
                ") SELECT descendants.main_id, descendants.generation, "
                f"{self.group_concat('children.child')} AS children "
                "FROM descendants LEFT JOIN children "
                "ON children.main_id=descendants.main_id "
                f"{sk}"
                "GROUP BY descendants.main_id, descendants.generation"
            )
            cur.execute(q)

            return [
                DescendantInfo(
                    main_id,
                    generation,
                    [] if not c else [int(a) for a in c.split(',')]
                )
                for main_id, generation, c in cur.fetchall()]

    def add_ancestors(self, person_id, max_depth=None, skip=0):
        """
        Fetch the list of all ancestors of `person_id`, up until the
        `max_depth` generation.
        Omit all persons with a generation less than `skip`, assuming the
        front-end already has that information.
        """
        assert isinstance(person_id, int)
        ancestors = self.get_ancestors(person_id, max_depth, skip)
        self.add_ids(ids=(a.main_id for a in ancestors))
        for a in ancestors:
            self.layout[a.main_id]['parents'] = a.parents

    def add_descendants(self, person_id, max_depth=None, skip=0):
        """
        Fetch the list of all descendants of `person_id`, up until the
        `max_depth` generation.
        Omit all persons with a generation less than `skip`, assuming the
        front-end already has that information.
        """
        assert isinstance(person_id, int)
        desc = self.get_descendants(person_id, max_depth, skip)
        self.add_ids(ids=(a.main_id for a in desc))
        for a in desc:
            self.layout[a.main_id]['children'] = a.children

    def get_unique_person(self):
        """
        If the set contains a single person, return it
        """
        if len(self.persons) == 1:
            return self.persons[next(iter(self.persons))]
        else:
            return None

    def has_known_parent(self, main_ids=None, sex=None):
        """
        Whether the person has a known father (sex=M) or mother (sex=F).
        :returntype:
           a dict matching the person's main_id and a string containing
           'M', 'F' or ' ' for each parent found
        """
        assert main_ids is None or isinstance(main_ids, list)
        assert sex is None or isinstance(sex, str)

        with django.db.connection.cursor() as cur:
            args = []
            where = []

            if main_ids:
                ids = ','.join(f"{d:d}" for d in main_ids)
                where.append(f"parents.main_id IN ({ids})")

            if sex:
                where.append(f"sex.sex=%s")
                args.append(sex)

            if where:
                where = " AND ".join(where)
                where = f"WHERE {where}"
            else:
                where = ""

            cur.execute(
                "WITH parents AS (" + self._query_get_parents() +
                "), sex AS (" + self._query_get_sex() +
                ") SELECT parents.main_id, sex.sex "
                "FROM parents LEFT JOIN sex "
                f"ON parents.parent=sex.main_id {where}",
                args)

            result = collections.defaultdict(str)
            for person_id, sex in cur.fetchall():
                result[person_id] = result[person_id] + (sex or ' ')

            return result

    def get_from_id(self, id):
        """
        Retrieve a person given the id of one of its base persons.
        If possible this is retrieved from the current set of persons
        """
        assert isinstance(id, int)

        p = self.persons.get(id, None)
        if p is not None:
            return p

        main_id = models.Persona.objects.get(id=id).main_id
        p = self.persons.get(main_id, None)
        if p is not None:
            return p

        self.add_ids([main_id])
        return self.persons[main_id]

    def compute_generations(self, gen_0_ids):
        """
        Compute the generation number for all persons in self, assuming that
        people in `gen_0_ids` are at generation 0 (parents are one generation
        above, children one below.
        This assumes you have called `add_ancestors` or `add_descendants` to
        add the persons.
        """
        generations = {}
        queue = [(self.get_from_id(g).main_id, 0) for g in gen_0_ids]
        while queue:
            main_id, gen = queue.pop(0)
            generations[main_id] = gen

            lay = self.layout.get(main_id)
            if lay is not None:
                queue.extend((p, gen + 1) for p in lay['parents'])
                queue.extend((p, gen - 1) for p in lay['children'])

        return generations

    def fetch_p2e(self, event_types=BMD):
        """
        Fetch all person-to-event relationships for the persons.
        As a side-effect, this sets the birth, death and marriage dates for the
        persons.

        :param event_types: restricts the types of events that are retrieved
        """
        related = ['event', 'role', *models.P2E.related_json_fields()]
        if self.styles and self.styles.need_places:
            related.append('event__place')

        events = models.P2E.objects \
            .filter(disproved=False) \
            .annotate(person_main_id=F('person__main_id'),
                      event_type=F('event__type_id'))
        if event_types:
            events = events.filter(event__type__in=event_types)

        for qs in self.sqlin(events, person__main_id__in=self.persons.keys()):
            for p2e in self.prefetch_related(qs.all(), *related):
                self.asserts.add(p2e)

                if not p2e.disproved \
                   and p2e.role_id == models.Event_Type_Role.PK_principal:

                    e = p2e.event
                    person = self.persons[p2e.person_main_id]

                    if not e.date_sort:
                        pass
                    elif p2e.event_type == models.Event_Type.PK_birth:
                        if person.birthISODate is None or \
                                e.date_sort < person.birthISODate:
                            person.birthISODate = e.date_sort
                    elif p2e.event_type == models.Event_Type.PK_death:
                        if person.deathISODate is None or \
                                e.date_sort > person.deathISODate:
                            person.deathISODate = e.date_sort
                    elif p2e.event_type == models.Event_Type.PK_marriage:
                        person.marriageISODate = e.date_sort

    def fetch_p2c(self):
        """
        Fetch all person-to-characteristic assertions for the given list of
        persons.
        Each assertion receives an extra `person_main_id` field.
        """
        pm = models.P2C.objects \
            .prefetch_related(*models.P2C.related_json_fields()) \
            .filter(disproved=False) \
            .annotate(person_main_id=F('person__main_id'))

        for p2c_set in self.sqlin(pm, person__main_id__in=self.persons.keys()):
            self.asserts.extend(
                self.prefetch_related(p2c_set.all(), 'characteristic__parts'))

    def fetch_p2p(self):
        """
        Fetch all person-to-person relationships.
        This includes relationships for any of the related based personasi
        (so the set of p2p is the one that was used to compute the main
        persona)
        """
        # It is enough to test either person1 or person2, since they both have
        # the same main_id
        pm = models.P2P.objects \
            .filter(person1__in=models.Persona.objects
                       .filter(main_id__in=self.persons.keys())) \
            .select_related(*models.P2P.related_json_fields())
        self.asserts.extend(pm)

    def recompute_main_ids(self):
        """
        Recompute all main_ids in the database (thread-safe).
        Must be called outside of a transaction, or it will be very slow
        """
        with django.db.connection.cursor() as cur:
            q = (
                "WITH RECURSIVE mains(id, main_id) AS ("
                    "SELECT id, id FROM persona "
                    "UNION "
                    "SELECT mains.id, "
                    "CASE WHEN mains.main_id=p2p.person1_id "
                        "THEN p2p.person2_id "
                        "ELSE p2p.person1_id "
                    "END "
                    "FROM mains, p2p "
                    "WHERE mains.main_id IN (p2p.person1_id, p2p.person2_id) "
                    "AND NOT p2p.disproved "
                    f"AND p2p.type_id={models.P2P_Type.sameAs}"
                "), main(id, main_id) AS ("
                    "SELECT id, MIN(main_id) "
                    "FROM mains GROUP BY id"
                ") UPDATE persona "
                "SET main_id=("
                    "SELECT main.main_id FROM main WHERE main.id=persona.id"
                ")"
            )

            try:
                cur.execute("pragma foreign_keys")
                previous = cur.fetchone()[0]

                # Disable foreign key checks, they make the query execute in
                # several minutes instead of a few ms otherwise. This must be
                # done outside of a transaction
                cur.execute("pragma foreign_keys=0")

                with django.db.transaction.atomic():
                    cur.execute(q)
            finally:
                cur.execute("pragma foreign_keys=%s" % previous)

    def _query_asserts(self):
        return [
            table.objects.filter(person__main_id__in=self.persons.keys())
            for table in (models.P2C, models.P2E, models.P2G)
        ] + [models.P2P.objects \
            .filter(Q(person1__main_id__in=self.persons.keys())
                    | Q(person2__main_id__in=self.persons.keys()))
        ]

    def count_asserts(self):
        total = 0
        for a in self._query_asserts():
            total += a.count()
        return total

    def fetch_asserts_subset(self, offset=None, limit=None):
        self.asserts.fetch_asserts_subset(
            self._query_asserts(), offset=offset, limit=limit)
        return self.asserts

    def to_json(self):
        result = {}
        result['persons'] = list(self.persons.values())

        if self.styles:
            result["allstyles"], result["styles"] = self.styles.compute(self)

        if self.layout:
            result['layout'] = self.layout

        return result

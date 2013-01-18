"""An ancestry tree.
This tree stores information on the ancestry tree of one or more persons.
Computing these trees is optimized to reduce the number of SQL queries, by
reusing known data as much as possible.
The tree only contains the ids of the persons, not any other information."""

from django.db.models import Q
from geneapro import models
from geneapro.views.json import to_json
from geneapro.views.queries import sql_in, sql_split
import collections
import logging

__all__ = ["Tree", "SameAs"]

logger = logging.getLogger(__name__)


class SameAs(object):
    """Cache for the sameAs relationship between personas.
       Personas can be linked when they represent the same physical person.
       Computing these links might require several queries (done recursively
       as we discover more linked personas), so this class acts as a cache.
       For each physical person, a single Persona instance will be used to
       contain all events and chacteristics to display (this doesn't impact
       the database, where each persona remains independent).
    """

    def __init__(self):

        # Given a persona_id, contains the persona_id that should be updated
        # to represent the real world person. Only personas where
        #    self._main[id] == (id, "reason")
        # are the toplevel persons and should be shown to the user.

        self._main = dict()

    def compute(self, ids):
        """Compute into the cache the linked personas for IDS.
           If IDS is None, this computes the groups for the whole database.
        """

        m = self._main

        if ids:
            for p in ids:
                m.setdefault(p, (p, None))  # m[p]=p if not already set

        query = models.P2P.objects.filter(
            type=models.P2P.sameAs,
            disproved=False).select_related('surety')

        pid = ids
        processed = set()
        while 1:
            if pid:
                processed.update(pid)
            gen = sql_split(pid)
            pid = set()

            for subids in gen:
                q = query
                if subids:
                    q = q.filter(Q(person1__in=subids) | Q(person2__in=subids))

                for p in q:
                    p1 = m.get(p.person1_id, None)
                    p2 = m.get(p.person2_id, None)

                    if p1 is not None:
                        if p2 is None:
                            m[p.person2_id] = (p1[0], p)
                            if ids and p.person2_id not in processed:
                                pid.add(p.person2_id)
                    else:
                        if p2 is not None:
                            m[p.person1_id] = (p2[0], p)
                            if ids and p.person1_id not in processed:
                                pid.add(p.person1_id)
                        else:
                            m[p.person1_id] = (p.person1_id, None)
                            m[p.person2_id] = (p.person1_id, p)
                            # No need to add to pid, since this can only occur
                            # when querying all personas, and we are not going
                            # to loop anyway.

            if not ids or not pid:
                break

    def main(self, id):
        """Return the id of the persona representing the physical person
           that ID is also associated with.
           You should have called self.compute() first to initialize the
           cache.
        """
        return self._main.setdefault(id, (id, None))[0]

    def is_main(self, id):
        """Whether ID is a main person"""
        return self.main(id) == id

    def main_ids(self, ids):
        """Return the ids of all known main personas (or the ones associated
           with IDS)(ie the one representing each physical person). Among the
           returned ids, not two of them will refer to the same real-world
           person).
           It isn't possible to get an extensive list for all the database
           that way, since personas that are not linked to any other will
           not be returned. Instead, you need to perform an separate db
           query to get all existing personas, call self.compute(None), and
           check whether each persona is a main.
        """
        if ids is None:
            return self._main.keys()

        if not isinstance(ids, collections.Iterable):
            ids = [ids]

        # Start with all direct main persons for personas in IDS
        result = set([self.main(id) for id in ids])

        # Then add all personas that have one of those main personas too
        result.update([id for id, main in self._main.iteritems()
                       if main[0] in result])
        return result

    def main_and_reason(self, id):
        """Return a list of [(id, "reason")] for all persona that represent
           the same physical person as IDS
        """
        # Start with all direct main persons for personas in IDS
        result = self.main_ids([id])
        return [(p, self._main[p][1]) for p in result]


class Tree(object):
   def __init__(self, same=None):
      """Encapsulates the notion of an ancestry tree
         SAME (if specified) must be an instance of SameAs.
      """

      self._same = same or SameAs()

      # List of persons for which we have already computed all ancestors
      self._ancestors = set()
      self._descendants = set()

      # indexed on the person's id, a list of tuples (father, mother)
      self.parents = dict()

      # indexed on the person's id, a list of ids for known children
      self._children = collections.defaultdict(set)

      # all persons for which we have already performed a database query
      self._processed = set()
      self._processed_children = set()

   def _get_events(self, ids, roles):
      """Get the list of events where any of the persons in IDS plays any of
         the roles in ROLES.
         Returns a dictionary indexed on event ids, containing tuples
         (child,father,mother) for the corresponding births.
         All IDS in the result are ids of the main personas.
      """
      self._same.compute(ids)
      logger.info("_get_events, got same(%s)" % ids)
      main_ids = self._same.main_ids(ids)
      logger.info("_get_events, got main_ids")

      # Retrieve the ids of the parents of persons in check. We retrieve
      # parents and child from every birth event (we need the child to
      # associate it with the parents, through the event)

      all_events = models.P2E.objects.filter(
         event__type=models.Event_Type.birth,
         role__in=roles,
         disproved=False).values_list('event', flat=True)
      all_events = sql_in(all_events, "person", main_ids)

      tmp = models.P2E.objects.filter (
         role__in = (models.Event_Type_Role.birth__father,
                     models.Event_Type_Role.principal,
                     models.Event_Type_Role.birth__mother),
         disproved = False).values_list('person', 'event', 'role')

      logger.info("_get_events, computing sql_in")
      tmp = sql_in(tmp, "event", list(all_events))

      events = dict()  # tuples (child, father, mother)
      logger.info("_get_events, now processing all events")

      for p2e in tmp:
          t = events.get (p2e[1], (None, None, None))
          if p2e[2] == models.Event_Type_Role.principal:
             events[p2e[1]] = (self._same.main(p2e[0]) or t[0], t[1], t[2])
          elif p2e[2]== models.Event_Type_Role.birth__father:
             events[p2e[1]] = (t[0], self._same.main(p2e[0]) or t[1], t[2])
          elif p2e[2]== models.Event_Type_Role.birth__mother:
             events[p2e[1]] = (t[0], t[1], self._same.main(p2e[0]) or t[2])

      return events

   def _compute_ancestors(self, id):
      """Look for the ancestors of the person ID.
         ID must be a main persona (see self._same.main())
         Various pieces of information are retrieved, including the flat
         list of ancestors, the specific parents for each individual,...
         Whenever possible, information is reused instead of querying the
         database again.
      """

      if id in self._ancestors:
         return  # already done

      self._ancestors.add(id)

      check = set([id]) # The ones we need to check next time
      check = check.difference(self._processed) # only those we don't know

      while check:
         events = self._get_events(check, (models.Event_Type_Role.principal,))
         self._processed.update(check)

         tmpids = set()   # All persons that are a father or mother
         for e in events.itervalues():
            self.parents[e[0]] = (e[1], e[2])
            if e[1]: tmpids.add(e[1])
            if e[2]: tmpids.add(e[2])

         check = tmpids.difference(self._processed)

   def _compute_descendants(self, id):
      """Look for the descendants of the person ID.
         Whenever possible, information is reused instead of querying the
         database again.
      """

      if id in self._descendants:
         return  # already done

      self._descendants.add(id)

      check = set() # The ones we need to check next time
      check.add(id)
      check = check.difference(self._processed_children)

      while check:
         events = self._get_events(
            check,
            (models.Event_Type_Role.birth__father,
             models.Event_Type_Role.birth__mother))

         tmpids = set()   # All persons that are a father or mother
         self._processed_children.update(check)

         for e in events.itervalues():
            tmpids.add(e[0])
            if e[1]:
               self._children[e[1]].add(e[0])
            if e[2]:
               self._children[e[1]].add(e[0])

         check = tmpids.difference(self._processed_children)

   def father(self, id):
      """Return the id of the father (could be None)."""
      id = self._same.main(id)
      self._compute_ancestors(id)
      return self.parents.get(id, (None, None))[0]

   def mother(self, id):
      """Return the id of the mother (could be None)."""
      id = self._same.main(id)
      self._compute_ancestors(id)
      return self.parents.get(id, (None, None))[1]

   def ancestors(self, id, generations=-1, generations_ignored=-1):
      """The dict of ancestors for ID (value is the number of occurrences),
         up to GENERATIONS.
         This does not include ID itself
         :param generations_ignored: the returned array does not include
            any person from those first few generations, assuming the client
            already known about them. -1 to retrieve all.
      """

      def internal(result, p, current_gen):
         father, mother = self.parents.get(p, (None, None))
         if father and (generations == -1 or current_gen < generations):
             if current_gen >= generations_ignored:
                 result[father] = result.get(father, 0) + 1
             internal(result, father, current_gen + 1)

         if mother and (generations == -1 or current_gen < generations):
             if current_gen >= generations_ignored:
                 result[mother] = result.get(mother, 0) + 1
             internal(result, mother, current_gen + 1)

      if id is None:
         return dict()

      id = self._same.main(id)
      self._compute_ancestors(id) # all ancestors

      result = dict()
      internal(result, id, 0)
      return result

   def generations(self, id):
      """Return a list of tuples. Each tuple corresponds to one generation
         of ancestors, until the last known generation. The first entry is
         id itself.
      """

      id = self._same.main(id)
      self._compute_ancestors(id) # all ancestors

      result = []
      gen = [id]
      while gen:
         current = set()
         for p in gen:
            father, mother = self.parents.get(p, (None, None))
            if father:
                current.add(father)
            if mother:
                current.add(mother)

         if current:
            result.append(tuple(current))
         gen = current

      return result

   def descendants (self, id, generations=-1):
      """The dict of ancestors for ID (value is the number of occurrences),
         up to GENERATIONS.
         This does not include ID itself"""

      def internal (p, gens):
         for c in self._children.get (p, []):
            result [c] = result.get (c, 0) + 1
            if gens != 0: internal (c, gens - 1)

      result = dict ()
      self._compute_descendants (id) # all descendants
      internal (id, generations)
      return result

   def children(self, id):
      """Return the list of children (ids) of the person"""

      self._same.compute([id])
      child_births = models.P2E.objects.filter(
         person__in=self._same.main_ids(id),
         event__type=models.Event_Type.birth,
         disproved=False,
         role__in=(models.Event_Type_Role.birth__father,
                   models.Event_Type_Role.birth__mother))

      p2e = models.P2E.objects.filter(
         event__in=child_births.values_list('event', flat=True),
         disproved=False,
         role__in=(models.Event_Type_Role.principal,
                   models.Event_Type_Role.birth__father,
                   models.Event_Type_Role.birth__mother)) \
         .order_by ('event__date_sort')

      # Need to properly register the parents of the child, for later
      # reuse and proper style highlighting.
      # Note: for a given event, a person might be registered multiple
      # times as the principal, for instance because the gedcom is the result
      # of a merge in some software.

      children = set()
      events = dict ()  # event_id -> (child_id, father_id, mother_id)
      for c in p2e:
         t = events.get (c.event_id, (None, None, None))
         if c.role_id == models.Event_Type_Role.principal:
            p = self._same.main(c.person_id)
            events[c.event_id] = (p, t[1], t[2])
            children.add(p)
         elif c.role_id == models.Event_Type_Role.birth__father:
            p = self._same.main(c.person_id)
            events[c.event_id] = (t[0], p, t[2])
         elif c.role_id == models.Event_Type_Role.birth__mother:
            p = self._same.main(c.person_id)
            events[c.event_id] = (t[0], t[1], p)

      for e in events.itervalues():
         self.parents[e[0]] = (e[1], e[2])

      return list(children)

   def sosa_tree(self, decujus, persons, generations, generations_ignored=-1):
      """Build a sosa tree: this is a dict indexed on the sosa number of the
         person relative to the decujus. The latter is therefore at index 1.
         PERSONS is a dict indexed on person ids, and can contain anything.
         The returned value is
             (tree, marriages)
         where tree is a described above, and marriages is a tree indexed on
         the husband's sosa, and contains marriage event

         :param generations_ignored: the returned array does not include
            any person from those first few generations, assuming the client
            already known about them. -1 to retrieve all gens.
      """

      def internal(sosa, id, current_gen):
          if current_gen > generations_ignored:
              person = persons[id]
              result[sosa] = person

              # If we have a father, register the marriage date as well
              if sosa % 2 == 0 and person.marriage:
                  marriage[sosa] = person.marriage

          if current_gen < generations:
              father_id, mother_id = self.parents.get(id, (None, None))
              if father_id is not None:
                  internal(sosa * 2, father_id, current_gen + 1)
              if mother_id is not None:
                  internal(sosa * 2 + 1, mother_id, current_gen + 1)

      result = dict()
      marriage = dict()
      internal(1, self._same.main(decujus), 0)
      return (result, marriage)


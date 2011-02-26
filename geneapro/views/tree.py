"""An ancestry tree.
This tree stores information on the ancestry tree of one or more persons.
Computing these trees is optimized to reduce the number of SQL queries, by
reusing known data as much as possible.
The tree only contains the ids of the persons, not any other information."""

from mysites.geneapro import models
from mysites.geneapro.views.json import to_json
from mysites.geneapro.views.queries import sql_in

__all__ = ["Tree"]

class Tree (object):
   def __init__ (self):
      """Encapsulates the notion of an ancestry tree"""

      # List of persons for which we have already computed all ancestors
      self._ancestors = set ()
      self._descendants = set ()

      # indexed on the person's id, a list of tuples (father, mother)
      self.parents = dict ()

      # indexed on the person's id, a list of ids for known children
      self._children = dict ()

      # all persons for which we have already performed a database query
      self._processed = set ()
      self._processed_children = set ()

   def _get_events (self, ids, roles):
      """Get the list of events where any of the persons in IDS plays any of
         the roles in ROLES.
         Returns a dictionary indexed on event ids, containing tuples
         (child,father,mother) for the corresponding births.
      """

      # Retrieve the ids of the parents of persons in check. We retrieve
      # parents and child from every birth event (we need the child to
      # associate it with the parents, through the event)

      all_events = models.P2E_Assertion.objects.filter (
         event__type = models.Event_Type.birth,
         role__in = roles,
         disproved = False).values_list('event', flat=True)
      all_events = sql_in(all_events, "person", ids)

      events = [e for e in all_events]

      tmp = models.P2E_Assertion.objects.filter (
         role__in = (models.Event_Type_Role.birth__father,
                     models.Event_Type_Role.principal,
                     models.Event_Type_Role.birth__mother),
         disproved = False).values_list('person', 'event', 'role')
      tmp = sql_in(tmp, "event", events)

      events = dict ()  # tuples (child, father, mother)

      for p2e in tmp:
         t = events.get (p2e[1], (None, None, None))
         if p2e[2] == models.Event_Type_Role.principal:
            events [p2e[1]] = (p2e[0], t[1], t[2])
         elif p2e[2]== models.Event_Type_Role.birth__father:
            events [p2e[1]] = (t[0], p2e[0], t[2])
         elif p2e[2]== models.Event_Type_Role.birth__mother:
            events [p2e[1]] = (t[0], t[1], p2e[0])

      return events

   def _compute_ancestors (self, id):
      """Look for the ancestors of the person ID.
         Various pieces of information are retrieved, including the flat
         list of ancestors, the specific parents for each individual,...
         Whenever possible, information is reused instead of querying the
         database again.
      """

      if id in self._ancestors:
         return  # already done

      self._ancestors.add (id)

      check = set () # The ones we need to check next time
      check.add (id)
      check = check.difference (self._processed) # only those we don't know

      while check:
         events = self._get_events (check, (models.Event_Type_Role.principal,))

         tmpids = set ()   # All persons that are a father or mother
         self._processed.update (check)

         for e in events.itervalues ():
            self.parents [e[0]] = (e[1], e[2])
            if e[1]: tmpids.add (e[1])
            if e[2]: tmpids.add (e[2])

         check = tmpids.difference (self._processed)

   def _compute_descendants (self, id):
      """Look for the descendants of the person ID.
         Whenever possible, information is reused instead of querying the
         database again.
      """

      if id in self._descendants:
         return  # already done

      self._descendants.add (id)

      check = set () # The ones we need to check next time
      check.add (id)
      check = check.difference (self._processed_children)

      while check:
         events = self._get_events (
            check,
            (models.Event_Type_Role.birth__father,
             models.Event_Type_Role.birth__mother))

         tmpids = set ()   # All persons that are a father or mother
         self._processed_children.update (check)

         for e in events.itervalues ():
            tmpids.add (e[0])
            if e[1]:
               if not e[1] in self._children:
                  self._children [e[1]] = set ()
               self._children [e[1]].add (e[0])
            if e[2]:
               if not e[1] in self._children:
                  self._children [e[1]] = set ()
               self._children [e[1]].add (e[0])

         check = tmpids.difference (self._processed_children)

   def father (self, id):
      """Return the id of the father (could be None)."""
      self._compute_ancestors (id)
      return self.parents.get (id, (None, None)) [0]

   def mother (self, id):
      """Return the id of the mother (could be None)."""
      self._compute_ancestors (id)
      return self.parents.get (id, (None, None)) [1]

   def ancestors (self, id, generations=-1):
      """The dict of ancestors for ID (value is the number of occurrences),
         up to GENERATIONS.
         This does not include ID itself"""

      def internal (p, gens):
         father, mother = self.parents.get (p, (None, None))
         if father:
            result [father] = result.get (father, 0) + 1
            if gens != 0: internal (father, gens - 1)
         if mother:
            result [mother] = result.get (mother, 0) + 1
            if gens != 0: internal (mother, gens - 1)

      if id is None:
         return dict ()

      result = dict ()
      self._compute_ancestors (id) # all ancestors
      internal (id, generations)
      return result

   def generations (self, id):
      """Return a list of tuples. Each tuple corresponds to one generation
         of ancestors, until the last known generation. The first entry is
         id itself.
      """

      self._compute_ancestors (id) # all ancestors

      result = []
      gen = [id]
      while gen:
         current = set ()
         for p in gen:
            father, mother = self.parents.get (p, (None, None))
            if father: current.add (father)
            if mother: current.add (mother)

         if current:
            result.append (tuple (current))
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

   def children (self, id):
      """Return the list of children (ids) of the person"""

      child_births = models.P2E_Assertion.objects.filter (
         person = id,
         event__type = models.Event_Type.birth,
         disproved = False,
         role__in = (models.Event_Type_Role.birth__father,
                     models.Event_Type_Role.birth__mother))

      p2e = models.P2E_Assertion.objects.filter (
         event__in = child_births.values_list ('event', flat=True),
         disproved = False,
         role__in  = (models.Event_Type_Role.principal,
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
            events [c.event_id] = (c.person_id, t[1], t[2])
            children.add (c.person_id)
         elif c.role_id == models.Event_Type_Role.birth__father:
            events [c.event_id] = (t[0], c.person_id, t[2])
         elif c.role_id == models.Event_Type_Role.birth__mother:
            events [c.event_id] = (t[0], t[1], c.person_id)

      for e in events.itervalues ():
         self.parents [e[0]] = (e[1], e[2])

      return list(children)

   def sosa_tree (self, decujus, persons, generations):
      """Build a sosa tree: this is a dict indexed on the sosa number of the
         person relative to the decujus. The latter is therefore at index 1.
         PERSONS is a dict indexed on person ids, and can contain anything.
         The returned value is
             (tree, marriages)
         where tree is a described above, and marriages is a tree indexed on
         the husband's sosa, and contains marriage event
      """

      def internal (sosa, person, gens):
         result [sosa] = person

         if person and gens > 0:
            father, mother = self.parents.get (person.id, (None, None))

            if father is not None: father = persons [father]
            if mother is not None: mother = persons [mother]

            internal (sosa * 2, father, gens - 1)
            internal (sosa * 2 + 1, mother, gens - 1)

            if father is not None and mother is not None:
               if father.marriage:
                  marriage [sosa * 2] = father.marriage

      result = dict ()
      marriage = dict ()
      internal (1, persons [decujus], generations)
      return (result, marriage)


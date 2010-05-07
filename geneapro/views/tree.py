"""An ancestry tree.
This tree stores information on the ancestry tree of one or more persons.
Computing these trees is optimized to reduce the number of SQL queries, by
reusing known data as much as possible.
The tree only contains the ids of the persons, not any other information."""

from mysites.geneapro import models

__all__ = ["Tree"]

class Tree (object):
   def __init__ (self):
      """Encapsulates the notion of an ancestry tree"""

      # indexed on the person's id, a set of all its ancestors
      self._ancestors = dict ()

      # indexed on the person's id, a list of tuples (father, mother)
      self.parents = dict ()

      # all persons for which we have already performed a database query
      self._processed = set ()

   def _add_ancestors (self, add_to, start_from, generations=10000):
      """Add into self.ancestors all the ancestors of id that have already
         been searched in the database. There is no need to search them
         again
      """
      check = []
      for p in self.parents.get (start_from, (None, None)):
          if p is not None:
             check.append ((p, generations - 1))

      while check:
         p, gens = check.pop (0)

         # Explicit test of whether we already know about p, to avoid infinite
         # loops (A has parent B has parent A)
         if p not in add_to:
            add_to.add (p)
            if gens > 0:
               for p in self.parents.get (p, (None, None)):
                  if p is not None:
                     check.append ((p, gens - 1))

   def _compute_ancestors (self, id):
      """Look for the ancestors of the person ID.
         Various pieces of information are retrieved, including the flat
         list of ancestors, the specific parents for each individual,...
         Whenever possible, information is reused instead of querying the
         database again.
      """

      if self._ancestors.has_key (id):
         return  # already done

      self._ancestors [id] = set ()
      self._add_ancestors (self._ancestors [id], id)

      check = set () # The ones we need to check next time
      check.add (id)
      check = check.difference (self._processed) # only those we don't know

      # Reuse known data as much as possible: if there is at least one
      # known parent, we know we have already queries that person, so no need
      # to do so again

      while check:
         # Retrieve the ids of the parents of persons in check. We retrieve
         # parents and child from every birth event (we need the child to
         # associate it with the parents, through the event)
         tmp = models.P2E_Assertion.objects.filter (
            role__in = (models.Event_Type_Role.birth__father,
                        models.Event_Type_Role.principal,
                        models.Event_Type_Role.birth__mother),
            event__in = models.P2E_Assertion.objects.filter (
               event__type = models.Event_Type.birth,
               role = models.Event_Type_Role.principal,
               person__in = list (check)).values_list ('event', flat=True))

         tmpids = set ()   # All persons that are a father or mother
         events = dict ()  # tuples (child, father, mother)

         for p2e in tmp.values_list ('person','event','role'):
            t = events.get (p2e[1], (None, None, None))
            if p2e[2] == models.Event_Type_Role.principal:
               events [p2e[1]] = (p2e[0], t[1], t[2])
            elif p2e[2]== models.Event_Type_Role.birth__father:
               events [p2e[1]] = (t[0], p2e[0], t[2])
               tmpids.add (p2e[0])
            elif p2e[2]== models.Event_Type_Role.birth__mother:
               events [p2e[1]] = (t[0], t[1], p2e[0])
               tmpids.add (p2e[0])

         self._processed.update (check)
         check = tmpids.difference (self._processed)

         for e in events:
            e = events[e]
            self.parents [e[0]] = (e[1], e[2])
            if e[1]: self._add_ancestors (self._ancestors [id], e[1])
            if e[2]: self._add_ancestors (self._ancestors [id], e[2])

         self._ancestors [id].update (tmpids)

   def ancestors (self, id, generations=-1):
      """The set of ancestors for ID, up to GENERATIONS.
         This does not include ID itself"""

      self._compute_ancestors (id) # all ancestors
      if generations == -1:
         return self._ancestors [id]

      result = set ()
      self._add_ancestors (result, id, generations)
      return result

   def children (self, id):
      """Return the list of children (ids) of the person"""

      child_births = models.P2E_Assertion.objects.filter (
         person = id,
         event__type = models.Event_Type.birth,
         role__in = (models.Event_Type_Role.birth__father,
                     models.Event_Type_Role.birth__mother))

      p2e = models.P2E_Assertion.objects.filter (
         event__in = child_births.values_list ('event', flat=True),
         role__in  = (models.Event_Type_Role.principal,
                      models.Event_Type_Role.birth__father,
                      models.Event_Type_Role.birth__mother)) \
         .order_by ('event__date_sort')

      # Need to properly register the parents of the child, for later
      # reuse and proper style highlighting

      children = []
      events = dict ()  # event_id -> (child_id, father_id, mother_id)
      for c in p2e:
         t = events.get (c.event_id, (None, None, None))
         if c.role_id == models.Event_Type_Role.principal:
            events [c.event_id] = (c.person_id, t[1], t[2])
            children.append (c.person_id)
         elif c.role_id == models.Event_Type_Role.birth__father:
            events [c.event_id] = (t[0], c.person_id, t[2])
         elif c.role_id == models.Event_Type_Role.birth__mother:
            events [c.event_id] = (t[0], t[1], c.person_id)

      for e in events.itervalues ():
         self.parents [e[0]] = (e[1], e[2])

      return children

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
               if father.marriage_event:
                  marriage [sosa * 2] = father.marriage_event

      result = dict ()
      marriage = dict ()
      internal (1, persons [decujus], generations)
      return (result, marriage)


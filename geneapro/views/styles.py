"""
Configuring styles to use when displaying people and events
Style rules have the following format:

this is a list of simple rules, each of which is one of:
  (RULE_EVENT, [event_test], css)
      and event_test is a list of tuples ("field", "test", "value")
         where "field" is one of "place.name", "date", "type_id",
               "age"   => age of the person at that event
               "count" => count of times where that test matched
           and "test"  is one of RULE_CONTAINS, RULE_IS,...
      These rules are tested once per event in which the person took part,
      whether as principal or as witness. As a result, they are more expensive
      to check than the RULE_ATTR tests.

  (RULE_ATTR, [tests], css)
      format is similar to EVENT, but these are tested on the person,
      not once per event. The "field" would be one of "surname", "given",
      "age","ancestor", "ALIVE", "SEX", "UNKNOWN_FATHER", "UNKNOWN_MOTHER"...
      The "age" is computed from the person's birth, not checking whether that
      person is still alive.
      "ancestor" is true if the person is an ancestor of the person(s) given
      by the RULE_IS or RULE_IN test.

In all cases, css is similar to a W3C style description, ie a
dictionary of key-value pairs that describe the list. The keys
can be any of "color" (text color), "fill" (background color),
"font-weight",...
"""

RULE_EVENT = 0
RULE_ATTR  = 1

RULE_CONTAINS             = 0
RULE_CONTAINS_INSENSITIVE = 1
RULE_IS                   = 2
RULE_IS_INSENSITIVE       = 3
RULE_IS_NOT               = 4
RULE_CONTAINS_NOT_INSENSITIVE = 5

RULE_SMALLER              = 6   # for integers (use RULE_IS for comparison)
RULE_SMALLER_EQUAL        = 7
RULE_GREATER_EQUAL        = 8
RULE_GREATER              = 9

RULE_BEFORE               = 10   # for dates
RULE_AFTER                = 11 
RULE_ON                   = 12

RULE_IN                   = 13   # for sets

__all__ = ["alive", "get_place",
           "Styles",
           "RULE_EVENT", "RULE_ATTR",
           "RULE_CONTAINS", "RULE_CONTAINS_INSENSITIVE", "RULE_IS",
           "RULE_IS_INSENSITIVE", "RULE_BEFORE", "RULE_IN",
           "RULE_IS_NOT", "RULE_GREATER", "RULE_GREATER_EQUAL",
           "RULE_SMALLER", "RULE_SMALLER_EQUAL", "RULE_AFTER",
           "RULE_ON", "RULE_CONTAINS_NOT_INSENSITIVE"]

from mysites.geneapro.utils.date import Date

max_age = 110
# maximum age before we consider a person to be dead

def alive (person):
   """Whether the person is alive"""

   # If we have no birth date, we could assume it is at least 15 years
   # before the first child's birth date (recursively). But that becomes
   # more expensive to compute

   return not person.death \
         and (not person.birth 
             or Date.today().years_since (person.birth.Date) <= max_age)

def get_place (event, part):
   """From an instance of Event, return the name of the place where the
      event occurred.
      PART is one of "name", "country",...
   """
   try:
      if event.place:
         if part == "name":
            return event.place.name
         elif part == "country":
            return event.place.CTRY
      else:
         return None
   except:
      return None

rules_func = (
   lambda exp,value: exp in value,         # CONTAINS
   lambda exp,value: exp in value.lower(), # CONTAINS_INSENSITIVE
   lambda exp,value: value == exp,         # IS
   lambda exp,value: value.lower() == exp, # IS_INSENSITIVE
   lambda exp,value: value != exp,         # IS_NOT
   lambda exp,value: exp not in value.lower(), # CONTAINS_NOT_INSENSITIVE

   lambda exp,value: value < exp,          # SMALLER
   lambda exp,value: value <= exp,         # SMALLER_EQUAL
   lambda exp,value: value >= exp,         # GREATER_EQUAL
   lambda exp,value: value > exp,          # GREATER

   lambda exp,value: value < exp,   # BEFORE
   lambda exp,value: value > exp,   # AFTER
   lambda exp,value: value == exp,  # ON

   lambda exp,value: value in exp,         # IN
)

class Styles ():
   """
   This class is responsible for computing the styles (colors and text
   styles) to apply to personas. It tries to be as efficient as possible
   by caching data when appropriate.
   """

   def __init__ (self, rules, tree):
      """Rules specifies the rules to use for the highlighting."""

      # Preprocess the rules for faster computation

      self.tree  = tree
      self.rules = []
      self.today = Date.today ()
      self.counts = [None] * len (rules)  # the "count" rules: (test, value)
      self._need_place_parts = False

      for index, r in enumerate (rules):
         if r[0] in (RULE_EVENT, RULE_ATTR):
            tests = []
            for t in r[1]:
               if t[0] == "count" and r[0] == RULE_EVENT:
                  # Handled separately at the end
                  self.counts [index] = (rules_func [t[1]], t[2])
                  continue
               elif t[0] == "ancestor" and r[0] == RULE_ATTR:
                  tests.append ((t[0], tree.ancestors (t[2])))
                  continue
               elif t[0].startswith ("place.") and t[0] != "place.name":
                  self._need_place_parts = True

               if t[1] == RULE_CONTAINS_INSENSITIVE \
                  or t[1] == RULE_CONTAINS_NOT_INSENSITIVE \
                  or t[1] == RULE_IS_INSENSITIVE:
                  tests.append ((t[0], rules_func [t[1]], t[2].lower ()))
               elif t[1] == RULE_BEFORE:
                  tests.append ((t[0], rules_func [t[1]], Date (t[2])))
               else:
                  tests.append ((t[0], rules_func [t[1]], t[2]))

            self.rules.append ((r[0], tests, r[2]))
         else:
            print "Unknown rule tag in the style rules: %s" % r

      self.no_match = [0] * len (self.rules)

   def need_place_parts (self):
      """Whether we need extra SQL queries for the place parts"""
      return self._need_place_parts

   def _merge (self, style1, style2):
      """Merge the two styles.
         If a key already exists in style1, it is not overridden.
         Replacement is done in place.
      """
      for a in style2:
         if a not in style1:
            style1[a] = style2[a]
      return style1

   def start (self):
      """Start processing a set of events for different persons
         process() should be called for each event, and then compute()
         for each person
      """

      self.cache = dict ()

   def process (self, person, role, e, sources):
      """Process an event into the cache.
         The event is considered in relation to person. The same event might
         be processed multiple times, for each person that are part of this
         event (principals, witnesses,...)
         SOURCES is the list of source_id corresponding to the event
      """

      if person.id not in self.cache:
         pr1 = self.cache [person.id] = list (self.no_match)
      else:
         pr1 = self.cache [person.id]

      for index,r in enumerate (self.rules):
         if r[0] == RULE_EVENT:
            match = True
            for t in r[1]:
               if t[0] == "age":
                  if person.birth and e.Date:
                     value = e.Date.years_since (person.birth.Date)
                  else:
                     value = None
               elif t[0].startswith("place."):
                  value = get_place (e, t[0][6:])
               elif t[0] == "role":
                  value = role
               elif t[0] == "type":
                  value = e.type_id
               elif t[0] == "date":
                  value = e.Date
               else:
                  print "Error, invalid field: " + t[0]
                  continue

               if value is None \
                 or not t[1] (exp=t[2], value=value):
                  match = False
                  break

            if match:
               pr1[index] = pr1[index] + 1

   def compute (self, person):
      """Sets person.styles to contain the list of styles for that person.
         Nothing is computing if the style is already known.
      """

      styles = {}
      cache = self.cache.get (person.id, self.no_match)

      # We need to process the rules in the same order given by the user
      # since they override each other

      for index, r in enumerate (self.rules):
         if r[0] == RULE_ATTR:
            match = True
            for t in r[1]:
               if t[0] == "surname":
                  value = person.surname
               elif t[0] == "ALIVE":
                  if alive (person):
                     value = "Y"
                  else:
                     value = "N"
               elif t[0] == "UNKNOWN_FATHER":
                  f, m = self.tree.parents.get (person.id, (None, None))
                  if f is None:
                     value = "Y"
                  else:
                     value = "N"
               elif t[0] == "UNKNOWN_MOTHER":
                  f, m = self.tree.parents.get (person.id, (None, None))
                  if m is None:
                     value = "Y"
                  else:
                     value = "N"
               elif t[0] == "SEX":
                  value = person.sex
               elif t[0] == "age":
                  if person.birth:
                     value = self.today.years_since (person.birth.Date)
                  else:
                     value = ""
               elif t[0] == "ancestor":
                  match = person.id in t[1]
                  if not match:
                     break
                  continue
               else:
                  value = None

               if value is None \
                 or not t[1] (exp=t[2], value=value):
                  match = False
                  break
            if match:
               self._merge (styles, r[2])

         else:  # RULE_EVENT
            count = self.counts [index]
            if count is None:
               if cache [index] > 0:
                  self._merge (styles, r[2])
            else:
               # Need to check the count of the events
               if count[0] (exp=count[1], value=cache[index]):
                  self._merge (styles, r[2])

      # Default background value

      person.styles = self._merge (styles, {"fill":"white"})

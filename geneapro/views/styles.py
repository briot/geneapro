"""
Configuring styles to use when displaying people and events
Style rules have the following format:

this is a list of simple rules, each of which is one of:
  (RULE_FLAG, flag_name, flag_value, css)
      where flag_name is one of "ALIVE", "SEX"
        and flag_value is the value the flag should have

  (RULE_EVENT, [event_test], css)
      and event_test is a list of tuples ("field", "test", "value")
         where "field" is one of "place", "date", "type_id", "age"...
           and "test"  is one of RULE_CONTAINS, RULE_IS,...

In all cases, css is similar to a W3C style description, ie a
dictionary of key-value pairs that describe the list. The keys
can be any of "color" (text color), "fill" (background color),
"font-weight",...
"""

RULE_FLAG  = 0
RULE_EVENT = 1

RULE_CONTAINS             = 0
RULE_CONTAINS_INSENSITIVE = 1
RULE_IS                   = 2
RULE_IS_INSENSITIVE       = 3
RULE_IS_NOT               = 4

RULE_SMALLER              = 5   # for integers (use RULE_IS for comparison)
RULE_SMALLER_EQUAL        = 6
RULE_GREATER_EQUAL        = 7
RULE_GREATER              = 8

RULE_BEFORE               = 9   # for dates
RULE_AFTER                = 10 
RULE_ON                   = 11

RULE_IN                   = 12   # for sets

__all__ = ["alive", "Styles",
           "RULE_FLAG", "RULE_EVENT",
           "RULE_CONTAINS", "RULE_CONTAINS_INSENSITIVE", "RULE_IS",
           "RULE_IS_INSENSITIVE", "RULE_BEFORE", "RULE_IN",
           "RULE_IS_NOT", "RULE_GREATER", "RULE_GREATER_EQUAL",
           "RULE_SMALLER", "RULE_SMALLER_EQUAL", "RULE_AFTER",
           "RULE_ON"]

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
              or Date.today().years_since (person.birth) <= max_age)

rules_func = (
   lambda exp,value: exp in value,         # CONTAINS
   lambda exp,value: exp in value.lower(), # CONTAINS_INSENSITIVE
   lambda exp,value: value == exp,         # IS
   lambda exp,value: value.lower() == exp, # IS_INSENSITIVE
   lambda exp,value: value != exp,         # IS_NOT

   lambda exp,value: value < exp,          # SMALLER
   lambda exp,value: value <= exp,         # SMALLER_EQUAL
   lambda exp,value: value >= exp,         # GREATER_EQUAL
   lambda exp,value: value > exp,          # GREATER

   lambda exp,value: Date (value) < exp,   # BEFORE
   lambda exp,value: Date (value) > exp,   # AFTER
   lambda exp,value: Date (value) == exp,  # ON

   lambda exp,value: value in exp,         # IN
)

class Styles ():
   """
   This class is responsible for computing the styles (colors and text
   styles) to apply to personas. It tries to be as efficient as possible
   by caching data when appropriate.
   """

   def __init__ (self, rules):
      """Rules specifies the rules to use for the highlighting."""

      # Preprocess the rules for faster computation

      self.rules = []

      for r in rules:
         if r[0] == RULE_FLAG:
            self.rules.append (r)
         elif r[0] == RULE_EVENT:
            tests = []
            for t in r[1]:
               if t[1] == RULE_CONTAINS_INSENSITIVE \
                  or t[1] == RULE_IS_INSENSITIVE:
                  tests.append ((t[0], rules_func [t[1]], t[2].lower ()))
               elif t[1] == RULE_BEFORE:
                  tests.append ((t[0], rules_func [t[1]], Date (t[2])))
               else:
                  tests.append ((t[0], rules_func [t[1]], t[2]))

            self.rules.append ((RULE_EVENT, tests, r[2]))
         else:
            print "Unknown rule tag in the style rules: %s" % r

      self.no_match = [False] * len (self.rules)

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

   def process (self, person, e):
      """Process an event into the cache.
         The event is considered in relation to person. The same event might
         be processed multiple times, for each person that are part of this
         event (principals, witnesses,...)"""

      if person.id not in self.cache:
         pr1 = self.cache [person.id] = list (self.no_match)
      else:
         pr1 = self.cache [person.id]

      for index,r in enumerate (self.rules):
         # No need to recompute if we already know it is True
         if not pr1[index] and r[0] == RULE_EVENT:
            match = True
            for t in r[1]:
               if t[0] == "age":
                  if person.birth:
                     value = Date (e["date"]).years_since (person.birth)
                     print "Age for person ", person.id, " ", value
                  else:
                     print "No age known for person ", person.id
                     value = None
               else:
                  value = e[t[0]]

               if value is None \
                 or not t[1] (exp=t[2], value=value):
                  match = False
                  break
            pr1[index] = match

   def compute (self, person):
      """Returns the styles to use for that person"""

      styles = {}
      cache = self.cache.get (person.id, self.no_match)

      # We need to process the rules in the same order given by the user
      # since they override each other

      for index, r in enumerate (self.rules):
         if r[0] == RULE_FLAG:
            if r[1] == "ALIVE":
               if (r[2] == "Y" and alive (person)) \
                  or (r[2] == "N" and not alive (person)):
                  self._merge (styles, r[3])
            elif r[1] == "SEX":
               if person.sex == r[2]:
                  self._merge (styles, r[3])
            else:
               print "Unknown flag in the styles rules: %s" % r

         elif r[0] == RULE_EVENT:
            if cache [index]:
               self._merge (styles, r[2])

      # Default background value

      return self._merge (styles, {"fill":"white"})

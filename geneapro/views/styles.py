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
      "age","ancestor", "ALIVE", "SEX", "UNKNOWN_FATHER", "UNKNOWN_MOTHER",
      "IMPLEX", "descendant", ...
      The "age" is computed from the person's birth, not checking whether that
      person is still alive.
      "ancestor" is true if the person is an ancestor of the person(s) given
      by the RULE_IS or RULE_IN test.
      "IMPLEX" is the number of times this person appears in the ancestor tree
      of the current person.

In all cases, css is similar to a W3C style description, ie a
dictionary of key-value pairs that describe the list. The keys
can be any of "color" (text color), "fill" (background color),
"font-weight", "stroke" (border color)...
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

from mysites.geneapro.utils.date import DateRange

max_age = 110
# maximum age before we consider a person to be dead

def alive (person):
   """Whether the person is alive"""

   # If we have no birth date, we could assume it is at least 15 years
   # before the first child's birth date (recursively). But that becomes
   # more expensive to compute

   return not person.death \
         and (not person.birth
             or DateRange.today().years_since(person.birth.Date) <= max_age)

def get_place (event, part):
   """From an instance of Event, return the name of the place where the
      event occurred.
      PART is one of "name", "country",...
   """
   try:
      if event.place:
         if part == "name":
            return event.place.name
         else:
            return event.place.parts.get (part, "")
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


def style_to_css(style):
    """A style as defined in the rules. It behaves like a standard dict,
       but provides additional methods for conversion in various contexts
    """

    st = []
    borderWidth = ""
    borderColor = "black"
    borderStyle = "solid"

    for k, v in style.iteritems():
        if k == "fill":
            k = "background"
        elif k == "stroke":
            borderWidth = borderWidth or "1"  # minimum 1px
            borderColor = v
            k = ""
        elif k == "border-width":
            borderWidth = v
            k = ""
        if k:
            st.append("%s:%s" % (k, v))

    if borderWidth:
        st.append("border-width:%spx" % borderWidth)
        st.append("border-color:%s" % borderColor)
        st.append("border-style:%s" % borderStyle)
    return ";".join(st)


class Styles():
   """
   This class is responsible for computing the styles (colors and text
   styles) to apply to personas. It tries to be as efficient as possible
   by caching data when appropriate.
   """

   def __init__(self, rules, tree, decujus):
      """Rules specifies the rules to use for the highlighting.
      """

      # Preprocess the rules for faster computation

      self.tree  = tree
      self.rules = []
      self.today = DateRange.today()
      self.counts = [None] * len (rules)  # the "count" rules: (test, value)
      self._need_place_parts = False

      self._all_styles = dict () # All required styles (id -> (index,{styles},CSS))
      self.styles_count = 0

      for index, r in enumerate(rules):
         rule_name, rule_type, rule_tests, rule_style = r

         if rule_type in (RULE_EVENT, RULE_ATTR):
            tests = []
            for t in rule_tests:
               if t[0] == "count" and rule_type == RULE_EVENT:
                  # Handled separately at the end
                  self.counts [index] = (rules_func [t[1]], t[2])
                  continue
               elif t[0] == "ancestor" and rule_type == RULE_ATTR:
                  tests.append ((t[0], tree.ancestors (t[2])))
                  continue
               elif t[0] == "descendant" and rule_type == RULE_ATTR:
                  tests.append ((t[0], tree.descendants (t[2])))
                  continue
               elif t[0] == "IMPLEX" and rule_type == RULE_ATTR:
                  tests.append ((t[0], rules_func [t[1]], t[2],
                                 tree.ancestors (decujus)))
                  continue
               elif t[0].startswith ("place.") and t[0] != "place.name":
                  self._need_place_parts = True

               if t[1] == RULE_CONTAINS_INSENSITIVE \
                  or t[1] == RULE_CONTAINS_NOT_INSENSITIVE \
                  or t[1] == RULE_IS_INSENSITIVE:
                  tests.append ((t[0], rules_func [t[1]], t[2].lower ()))
               elif t[1] == RULE_BEFORE:
                  tests.append ((t[0], rules_func [t[1]], DateRange(t[2])))
               else:
                  tests.append ((t[0], rules_func [t[1]], t[2]))

            self.rules.append ((rule_type, tests, rule_style))
         else:
            print "Unknown rule tag in the style rules: %s" % r

      self.no_match = [0] * len (self.rules)

   def need_place_parts (self):
      """Whether we need extra SQL queries for the place parts"""
      return self._need_place_parts

   def start (self):
      """Start processing a set of events for different persons
         process() should be called for each event, and then compute()
         for each person
      """

      self.cache = dict ()

   def process(self, person, role, e):
      """Process an event into the cache.
         The event is considered in relation to person. The same event might
         be processed multiple times, for each person that are part of this
         event (principals, witnesses,...)
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
                     value = e.Date.years_since(person.birth.Date)
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

   def _merge (self, styles, style):
      """Merge style into styles
         If a key already exists in style1, it is not overridden.
         Replacement is done in place.
      """
      for a in style:
         if a not in styles:
            styles[a] = style[a]

   def compute (self, person, as_css=False):
      """Sets person.styles to contain the list of styles for that person.
         Nothing is computing if the style is already known.
         if AS_CSS is True, person.styles is set to a valid CSS style, rather
         than an index into all_styles
      """

      styles = {}
      hashes = 0

      cache    = self.cache.get (person.id, self.no_match)
      tmp_hash = 1

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
               elif t[0] == "IMPLEX":
                  value = t[3].get (person.id, 0)
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
               elif t[0] == "descendant":
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
               hashes    += tmp_hash

         else:  # RULE_EVENT
            count = self.counts [index]
            if count is None:
               if cache [index] > 0:
                  self._merge (styles, r[2])
                  hashes += tmp_hash
            else:
               # Need to check the count of the events
               if count[0] (exp=count[1], value=cache[index]):
                  self._merge (styles, r[2])
                  hashes += tmp_hash

         tmp_hash *= 2

      # Default background value

      if not "fill" in styles:
         styles["fill"] = "white"

      s = self._all_styles.get (hashes, None)
      if not s:
         s = (self.styles_count, styles, style_to_css(styles))
         self._all_styles [hashes] = s
         self.styles_count += 1

      if as_css:
          person.styles = s[2]
      else:
          person.styles = s[0]

   def all_styles (self):
      """The list of all styles needed to render the tree"""
      result = []
      for s in sorted (self._all_styles.itervalues ()):
         result.insert (s[0], s[1])
      return result

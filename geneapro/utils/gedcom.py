"""
This file provides a GEDCOM syntactical parser.
It parses a GEDCOM file, and creates a set of trees in memory corresponding
to the GEDCOM file, without doing any interpretation of this tree.

Example of use:
    ged = Gedcom().parse (file ("myfile.ged"))

The resulting data structure is a GedcomFile, which provides subprograms
to access the various fields.

This package provides minimal error handling: it checks that tags occur as
many times as needed in the standard, and not more. Otherwise an error is
raised. This check is based on the Gedcom 5.5 grammar

This file has no external dependency, except for the _ function which is
used for internationalization.

This parser is reasonably fast, and will parse the ITIS.ged file in 2:45 min
(472_676 individuals)

??? Missing: handling of charsets. We should always convert to utf8 in the
    resulting structure
??? Currently, we reject custom tags (_NAME) for which no specific support
    was added. This is intended: we could accept them in the parser, but then
    the rest of the code would not handle it, and that data would not be
    imported correctly. Better warn the user in such a case
"""

# Use django's translation if possible, else make this file standalone
try:
   from django.utils.translation import ugetNone as _
   _("foo")
except:
   def _(txt): return txt

import re, sys, copy

__all__ = ["Gedcom", "GedcomFile", "GedcomIndi", "GedcomFam", "GedcomRecord",
           "Invalid_Gedcom"]

POINTER_STRING = "(?:[^@]*)"
OPTIONAL_XREF_ID = "(?:@(?P<xref_id>\w" + POINTER_STRING + ")@\s)?"
LINE_RE = re.compile ('^(?P<level>\d+)\s' + OPTIONAL_XREF_ID
                      + '(?P<tag>\w+)' + '(?:\s(?P<value>.*))?')

unlimited = 100000

EVENT_DETAILS = (("TYPE", 0, 1, None),
                 ("DATE", 0, 1, None),
                 ("PLAC", 0, 1, "PLAC"),
                 ("ADDR", 0, 1, "ADDR"),
                 ("PHON", 0, 3, None), # In gedcom: part of ADDR
                 ("AGE",  0, 1, None),  # Age at event
                 ("AGNC", 0, 1, None), # Responsible agency
                 ("CAUS", 0, 1, None), # Cause of event
                 ("SOUR", 0, unlimited, "SOURCE_CITATION"),
                 ("OBJE", 0, unlimited, "OBJE"), # Multimedia link
                 ("NOTE", 0, unlimited, None)) # Note on event
# _grammar is a tuple of tuples, each of which describes one of the nodes
# that the record accepts:
#   (tag_name, min_occurrences, max_occurrences, [handler])
#
# The tag_name field can be either a string or a tuple of strings
# indicating all the tags that are accepted and handled the same way.
#
# The handler field is a string that indicates the name of an entry
# in grammar that contains the valid child nodes. It can be None to indicate
# that the field only contains None data.
# The handler can also be specified itself as a tuple of tuples to describe
# all child nodes.

_GRAMMAR = dict (
    file =  (("HEAD", 1, 1,         "HEAD"),
             ("FAM",  0, unlimited, "FAM"),
             ("INDI", 0, unlimited, "INDI"),
             ("OBJE", 0, unlimited, "OBJE"),
             ("NOTE", 0, unlimited, None),
             ("REPO", 0, unlimited, "REPO"),
             ("SOUR", 0, unlimited, "SOUR"),
             ("SUBM", 0, unlimited, "SUBM"),
             ("SUBN", 0, 1,         "SUBN"),
             ("TRLR", 1, 1,         None)),

    CHAN =  (("DATE", 1, 1,         # Change date
                (("TIME", 0, 1, None),)),
             ("NOTE", 0, unlimited, None)), # note structure

    OBJE =  (("FORM", 1, 1,         None), # Multimedia format
             ("TITL", 0, 1,         None), # Descriptive title
             ("FILE", 1, 1,         None), # Multimedia file reference
             ("NOTE", 0, unlimited, None)),# Note on multimedia object

    SOURCE_CITATION =
            (("TEXT", 0, unlimited, None),      # Text from source
             ("NOTE", 0, unlimited, None),      # Note on source
             ("PAGE", 0, 1,         None),      # Where within source
             ("EVENT", 0, 1,                    # Event type cited from
                (("ROLE", 0, 1,     None),)),   # Role in event
             ("DATA", 0, 1,
                (("DATE", 0, 1,     None),      # Entry recording date
                 ("TEXT", 0, unlimited, None))),# Text from source
             ("QUAY", 0, 1,         None),      # Certainty assessment
             ("OBJE", 0, unlimited, "OBJE"),
             ("NOTE", 0, unlimited, None)),

    ADDR =  (("ADR1", 0, 1, None),  # Address line 1
             ("ADR2", 0, 1, None),  # Address line 2
             ("CITY", 0, 1, None),  # Address city
             ("STAE", 0, 1, None),  # Address state
             ("POST", 0, 1, None),  # Address postal code
             ("CTRY", 0, 1, None)), # Address country

    SOUR =  (("DATA", 0, 1,
                (("EVEN", 0, unlimited, # Event recorded
                    (("DATE", 0, 1, None),       # Date period
                     ("PLAC", 0, 1, "PLAC"))),   # Source jurisdiction place
                 ("AGNC", 0, 1,         None),   # Responsible agency
                 ("NOTE", 0, unlimited, None))), # Note on data
             ("AUTH", 0, 1, None), # Source originator
             ("TITL", 0, 1, None), # Source descriptive title
             ("ABBR", 0, 1, None), # Source filed by entry
             ("PUBL", 0, 1, None), # Source publication facts
             ("TEXT", 0, 1, None), # Text from source
             ("REPO", 0, 1,  # Source repository citation
                (("NOTE", 0, unlimited, None), # Note on repository
                 ("CALN", 0, unlimited,  # Source call number
                    (("MEDI", 0, 1, None),  # Source media type
                )))),
             ("OBJE", 0, unlimited, "OBJE"), # Multimedia link
             ("NOTE", 0, unlimited, None), # Note on source
             ("REFN", 0, unlimited,  # User reference number
                (("TYPE", 0, 1, None),)), # User reference type
             ("RIN", 0, 1, None),        # Automated record id
             ("CHAN", 0, 1,        # Change date
                (("DATE", 1, 1, # Change date
                    (("TIME", 0, 1, None), # Time value
                    )),
                 ("NOTE", 0, unlimited, None), # Note on change date
            ))),

    PLAC =  (("FORM", 0, 1,         None),  # Place hierarchy
             ("SOUR", 0, unlimited, "SOURCE_CITATION"),
             ("NOTE", 0, unlimited, None),
             ("CTRY", 0, 1,         None),  # ??? Gramps addition
             ("CITY", 0, 1,         None),  # ??? Gramps addition
             ("POST", 0, 1,         None),  # ??? Gramps addition
             ("STAE", 0, 1,         None),  # ??? Gramps addition
             ("MAP",  0, 1,                 # ??? Gramps addition
                (("LATI", 1, 1,     None),
                 ("LONG", 1, 1,     None))),
              ),

    INDI =  (("RESN", 0, 1,         None),    # Restriction notice
             ("NAME", 0, unlimited, "NAME"),
             ("SEX",  0, 1,         None),    # Sex value
             (("BIRT", "CHR"), 0, unlimited,
                EVENT_DETAILS
                + (("FAMC", 0, 1, None),)),  # Child to family link
             ("ADOP", 0, unlimited,
                EVENT_DETAILS
                +   (("FAMC", 0, 1,
                        (("ADOP", 0, 1, None),) # Adopted by which parent
                        ),)
             ),
             (("DEAT", "BURI", "CREM",
               "BAPM", "BARM", "BASM", "BLES",
               "CHRA", "CONF", "FCOM", "ORDN", "NATU",
               "EMIG", "IMMI", "CENS", "PROB", "WILL",
               "GRAD", "RETI", "EVEN",
               "CAST",  # Cast name
               "DSCR",  # Physical description
               "EDUC",  # Scholastic achievement
               "IDNO",  # National Id number
               "NATI",  # National or tribal origin
               "NCHI",  # Count of children
               "NMR",   # Count of marriages
               "OCCU",  # Occupation
               "PROP",  # Possessions
               "RELI",  # Religious affiliation
               "RESI",  # Residence
               "SSN",   # Social security number
               "TITL"), # Nobility type title
                 0, unlimited,  # Individual attributes
                 EVENT_DETAILS),

             # +1 <<LDS_INDIVIDUAL_ORDINANCE>>  {0:M}
             ("FAMC", 0, unlimited, None), # Child to family link
             ("FAMS", 0, unlimited, None), # Spouse to family link
             ("SUBM", 0, unlimited, None), # Submitter pointer
             ("ASSO", 0, unlimited,
                (("RELA", 1, 1,         None), # Relation_is descriptor
                 ("NOTE", 0, unlimited, None),
                 ("SOUR", 0, unlimited, "SOURCE_CITATION"))),
             ("ALIA", 0, unlimited, None), # Pointer to INDI
             ("ANCI", 0, unlimited, None), # Pointer to SUBM
             ("DESI", 0, unlimited, None), # Pointer to DESI
             ("SOUR", 0, unlimited, "SOURCE_CITATION"),
             ("OBJE", 0, unlimited, "OBJE"), # Inline object
             # ("OBJE", 0, unlimited, None),   # Multimedia link
             ("NOTE", 0, unlimited, None),
             ("RFN",  0, 1,         None),  # Permanent record file number
             ("AFN",  0, 1,         None),  # Ancestral file number
             ("REFN", 0, unlimited, # User reference number
                (("TYPE", 0, 1, None), # User reference type
                )),
             ("RIN",  0, 1,         None),  # Automated record Id
             ("CHAN", 0, 1,         "CHAN"),  # Change date
             ("FACT", 0, unlimited,  # ??? gramps extension
                (("TYPE", 1, 1,         None), # type of fact ??? gramps
                 ("NOTE", 0, unlimited, None),
                 ("SOUR", 0, unlimited, "SOURCE_CITATION"))),
             ("_MILT", 0, unlimited,  # ??? gramps extension for military
                (("TYPE", 1, 1,         None),
                 ("DATE", 1, 1,         None),
                 ("NOTE", 0, unlimited, None),
                 ("ADDR", 0, 1,         "ADDR"),
                 ("PLAC", 0, 1,         "PLAC"),
                 ("SOUR", 0, unlimited, "SOURCE_CITATION"))),
          ),

    REPO =  (("NAME", 0, 1,         None),   # Name of repository
             ("ADDR", 0, 1,         "ADDR"), # Address of repository
             ("NOTE", 0, unlimited, None),   # Repository notes
             ("REFN", 0, unlimited,          # User reference number
                (("TYPE", 0, 1, None),)),    # User reference type
             ("RIN", 0, 1, None),            # Automated record id
             ("CHAN", 0, 1, "CHAN")),

    FAM =   ((("ANUL", "CENS", "DIV", "DIVF",
               "ENGA", "MARR", "MARB", "MARC",
               "MARL", "MARS",
               "EVEN"), 0, unlimited,
               EVENT_DETAILS 
               +    (("HUSB", 0, 1,
                        (("AGE", 1, 1, None),)), # Age at event
                     ("WIFE", 0, 1,
                        (("AGE", 1, 1, None),)))), # Age at event
             ("HUSB", 0, 1,         None), # xref to INDI
             ("WIFE", 0, 1,         None), # xref to INDI
             ("CHIL", 0, unlimited, None), # xref to children
             ("NCHI", 0, 1,         None), # count of children
             ("SUBM", 0, unlimited, None), # xref to SUBM
             # +1 <<LDS_SPOUSE_SEALING>>  {0:M}
             ("SOUR", 0, unlimited, "SOURCE_CITATION"), # source
             ("OBJE", 0, unlimited, "OBJE"),
             ("NOTE", 0, unlimited, None),
             ("REFN", 0, unlimited, # User reference number
                (("TYPE", 0, 1, None),)), # User reference type
             ("RIN", 0, 1, None),      # Automated record id
             ("CHAN", 0, 1,         "CHAN")),    # Change date

    SUBM =  (("NAME", 1, 1,         "NAME"), # Submitter name
             ("ADDR", 0, 1,         "ADDR"), # Current address of submitter
             ("OBJE", 0, unlimited, "OBJE"), # Multimedia link
             ("LANG", 0, 3,         None),   # Language preference
             ("RFN",  0, 1,         None),   # Submitter registered rfn
             ("RIN",  0, 1,         None),   # Automated record id
             ("PHON", 0, 3,         None),
             ("CHAN", 0, 1,         "CHAN")),# Change date

    SUBN = (("SUBM",  0, 1,         None),
            ("FAMF",  0, 1,         None),   # Name of family file
            ("TEMP",  0, 1,         None),   # Temple code
            ("ANCE",  0, 1,         None),   # Generations of ancestors
            ("DESC",  0, 1,         None),   # Generations of descendants
            ("ORDI",  0, 1,         None),   # Ordinance process flag
            ("RIN",   0, 1,         None)),  # Automated record id

    HEAD =  (("SOUR", 1, 1, # Approved system id
                (("VERS", 0, 1, None), # Version number
                 ("NAME", 0, 1, None), # Name of product
                 ("CORP", 0, 1,  # Name of business
                    (("ADDR", 0, 1, "ADDR"),
                     ("PHON", 0, 3, None))),
                 ("DATA", 0, 1,  # Name of source data
                    (("DATE", 0, 1, None), # Publication date
                     ("COPR", 0, 1, None))), # Copyright source data
                )),
             ("DEST", 0, 1, None),       # Receiving system name
             ("DATE", 0, 1,        # Transmission date
                (("TIME", 0, 1, None),)), # Time value
             ("SUBM", 1, 1, None), # Xref to SUBM
             ("SUBN", 0, 1, None), # Xref to SUBN
             ("FILE", 0, 1, None),       # File name
             ("COPR", 0, 1, None),       # Copyright Gedcom file
             ("GEDC", 1, 1,
                (("VERS", 1, 1, None),   # Version number
                 ("FORM", 1, 1, None))), # Gedcom form
             ("CHAR", 1, 1,       # Character set
                (("VERS", 0, 1, None),)), # Version number
             ("LANG", 0, 1, None),       # Language of text 
             ("PLAC", 0, 1,
                (("FORM", 1, 1, None),)), # Place hierarchy
             ("_HME", 0, 1, None),        # ??? Extension from gedcom torture
             ("NOTE", 0, 1, None)),       # Gedcom content description

    NAME =  (("NPFX", 0, 1,         None),  # Name piece prefix
             ("GIVN", 0, 1,         None),  # Name piece given
             ("NICK", 0, 1,         None),  # Name piece nickname
             ("SPFX", 0, 1,         None),  # Name piece surname prefix
             ("SURN", 0, 1,         None),  # Name piece surname
             ("NSFX", 0, 1,         None),  # Name piece suffix
             ("SOUR", 0, unlimited, "SOURCE_CITATION"),
             ("NOTE", 0, unlimited, None)), # Note
)

class Invalid_Gedcom (Exception):
   def __init__ (self, msg):
      self.msg = msg
   def __str__ (self):
      return self.msg

class _Lexical (object):
   """
   Return lines of the GEDCOM file, taking care of concatenation when
   needed, and potentially skipping levels
   """

   # The components of the tuple returned by readline
   LEVEL   = 0
   TAG     = 1
   XREF_ID = 2
   VALUE   = 3

   def __init__ (self, stream):
      """
      Lexical parser for a GEDCOM file. This returns lines one by one,
      after splitting them into components. This automatically groups
      continuation lines as appropriate
      """
      self.file = stream
      self.level = 0     # Level of the current line
      self.line = 0      # Current line
      self.current_line = None
      self.prefetch = self._parse_next_line () # Prefetched line, parsed
      if self.prefetch:
         if self.prefetch [_Lexical.LEVEL] != 0 \
           or self.prefetch [_Lexical.TAG] != "HEAD":
            raise Invalid_Gedcom (
               "%s Invalid gedcom file, first line must be '0 HEAD'" %
               self.get_location (1))

   def _parse_next_line (self):
      """Fetch the next relevant file of the GEDCOM stream,
         and split it into its fields"""

      self.line = self.line + 1
      # Leading whitespace must be ignored in gedcom files
      line = self.file.readline ().strip ()
      if not line: 
         return None

      g = LINE_RE.match (line)
      if not g:
         raise Invalid_Gedcom (
           "%s Invalid line format: %s" % (self.get_location(1), line))

      return (int (g.group ("level")), g.group ("tag"),
              g.group ("xref_id"), g.group ("value") or "") 

   def get_location (self, offset=0):
      """Return the current parser location
         This is intended for error messages
      """
      return self.file.name + ":" + str (self.line + offset - 1)

   def readline (self, skip_to_level=-1):
      """
      Return the next line (after doing proper concatenation).
      If skip_to_level is specified, skip all lines until the next one at
      the specified level (or higher), ie skip current block potentially
      """
      if not self.prefetch:
         self.current_line = None
         return None

      result = self.prefetch
      if skip_to_level != -1:
         while result \
           and result[_Lexical.LEVEL] > skip_to_level:
            result = self._parse_next_line ()
            self.prefetch = result

      value = result [_Lexical.VALUE]
      self.prefetch = self._parse_next_line ()
      while self.prefetch:
         if self.prefetch [_Lexical.TAG] == "CONT":
            value = value + "\n" + self.prefetch [_Lexical.VALUE]
         elif self.prefetch [_Lexical.TAG] == "CONC":
            value = value + self.prefetch [_Lexical.VALUE]
         else:
            break
         self.prefetch = self._parse_next_line ()

      # It seems that tags are case insensitive
      self.current_line = (result [_Lexical.LEVEL],
                           result [_Lexical.TAG].upper (), 
                           result [_Lexical.XREF_ID],
                           value)
      return self.current_line

class GedcomRecord (object):
   """A Gedcom record (either individual, source, family,...)
      Each record contains one field per valid child node, even if the
      corresponding node did not exist in the file:

      - If the value for this node is always a simple string, it is put as is.
        This does not apply when the Gedcom grammar indicates that a field can
        sometimes be a record with subfields.
          e.g. n   @I0001@ INDI
               n+1 NAME foo /bar/
               n+2 SURN bar
        is accessible as indi.NAME.SURN (a string)
        If in fact this specific field does not occur in the gedcom file, the
        empty string is returned. If the node can be repeated multiple times,
        a list of strings is returned (possibly empty if the node was not in
        the file)

      - If the value is itself a record, it is put in a GedcomRecord
          e.g. n   @I0001@ INDI
               n+1 ASSO @I00002@
               n+2 RELA Godfather    (there is always one and only one)
        is accessible as indi.ASSO
        Often, the record itself has a value (like the id of the
        individual I00002 above), which can be accessed via the "value" key,
        for instance:
           indi.ASSO.value

      - If the field could be repeated multiple times, it is a list:
          e.g. n @I00001 INDI
               n+1 NAME foo /bar/
               n+2 NOTE note1
               n+2 NOTE note2
        You can traverse all notes with
            for s in indi.NAME.NOTE:
               ...
   """

   def __init__ (self):
      self.value = ""

   def deref (self):
      """Returns either self itself, or the record pointed to by self when
         self is a reference to another record
      """
      if obj == None:
         return obj
      elif type (obj) == str \
        and obj and obj[0] == '@' and obj[-1] == '@':
         return self [obj[1:-1]]
      elif type (obj) == list:
         for index, val in enumerate (obj):
            if type (val) == str \
              and val and val[0] == "@" and val[-1] == '@':
               obj[index] = self [val[1:-1]]

class _GedcomParser (object):
   def __init__ (self, name, grammar, all_parsers=dict(),
                 resultType=GedcomRecord):
      self.name = name
      self.result = resultType () # General type of the result
      self.parsers = dict ()      # Parser for children nodes

      for c in grammar:
         names = c[0]
         if isinstance (names, str):
            names = [c[0]]

         for n in names:
            if c[3] is None:  # text only
               handler = None 
            elif isinstance (c[3], str): # ref to one of the toplevel nodes
               handler = all_parsers.get (c[3])
               if handler is None:
                  handler = _GedcomParser (n, _GRAMMAR[c[3]], all_parsers)
                  all_parsers [c[3]] = handler
            else:  # An inline list of nodes
               handler = _GedcomParser (n, c[3])

            self.parsers [n] = (c[1],  # min occurrences
                                c[2],  # max occurrences
                                handler)

            if c[2] > 1:    # A list of record
               self.result.__dict__ [n] = []
            elif handler is None:  # text only
               self.result.__dict__ [n] = None
            else:             # A single record
               self.result.__dict__ [n] = None

   def parse (self, lexical, indent=""):
      result = copy.copy (self.result)
      line   = lexical.current_line

      if line:  # When parsing ROOT, there is no prefetch
         if line [_Lexical.VALUE]:
            result.value = line [_Lexical.VALUE]
         startlevel = line [_Lexical.LEVEL]

         # Register the entity if need be
         #if startlevel == 0 and line [_Lexical.XREF_ID]:
         #   self.ids [line [_Lexical.XREF_ID]] = inst

      else:
         startlevel = -1

      line = lexical.readline () # Children start at next line

      try:
         while line and line [_Lexical.LEVEL] > startlevel:
            tag = line [_Lexical.TAG]
            p = self.parsers [tag]
            if p[2]:
               res = p[2].parse (lexical, indent+" ")
               line = lexical.current_line
            else:
               res = line [_Lexical.VALUE] or ""
               line = lexical.readline ()

            if p[1] == 1:
               if result.__dict__ [tag]:  # None or empty string
                  raise Invalid_Gedcom (
                     "%s Too many occurrences of %s" % 
                        (lexical.get_location(), tag))
               result.__dict__ [tag] = res

            elif p[1] == unlimited:
               result.__dict__ [tag].append (res)

            elif len (result.__dict__ [tag]) < p[1]:
               result.__dict__ [tag].append (res)

            else:
               raise Invalid_Gedcom (
                  "%s Too many occurrences of %s" %
                  (lexical.get_location(), tag))

      except KeyError:
         raise Invalid_Gedcom (
            "%s Invalid tag %s inside %s" %
             (lexical.get_location(), tag, self.name))

      # Check we have reach the minimal number of occurrences

      for tag, p in self.parsers.iteritems ():
         val = result.__dict__ [tag]
         if p[0] != 0 and (val is None or val == ()):
            raise Invalid_Gedcom (
               "%s Missing 1 occurrence of %s in %s" %
               (lexical.get_location(), tag, self.name))
            
         elif p[0] > 1 and len (val) < p[0]:
            raise Invalid_Gedcom (
               "%s Missing %d occurrences of %s in %s" %
               (lexical.get_location(), p[0] - len(val), tag, self.name))

      return result

class GedcomFile (GedcomRecord):
   """Represents a whole GEDCOM file"""
   pass

class GedcomIndi (GedcomRecord):
   """Represents an INDIvidual from a GEDCOM file"""
   pass

class GedcomFam (GedcomRecord):
   """Represents a family from a GEDCOM file"""
   pass

class Gedcom (object):
   """This class provides parsers for GEDCOM files.
      Only one instance of this class should be created even if you want to
      parse multiple GEDCOM files, since the parsers can be reused multiple
      times.
   """

   def __init__ (self):
      # Some parsers will return special types, for clarity
      parsers = dict ()
      parsers ["INDI"] = _GedcomParser (
         "INDI", _GRAMMAR["INDI"], parsers, GedcomIndi)
      parsers ["FAM"] = _GedcomParser (
         "FAM", _GRAMMAR["FAM"], parsers, GedcomFam)

      self.parser = _GedcomParser (
         "file", _GRAMMAR["file"], parsers, GedcomFile) \

   def parse (self, stream):
      """Parse the specified GEDCOM file, check its syntax, and return a
         GedcomFile instance.
         Raise Invalid_Gedcom in case of error."""
      return self.parser.parse (_Lexical (stream))

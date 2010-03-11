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
           "Invalid_Gedcom", "GedcomString"]

POINTER_STRING = "(?:[^@]*)"
OPTIONAL_XREF_ID = "(?:(?P<xref_id>@\w" + POINTER_STRING + "@)\s)?"
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
                 ("OBJE:XREF(OBJE)", 0, unlimited, "MULTIMEDIA_LINK"),
                 ("NOTE", 0, unlimited, None)) # Note on event
# _grammar is a tuple of tuples, each of which describes one of the nodes
# that the record accepts:
#   (tag_name, min_occurrences, max_occurrences, handler)
#
# The tag_name field can be either a string or a tuple of strings
# indicating all the tags that are accepted and handled the same way.
# If the tag_name starts with XREF:, then the GEDCOM file might either
# contain a single xref line for this element ("@...@"), or a record whose
# type is described by handler. If the line must be a xref (and thus cannot
# contain a record), the handle should be "XREF:type", pointing to the pointed
# type. The handle must never be None for a xref line.
# For instance:
#      ("NAME",  0, 1, None)     # pure text
#      ("CHILD", 0, 1, "INDI")   # An inline INDI record
#      ("DATE",  0, 1, (...))    # An inline anonymous record
#      ("CHILD:XREF(INDI)", 0, 1, None) # An xref to an INDI
#      ("CHILD:XREF(INDI)", 0, 1, "INDI") # Either an xref or an inline INDI
#      ("FAMC:XREF(FAM)",  0, 1, (...))   # An xref to FAM, plus inline fields
#
# You cannot specify a list of names when one of them is an XREF.
# In the case where the name in XREF is not the same as the handler, the former
# is supposed to be a superset of the latter.
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
             ("NOTE", 0, unlimited, "NOTE"),
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
             ("FILE", 0, 1,         None), # Multimedia file reference
             ("NOTE", 0, unlimited, None), # Note on multimedia object
             ("BLOB", 1, 1,         None),
             ("OBJE:XREF(OBJE)", 0, 1, None),
             ("REFN", 0, unlimited,
                (("TYPE", 0, 1, None),)),
             ("RIN",  0, 1,         None),
             ("CHAN", 0, 1,         "CHAN")),

    MULTIMEDIA_LINK = 
            (("FORM", 1, 1, None),
             ("TITL", 0, 1, None),
             ("FILE", 1, 1, None),
             ("NOTE", 0, unlimited, None)),

    SOURCE_CITATION =
            (("TEXT", 0, unlimited, None),      # Text from source
             ("NOTE", 0, unlimited, None),      # Note on source
             ("PAGE", 0, 1,         None),      # Where within source
             ("EVEN", 0, 1,                    # Event type cited from
                (("ROLE", 0, 1,     None),)),   # Role in event
             ("DATA", 0, 1,
                (("DATE", 0, 1,     None),      # Entry recording date
                 ("TEXT", 0, unlimited, None))),# Text from source
             ("QUAY", 0, 1,         None),      # Certainty assessment
             ("OBJE:XREF(OBJE)", 0, unlimited, "MULTIMEDIA_LINK"),
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
             ("OBJE:XREF(OBJE)", 0, unlimited, "MULTIMEDIA_LINK"),
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
                + (("FAMC:XREF(FAM)", 0, 1, None),)),  # Child to family link
             ("ADOP", 0, unlimited,
                EVENT_DETAILS
                + (("FAMC:XREF(FAM)", 0, 1,
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

             (("BAPL", "CONL", "ENDL"), 0, unlimited,
               ((("STAT", "DATE", "TEMP", "PLAC"), 0, 1, None),
                ("SOUR", 0, unlimited, "SOURCE_CITATION"),
                ("NOTE", 0, unlimited, None))),

             ("SLGC", 0, unlimited,
               ((("STAT", "DATE", "TEMP", "PLAC"), 0, 1, None),
                ("SOUR", 0, unlimited, "SOURCE_CITATION"),
                ("FAMC:XREF(FAM)", 1, 1, None),
                ("NOTE", 0, unlimited, None))),

             # +1 <<LDS_INDIVIDUAL_ORDINANCE>>  {0:M}
             ("FAMC:XREF(FAM)", 0, unlimited,    # Child to family link
                 (("PEDI", 0, unlimited, None),  # pedigree linkage type
                  ("NOTE", 0, unlimited, None))),
             ("FAMS", 0, unlimited, None), # Spouse to family link
             ("SUBM:XREF(SUBM)", 0, unlimited, None), # Submitter pointer
             ("ASSO", 0, unlimited,
                (("RELA", 1, 1,         None), # Relation_is descriptor
                 ("NOTE", 0, unlimited, None),
                 ("SOUR", 0, unlimited, "SOURCE_CITATION"))),
             ("ALIA:XREF(INDI)", 0, unlimited, None),
             ("ANCI:XREF(SUBM)", 0, unlimited, None),
             ("DESI:XREF(SUBM)", 0, unlimited, None),
             ("SOUR", 0, unlimited, "SOURCE_CITATION"),
             ("OBJE:XREF(OBJE)", 0, unlimited, "MULTIMEDIA_LINK"),
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
             ("PHON", 0, 3,         None),
             ("NOTE", 0, unlimited, None),   # Repository notes
             ("REFN", 0, unlimited,          # User reference number
                (("TYPE", 0, 1, None),)),    # User reference type
             ("RIN", 0, 1, None),            # Automated record id
             ("CHAN", 0, 1, "CHAN")),

    EVENT_FOR_INDI =
            EVENT_DETAILS
            + (("HUSB", 0, 1, (("AGE", 1, 1, None),)),  # Age at event
               ("WIFE", 0, 1, (("AGE", 1, 1, None),))), # Age at event

    FAM =   ((("ANUL", "CENS", "DIV", "DIVF",
               "ENGA", "MARR", "MARB", "MARC",
               "MARL", "MARS",
               "EVEN"), 0, unlimited, "EVENT_FOR_INDI"),
             ("HUSB:XREF(INDI)", 0, 1,         None),
             ("WIFE:XREF(INDI)", 0, 1,         None),
             ("CHIL:XREF(INDI)", 0, unlimited, None), # xref to children
             ("NCHI", 0, 1,         None), # count of children
             ("SUBM:XREF(SUBM)", 0, unlimited, None), # xref to SUBM

             ("SLGS", 0, unlimited,  # LDS spouse sealing
               (("STAT", 0, 1, None), # Spouse sealing Date status
                ("DATE", 0, 1, None), # Date LDS ordinance
                ("TEMP", 0, 1, None), # Templace code
                ("PLAC", 0, 1, None), # Place living ordinance
                ("SOUR", 0, unlimited, "SOURCE_CITATION"),
                ("NOTE", 0, unlimited, None))),

             # +1 <<LDS_SPOUSE_SEALING>>  {0:M}
             ("SOUR", 0, unlimited, "SOURCE_CITATION"), # source
             ("OBJE:XREF(OBJE)", 0, unlimited, "MULTIMEDIA_LINK"),
             ("NOTE", 0, unlimited, None),
             ("REFN", 0, unlimited, # User reference number
                (("TYPE", 0, 1, None),)), # User reference type
             ("RIN", 0, 1, None),      # Automated record id
             ("CHAN", 0, 1,         "CHAN")),    # Change date

    SUBM =  (("NAME", 1, 1,         "NAME"), # Submitter name
             ("ADDR", 0, 1,         "ADDR"), # Current address of submitter
             ("OBJE:XREF(OBJE)", 0, unlimited, "MULTIMEDIA_LINK"),
             ("LANG", 0, 3,         None),   # Language preference
             ("RFN",  0, 1,         None),   # Submitter registered rfn
             ("RIN",  0, 1,         None),   # Automated record id
             ("PHON", 0, 3,         None),
             ("CHAN", 0, 1,         "CHAN")),# Change date

    SUBN = (("SUBM:XREF(SUBM)",  0, 1,    None),
            ("FAMF",  0, 1,         None),   # Name of family file
            ("TEMP",  0, 1,         None),   # Temple code
            ("ANCE",  0, 1,         None),   # Generations of ancestors
            ("DESC",  0, 1,         None),   # Generations of descendants
            ("ORDI",  0, 1,         None),   # Ordinance process flag
            ("RIN",   0, 1,         None)),  # Automated record id

    NOTE = (("SOUR", 0, unlimited, "SOURCE_CITATION"),
            ("REFN", 0, unlimited,
              (("TYPE", 0, 1, None),)),
            ("RIN",  0, 1, None),
            ("CHAN", 0, 1, "CHAN")),

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
             ("SUBM:XREF(SUBM)", 1, 1, None), # Xref to SUBM
             ("SUBN:XREF(SUBN)", 0, 1, None), # Xref to SUBN
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
      self.xref = None

   def _xref_to (self, xref, gedcom):
      """Indicates that the record contains no real data, but is an xref
         to some other record. Accessing the attributes of the record
         automatically dereference the xref, so this is mostly transparent
         to users
      """
      self.xref = xref
      self.gedcom = gedcom

      # We'll need to lookup the attribute in the derefed object.
      # Using __getattribute__ would be called for all attributes, including
      # internal ones like __dict__, and is thus less efficient.
      # However, __getattr__ will only be called if the attribute is not in
      # the directionary, so we remove the keys that are delegated.
      #
      # Note: it is too early to lookup the object in the gedcom file, since
      # it might not have been parsed already. So we'll have to do it in
      # __getattr__

      for key in [k for k in self.__dict__.keys() if k[0].isupper()]:
         del self.__dict__[key]
      del self.__dict__ ['value']

   def __getattr__ (self, name):
      """Automatic dereference (self must be an xref)
         In the case of XREF_AND_INLINE, some attributes are defined both
         in SELF and in the dereferenced record."""
      xref = object.__getattribute__ (self, "xref")
      if xref:
         if name == "_all":
            # Cache the derefenced object
            obj = self.gedcom.ids [xref]
            del self.__dict__ ["gedcom"]  # no longer needed
            self.__dict__ ["_all"] = obj
            return obj

         try:
            return self._all.__getattribute__ (name)
         except AttributeError:
            pass

      return object.__getattribute__ (self, name)

XREF_NONE=0       # No xref allowed
XREF_PURE=1       # A pure xref (only textual value)
XREF_OR_INLINE=2  # Either an xref or an inline record
XREF_AND_INLINE=3 # An xref, with optional additional inline fields

class _GedcomParser (object):
   def __init__ (self, name, grammar, all_parsers, register=None):
      """Parse the grammar and initialize all parsers. This is only
         called once per element in the grammar, and no longer called
         when parsing a gedcom file
      """

      self.name = name

      if register   == "INDI":
         self.result = GedcomIndi ()
      elif register == "FAM":
         self.result = GedcomFam ()
      elif register == "SUBM":
         self.result = GedcomSubm ()
      elif name == "file":
         self.result = GedcomFile ()
      else:
         self.result = GedcomRecord () # General type of the result

      self.parsers = dict ()      # Parser for children nodes

      if register:
         # Register as soon as possible, in case the record contains XREF to
         # itself
         all_parsers [register] = self

      for c in grammar:
         names = c[0]
         type = c[3]

         if isinstance (names, str):
            names = [c[0]]

         n = names[0]
         if n.find (":XREF(") != -1:
            xref_to = n[n.find("(")+1:-1]
            n = n[:n.find (":")]
            names = [n]

            handler = all_parsers.get (xref_to)
            if handler is None:
               handler = _GedcomParser (xref_to, _GRAMMAR[xref_to],
                                        all_parsers, register=xref_to)
            result = handler.result  # The type we are pointing to

            if type is None:
               is_xref = XREF_PURE
               handler = None
            elif isinstance (type, str):
               is_xref = XREF_OR_INLINE

               # xref_to must be a superset of type
               handler = all_parsers.get (type)
               if handler is None:
                  handler = _GedcomParser (type, _GRAMMAR[type], all_parsers,
                                           register=type)

            else:
               is_xref = XREF_AND_INLINE
               handler = _GedcomParser (n, type, all_parsers)

               # The type of the result should be that of xref_to, so that
               # the methods exist. However, the result has more fields,
               # which are those inherited from handler.result.
               # When parsing the file, we should merge the list of fields

         else:
            is_xref=XREF_NONE

            if type is None:  # text only
               handler = None 
               result  = None

            elif isinstance (type, str): # ref to one of the toplevel nodes
               handler = all_parsers.get (type)
               if handler is None:
                  handler = _GedcomParser (type, _GRAMMAR[type], all_parsers,
                                           register=type)
               result = handler.result

            else:  # An inline list of nodes
               handler = _GedcomParser (self.name + ":" + n, type, all_parsers)
               result  = handler.result

            # HANDLER points to the parser for the children, and is null for
            # pure text nodes or pure xref. It will be set if we are expecting
            # an inline record, or either an xref or an inline record. In both
            # cases it has the ability to parse the inline record.
            # IS_XREF is null if the node can be a pointer to a record result.

         for n in names:
            self.parsers [n] = (c[1],  # min occurrences
                                c[2],  # max occurrences
                                handler,
                                is_xref, # type of xref
                                result)

            if c[2] > 1:    # A list of record
               self.result.__dict__ [n] = []
            elif handler is None:  # text only
               self.result.__dict__ [n] = None
            else:             # A single record
               self.result.__dict__ [n] = None


   def parse (self, lexical, gedcomFile=None, indent="   "):
      result = copy.deepcopy (self.result)
      line   = lexical.current_line

      if line:  # When parsing ROOT, there is no prefetch
         if line [_Lexical.VALUE]:
            result.value = line [_Lexical.VALUE]
         startlevel = line [_Lexical.LEVEL]

         # Register the entity if need be
         if startlevel == 0 and line [_Lexical.XREF_ID]:
            gedcomFile.ids [line [_Lexical.XREF_ID]] = result

      else:
         startlevel = -1
         gedcomFile = result

      line = lexical.readline () # Children start at next line

      try:
         while line and line [_Lexical.LEVEL] > startlevel:
            tag = line [_Lexical.TAG]
            p = self.parsers [tag]
            value = line [_Lexical.VALUE]
            xref = p[3]

            if xref != XREF_NONE \
               and value != "" \
               and value[0] == '@' and value[-1] == '@':  # An xref

               if xref == XREF_AND_INLINE:
                  res = p[2].parse (lexical, gedcomFile, indent=indent+"   ")
                  line = lexical.current_line
               else:
                  res = copy.deepcopy (p[4])
                  line = lexical.readline ()

               res._xref_to (value, gedcomFile)

            elif p[2] and xref in (XREF_NONE, XREF_OR_INLINE): # inline record
               res = p[2].parse (lexical, gedcomFile, indent=indent+"   ")
               line = lexical.current_line

            elif xref != XREF_NONE: # we should have had an xref
               raise Invalid_Gedcom (
                  "%s Expecting an xref for %s" % (lexical.get_location(), tag))

            else: # A string, but not an xref (handled above)
               res  = value
               line = lexical.readline ()

            val = result.__dict__ [tag]

            if p[1] == 1:
               if val:  # None or empty string
                  raise Invalid_Gedcom (
                     "%s Too many occurrences of %s" % 
                        (lexical.get_location(), tag))
               result.__dict__ [tag] = res

            elif p[1] == unlimited:
               val.append (res)

            elif len (val) < p[1]:
               val.append (res)

            else:
               raise Invalid_Gedcom (
                  "%s Too many occurrences (%d) of %s (max %d)" %
                  (lexical.get_location(), p[1]+1, tag, len (val)))

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

   def __init__ (self):
      super (GedcomRecord, self).__init__ ()
      self.ids = dict ()

class GedcomIndi (GedcomRecord):
   """Represents an INDIvidual from a GEDCOM file"""
   pass

class GedcomFam (GedcomRecord):
   """Represents a family from a GEDCOM file"""
   pass

class GedcomSubm (GedcomRecord):
   """Represents a SUBM in a GEDCOM file"""
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
      self.parser = _GedcomParser ("file", _GRAMMAR["file"], parsers)

   def parse (self, stream):
      """Parse the specified GEDCOM file, check its syntax, and return a
         GedcomFile instance.
         Raise Invalid_Gedcom in case of error."""
      return self.parser.parse (_Lexical (stream))

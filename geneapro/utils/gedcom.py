"""
This file provides a GEDCOM syntactical parser.
It parses a GEDCOM file, and creates a set of trees in memory corresponding
to the GEDCOM file, without doing any interpretation of this tree.

Example of use:
    ged = Gedcom (file ("myfile.ged"))
    ged.postprocess ()    # Optional
    recs = ged.getRecords ()

The resulting data structure is a dictionary. The keys are the ids that were
found in the GEDCOM file (typically "I0001", "S0001", ...). Each element is
itself a dictionary, for which the keys are the values read in GEDCOM, with
no interpretation. One special key is called 'value' and corresponds to the
value put on the first line that declared the record

    - If the value for this key is a simple string, it is put as it.
        e.g. NAME: {'SURN': 'Smith'}
    - If the value is itself a record, it is put as a dictionary.
        e.g. ASSO: {'RELA': 'Godfather', 'value': '@I0022'}
    - If the field could be repeated multiple times, it is an array of one
        of the two types above:
        e.g. NAME: [{'SURN': 'Smith'}, {'SURN': 'Smayth'}]     

The HEAD part of the Gedcom file is accessible under the "HEAD" key.

This package provides minimal error handling: it checks that tags occur as
many times as needed in the standard, and not more. Otherwise an error is
raised.

This file has no external dependency, except for the _ function which is
used for internationalization.

??? Missing: handling of charsets. We should always convert to utf8 in the
    resulting structure
??? Currently, we reject custom tags (_NAME) for which no specific support
    was added. This is intended: we could accept them in the parser, but then
    the rest of the code would not handle it, and that data would not be
    imported correctly. Better warn the user in such a case
"""

from django.utils.translation import ugettext as _
import re, sys

__all__ = ["Gedcom"]

POINTER_STRING = "(?:[^@]*)"
OPTIONAL_XREF_ID = "(?:@(?P<xref_id>\w" + POINTER_STRING + ")@\s)?"
LINE_RE = re.compile ('^(?P<level>\d+)\s' + OPTIONAL_XREF_ID
                      + '(?P<tag>\w+)' + '(?:\s(?P<value>.*))?')

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

    def __init__ (self, file, error):
        """
        Lexical parser for a GEDCOM file. This returns lines one by one,
        after splitting them into components. This automatically groups
        continuation lines as appropriate
        """
        self.file = file
        self.level = 0     # Level of the current line
        self.line = 0      # Current line
        self.error = error # How to report errors
        self.prefetch = self._parseNextLine () # Prefetched line, parsed
        if self.prefetch:
            if self.prefetch [_Lexical.LEVEL] != 0 \
              or self.prefetch [_Lexical.TAG] != "HEAD":
                self.error.write (self.getLocation (1) + " " +
                    _("Invalid gedcom file, first line must be '0 HEAD'")+"\n")
                self.prefetch = None

    def _parseNextLine (self):
        self.line = self.line + 1
        line = self.file.readline ()
        if not line: return None

        g = LINE_RE.match (line)
        if not g:
            self.error.write (self.getLocation(1) + " " +
                              _("Error, invalid line format") + "\n" + line)
            return None

        return (int (g.group ("level")), g.group ("tag"),
                g.group ("xref_id"), g.group ("value")) 

    def getLocation (self, offset=0):
        return self.file.name + ":" + str (self.line + offset - 1)

    def readline (self, skip_to_level=-1):
        """
        Return the next line (after doing proper concatenation).
        If skip_to_level is specified, skip all lines until the next one at
        the specified level (or higher), ie skip current block potentially
        """
        if not self.prefetch:
            return None

        result = self.prefetch
        if skip_to_level != -1:
            while result \
              and result[_Lexical.LEVEL] > skip_to_level:
                result = self._parseNextLine ()
                self.prefetch = result

        value = result [_Lexical.VALUE]
        self.prefetch = self._parseNextLine ()
        while self.prefetch:
            if self.prefetch [_Lexical.TAG] == "CONT":
                value = value + "\n" + self.prefetch [_Lexical.VALUE]
            elif self.prefetch [_Lexical.TAG] == "CONC":
                value = value + self.prefetch [_Lexical.VALUE]
            else:
                break
            self.prefetch = self._parseNextLine ()

        return (result [_Lexical.LEVEL],
                result [_Lexical.TAG],
                result [_Lexical.XREF_ID],
                value)

event_details = (("TYPE", 0, 1),
                 ("DATE", 0, 1),
                 ("PLAC", 0, 1),
                 ("ADDR", 0, 1),
                 ("PHON", 0, 3), # In gedcom: part of ADDR
                 ("AGE", 0, 1),  # Age at event
                 ("AGNC", 0, 1), # Responsible agency
                 ("CAUS", 0, 1), # Cause of event
                 ("SOUR", 0, 1000000, "SOURCE_CITATION"),
                 ("OBJE", 0, 1000000), # Multimedia link
                 ("NOTE", 0, 1000000)) # Note on event
# _grammar is a tuple of tuples, each of which describes one of the nodes
# that the record accepts:
#   (tag_name, min_occurrences, max_occurrences, [handler])
#
# The tag_name field can be either a string or a tuple of strings
# indicating all the tags that are accepted and handled the same way.
#
# The optional handler field is a string that indicates the name of an entry
# in grammar that contains the valid child nodes. If not defined, the parser
# will use the name of the node directly.
# If this name does not correspond to an entry in the table, it is assumed to
# match a single line in the GEDCOM file, not a record.
#
# The handler can also be specified itself as a tuple of tuples
_grammar = dict (
    ROOT =  (("HEAD", 1, 1),
             ("FAM",  0, 100000),
             ("INDI", 0, 100000),
             ("OBJE", 0, 100000),
             ("NOTE", 0, 100000),
             ("REPO", 0, 100000),
             ("SOUR", 0, 100000),
             ("SUBM", 0, 100000),
             ("TRLR", 1, 1)),

    CHAN =  (("DATE", 1, 1,         # Change date
                (("TIME", 0, 1),)),
             ("NOTE", 0, 1000000)), # note structure

    OBJE =  (("FORM", 1, 1),      # Multimedia format
             ("TITL", 0, 1),      # Descriptive title
             ("FILE", 1, 1),      # Multimedia file reference
             ("NOTE", 0, 100000)),# Note on multimedia object

    SOURCE_CITATION =
            (("TEXT", 0, 1000000),      # Text from source
             ("NOTE", 0, 1000000),      # Note on source
             ("PAGE", 0, 1),            # Where within source
             ("EVENT", 0, 1,            # Event type cited from
                (("ROLE", 0, 1),)),     # Role in event
             ("DATA", 0, 1,
                (("DATE", 0, 1),        # Entry recording date
                 ("TEXT", 0, 100000))), # Text from source
             ("QUAY", 0, 1),            # Certainty assessment
             ("OBJE", 0, 1000000),
             ("NOTE", 0, 1000000)),

    ADDR =  (("ADR1", 0, 1),  # Address line 1
             ("ADR2", 0, 1),  # Address line 2
             ("CITY", 0, 1),  # Address city
             ("STAE", 0, 1),  # Address state
             ("POST", 0, 1),  # Address postal code
             ("CTRY", 0, 1)), # Address country

    SOUR =  (("DATA", 0, 1,
                (("EVEN", 0, 100000, # Event recorded
                    (("DATE", 0, 1),  # Date period
                     ("PLAC", 0, 1))), # Source jurisdiction place
                 ("AGNC", 0, 1),     # Responsible agency
                 ("NOTE", 0, 100000))), # Note on data
             ("AUTH", 0, 1), # Source originator
             ("TITL", 0, 1), # Source descriptive title
             ("ABBR", 0, 1), # Source filed by entry
             ("PUBL", 0, 1), # Source publication facts
             ("TEXT", 0, 1), # Text from source
             ("REPO", 1, 1,  # Source repository citation
                (("NOTE", 0, 100000), # Note on repository
                 ("CALN", 0, 100000,  # Source call number
                    (("MEDI", 0, 1),  # Source media type
                )))),
             ("OBJE", 0, 1000000), # Multimedia link
             ("NOTE", 0, 1000000), # Note on source
             ("REFN", 0, 1000000,  # User reference number
                (("TYPE", 0, 1),)), # User reference type
             ("RIN", 0, 1),        # Automated record id
             ("CHAN", 0, 1,        # Change date
                (("DATE", 1, 1, # Change date
                    (("TIME", 0, 1), # Time value
                    )),
                 ("NOTE", 0, 100000), # Note on change date
            ))),

    PLAC =  (("FORM", 0, 1),  # Place hierarchy
             ("SOUR", 0, 100000, "SOURCE_CITATION"),
             ("NOTE", 0, 100000),
             ("CTRY", 0, 1),  # ??? Gramps addition
             ("CITY", 0, 1),  # ??? Gramps addition
             ("POST", 0, 1),  # ??? Gramps addition
             ("STAE", 0, 1),  # ??? Gramps addition
             ("MAP",  0, 1,  # ??? Gramps addition
                (("LATI", 1, 1),
                 ("LONG", 1, 1))),
              ),

    INDI =  (("RESN", 0, 1),    # Restriction notice
             ("NAME", 0, 1),
             ("SEX",  0, 1),    # Sex value
             (("BIRT", "CHR"), 0, 1000000,
                event_details
                + (("FAMC", 0, 1),)),  # Child to family link
             ("ADOP", 0, 100000,
                event_details
                +   (("FAMC", 0, 1,
                        (("ADOP", 0, 1),) # Adopted by which parent
                        ),)
             ),
             (("DEAT", "BURI", "CREM",
               "BAPM", "BARM", "BASM", "BLES",
               "CHRA", "CONF", "FCOM", "ORDN", "NATU",
               "EMIG", "IMMI", "CENS", "PROB", "WILL",
               "GRAD", "RETI", "EVEN"), 0, 1000000,
                event_details),  # Events

             (("CAST",  # Cast name
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
                 0, 100000,  # Individual attributes
                 event_details),

             # +1 <<LDS_INDIVIDUAL_ORDINANCE>>  {0:M}
             ("FAMC", 0, 100000), # Child to family link
             ("FAMS", 0, 100000), # Spouse to family link
             ("SUBM", 0, 1000000), # Submitter pointer
             ("ASSO", 0, 1000000,
                (("RELA", 1, 1), # Relation_is descriptor
                 ("NOTE", 0, 1000000),
                 ("SOUR", 0, 1000000, "SOURCE_CITATION"))),
             ("ALIA", 0, 1000000), # Pointer to INDI
             ("ANCI", 0, 1000000), # Pointer to SUBM
             ("DESI", 0, 1000000), # Pointer to DESI
             ("SOUR", 0, 1000000, "SOURCE_CITATION"),
             ("OBJE", 0, 1000000), # Multimedia link
             ("NOTE", 0, 1000000),
             ("RFN", 0, 1),  # Permanent record file number
             ("AFN", 0, 1),  # Ancestral file number
             ("REFN", 0, 1000000, # User reference number
                (("TYPE", 0, 1), # User reference type
                )),
             ("RIN", 0, 1),  # Automated record Id
             ("CHAN", 0, 1),  # Change date
             ("FACT", 0, 100000,  # ??? gramps extension
                (("TYPE", 1, 1), # type of fact ??? gramps
                 ("NOTE", 0, 1000000),
                 ("SOUR", 0, 1000000, "SOURCE_CITATION"))),
             ("_MILT", 0, 10000,  # ??? gramps extension for military
                (("TYPE", 1, 1),
                 ("DATE", 1, 1),
                 ("NOTE", 0, 1000000),
                 ("PLAC", 0, 1),
                 ("SOUR", 0, 1000000, "SOURCE_CITATION"))),
          ),

    REPO =  (("NAME", 0, 1),  # Name of repository
             ("ADDR", 0, 1),  # Address of repository
             ("NOTE", 0, 100000), # Repository notes
             ("REFN", 0, 100000, # User reference number
                (("TYPE", 0, 1),)), # User reference type
             ("RIN", 0, 1),   # Automated record id
             ("CHAN", 0, 1)),

    FAM =   ((("ANUL", "CENS", "DIV", "DIVF",
               "ENGA", "MARR", "MARB", "MARC",
               "MARL", "MARS",
               "EVEN"), 0, 100000,
               event_details 
               +    (("HUSB", 0, 1,
                        (("AGE", 1, 1),)), # Age at event
                     ("WIFE", 0, 1,
                        (("AGE", 1, 1),)))), # Age at event
             ("HUSB", 0, 1),  # xref to INDI
             ("WIFE", 0, 1),  # xref to INDI
             ("CHIL", 0, 100000), # xref to children
             ("NCHI", 0, 1),      # count of children
             ("SUBM", 0, 100000), # xref to SUBM
             # +1 <<LDS_SPOUSE_SEALING>>  {0:M}
             ("SOUR", 0, 100000, "SOURCE_CITATION"), # source
             ("OBJE", 0, 100000),
             ("NOTE", 0, 100000),
             ("REFN", 0, 100000, # User reference number
                (("TYPE", 0, 1),)), # User reference type
             ("RIN", 0, 1),      # Automated record id
             ("CHAN", 0, 1)),    # Change date

    SUBM =  (("NAME", 1, 1), # Submitter name
             ("ADDR", 0, 1), # Current address of submitter
             ("OBJE", 0, 100000), # Multimedia link
             ("LANG", 0, 3),      # Language preference
             ("RFN", 0, 1),       # Submitter registered rfn
             ("RIN", 0, 1),       # Automated record id
             ("CHAN", 0, 1)),    # Change date

    HEAD =  (("SOUR", 1, 1, # Approved system id
                (("VERS", 0, 1), # Version number
                 ("NAME", 0, 1), # Name of product
                 ("CORP", 0, 1,  # Name of business
                    (("ADDR", 0, 1),)),
                 ("DATA", 0, 1,  # Name of source data
                    (("DATE", 0, 1), # Publication date
                     ("COPR", 0, 1))), # Copyright source data
                )),
             ("DEST", 0, 1),       # Receiving system name
             ("DATE", 0, 1,        # Transmission date
                (("TIME", 0, 1),)), # Time value
             ("SUBM", 1, 1),       # Xref to SUBM
             ("SUBN", 0, 1),       # Xref to SUBN
             ("FILE", 0, 1),       # File name
             ("COPR", 0, 1),       # Copyright Gedcom file
             ("GEDC", 1, 1,
                (("VERS", 1, 1),   # Version number
                 ("FORM", 1, 1))), # Gedcom form
             ("CHAR", 1, 1,       # Character set
                (("VERS", 0, 1),)), # Version number
             ("LANG", 0, 1),       # Language of text 
             ("PLAC", 0, 1,
                (("FORM", 1, 1),)), # Place hierarchy
             ("NOTE", 0, 1)),       # Gedcom content description

    NAME =  (("NPFX", 0, 1),  # Name piece prefix
             ("GIVN", 0, 1),  # Name piece given
             ("NICK", 0, 1),  # Name piece nickname
             ("SPFX", 0, 1),  # Name piece surname prefix
             ("SURN", 0, 1),  # Name piece surname
             ("NSFX", 0, 1),  # Name piece suffix
             ("SOUR", 0, 100000, "SOURCE_CITATION"),
             ("NOTE", 0, 100000)), # Note
)

class Gedcom (object):
    def __init__ (self, file, error=sys.stderr):
        """
        Creates a new Gedcom parser, that will parse file. Error messages
        will be written to error. The file is parsed immediately.
        """

        # Stack of handlers. Current one is at index 0
        self.handlers = [[-1, 'root', _grammar["ROOT"], dict()]]
        self.ids = dict () # Registered entities with xref_id
        self.error = error
        self.lexical = _Lexical (file=file, error=error)
        self._parse ()

    def getRecords (self):
        """
        Return the records read from the GEDCOM tree.
        """
        return self.ids

    def _findHandlerClass (self, tag):
        """
        Return the handler to use for the given tag. This handler is found
        by looking at the subtags attribute of the current handler
        """

        level, parentTag, subtags, record = self.handlers [0]
        if subtags != None:
            for child in subtags:
                if type (child[0]) == str:
                    matches = tag == child[0]
                elif type (child[0]) == tuple:
                    matches = tag in child[0]

                if matches:

                    # Verify minimum and maximum usage count

                    if len (child) >= 4:
                        child = (child[0], child[1] - 1, child[2] - 1, child[3])
                    else:
                        child = (child[0], child[1] - 1, child[2] - 1)

                    if child [2] < 0:
                        self.error.write (self.lexical.getLocation() + " " +
                          _("Too many occurrences of %(tag)s") % {'tag':tag} +
                          "\n")

                    # Find handler

                    if len (child) >= 4:
                        if type (child[3]) == str:
                            return _grammar [child[3]]
                        elif type (child[3]) == tuple:
                            return child[3]

                    # Do we have a class specific for handling these Tags ?
                    # If not, default to a simple string
                    try:
                        return _grammar [tag]
                    except KeyError:
                        return () # Doesn't accept subchildren

        self.error.write (self.lexical.getLocation() + " " + 
                          _("%(parent)s doesn't accept child tag %(child)s")
                          % {'parent':parentTag, 'child':tag} + "\n")
        return None

    def _parse (self):
        """
        Do the actual parsing
        """
        skip_to_level = -1

        while True:
            l = self.lexical.readline (skip_to_level=skip_to_level)
            if not l: break

            # If we have moved one level up, pass the current handler to its
            # parent

            while self.handlers and l [_Lexical.LEVEL] <= self.handlers [0][0]:
                if len (self.handlers) > 2:
                    parentInst = self.handlers[1][3]
                    subtags    = self.handlers[1][2]
                    childInst  = self.handlers[0][3]
                    childTag   = self.handlers[0][1]

                    # Check minimum number of nested node is satisfied

                    has_error = False
                    for s in subtags:
                        if s[1] > 0:
                            self.error.write (self.lexical.getLocation()+" "+
                                _("Missing %(count)d occurrences of %(tag)s")
                                % {'count':s[1], 'tag':s[0]} + "\n")
                            has_error = True

                    if has_error:
                        self.ids = None
                        return

                    # If the child has a single 'value' key, it means there
                    # was not subrecord, and we simplify it a bit then by
                    # only storing the string

                    if len (childInst) == 1 and childInst.has_key ('value'):
                        childInst = childInst ['value']

                    # Now append the child to its parent

                    try:
                        existing = parentInst [childTag]
                        if type (existing) == list:
                            existing.append (childInst)
                        else:
                            parentInst [childTag] = [existing, childInst]
                    except KeyError:
                        parentInst [childTag] = childInst

                self.handlers.pop (0)

            skip_to_level = -1
            subtags = self._findHandlerClass (l [_Lexical.TAG])
            if subtags != None:
                if l[_Lexical.VALUE]:
                    inst = dict (value = l[_Lexical.VALUE])
                else:
                    inst = dict ()

                # Register the entity if need be
                if l [_Lexical.XREF_ID]:
                    self.ids [l [_Lexical.XREF_ID]] = inst
                elif l [_Lexical.TAG] == "HEAD":
                    self.ids ["HEAD"] = inst

                # Push the new handler on the stack so that it gets lower
                # level info
                self.handlers.insert (
                    0, (l [_Lexical.LEVEL], l [_Lexical.TAG], subtags, inst))
                
            else:
                skip_to_level = l [_Lexical.LEVEL]

    def _postprocessRecord (self, rec):
        for key, value in rec.iteritems():
            if type (value) == str \
              and value and value[0] == '@' and value[-1] == '@':
                rec[key] = self.ids [value[1:-1]]   
            elif type (value) == list:
                for index, val in enumerate (value):
                    if type (val) == str \
                      and val and val[0] == "@" and val[-1] == '@':
                        value[index] = self.ids [val[1:-1]]
                    elif type (val) == dict:
                        self._postprocessRecord (val)
            elif type (value) == dict:
                self._postprocessRecord (value)

    def postprocess (self, record=None):
        """
        Postprocess a specific record (or the whole tree), replacing all
        pointers by the actual data they point to. This makes it easier
        to process the tree for other tools, but hides whether structures
        were referenced inline or through a pointer
        """
        if record:
            self._postprocessRecord (record)
        else:
            for rec in self.ids:
                self._postprocessRecord (self.ids[rec])


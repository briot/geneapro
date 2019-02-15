"""
This file provides a GEDCOM syntactical parser.
It parses a GEDCOM file, and creates a tree in memory corresponding
to the GEDCOM file, without doing any interpretation of this tree.

Example of use:
    ged = Gedcom().parse("myfile.ged")

The resulting data structure is a GedcomFile, which provides subprograms
to access the various fields.

This package provides minimal error handling: it checks that tags occur as
many times as needed in the standard, and not more. Otherwise an error is
raised. This check is based on the Gedcom 5.5.1 grammar

Performance:
   parses Royal92-Famous European Royalty Gedcom.ged
      0.198s

   Catalog of life database (1_275_735 species, 2.1 million individuals)
   http://famousfamilytrees.blogspot.se/2008/07/species-family-trees.html
      42.78s

"""

import logging
import sys
import time


logger = logging.getLogger('geneaprove.gedcom')
unlimited = -1


class Invalid_Gedcom(Exception):

    def __init__(self, msg):
        super().__init__(self)
        self.msg = msg

    def __repr__(self):
        return self.msg


class _File(object):
    def __init__(self, filename):
        # Reading from './manage.py import', we get a string
        if isinstance(filename, str):
            # Do not assume a specific encoding, so read as bytes
            f = open(filename, "rb")
            self.buffer = f.read()
            f.close()
            self.name = filename
        else:
            # From the GUI client, we get a django file object
            self.buffer = filename.read()
            self.name = '<stdin>'

        self.pos = 0

    def readline(self):
        """
        Return the next line, omitting the \n, \r or \r\n terminator
        """
        p = self.pos
        if p is None or p >= len(self.buffer):
            return None

        while True:
            c = self.buffer[p]
            if c == 10:
                result = self.buffer[self.pos:p]
                self.pos = p + 1
                return result
            elif c == 13:
                result = self.buffer[self.pos:p]
                self.pos = p + 1
                if self.pos < len(self.buffer) and self.buffer[self.pos] == 10:
                    self.pos += 1
                return result
            p += 1
            if p >= len(self.buffer):
                result = self.buffer[self.pos:]
                self.pos = None
                return result


class _Lexical(object):
    """Return lines of the GEDCOM file, taking care of concatenation when
       needed, and potentially skipping levels
    """

    FIELD_TAG = 2
    FIELD_XREF_ID = 3
    FIELD_VALUE = 4

    def __init__(self, stream, print_warning):
        """Lexical parser for a GEDCOM file. This returns lines one by one,
           after splitting them into components. This automatically groups
           continuation lines as appropriate
        """
        self.file = stream
        self.level = 0     # Level of the current line
        self.line = 0      # Current line
        self.print_warning = print_warning

        self.encoding = 'iso_8859_1'
        self.decode = self.decode_any

        l = self.file.readline()
        if self.line == 1 and line[0:3] == "\xEF\xBB\xBF":
            self.encoding = 'utf-8'
            l = l[3:]

        self.current = None # current line, after resolving CONT and CONC
        self.prefetch = self._parse_line(l)
        if self.prefetch[1] != 0 or \
           self.prefetch[2] != 'HEAD':
            self.error("Invalid gedcom file, first line must be '0 HEAD' got %s"
                       % (l, ),
                       fatal=True)

        self._readline()

    def decode_heredis_ansi(self, value):
        value = value.replace(bytes([135]), bytes([225]))  # a-acute
        value = value.replace(bytes([141]), bytes([231]))  # c-cedilla
        return value.decode('iso-8859-1', "replace")

    def decode_any(self, value):
        return value.decode(self.encoding, "replace")

    def error(self, msg, fatal=False, line=None):
        m = "%s:%s %s" % (self.file.name, line or self.line, msg)
        if fatal:
            raise Invalid_Gedcom(m)
        else:
            self.print_warning(m)

    def _parse_line(self, line):
        """
        Parse one line into its components
        """
        self.line += 1
        if not line:
            return

        # The standard limits the length of lines, but some software ignore
        # that, like Reunion on OSX for instance (#20)
        # The call to split gets rid of leading and trailing whitespaces

        line = self.decode(line).split('\n')[0]
        g = line.split(None, 2)   # Extract first three fields
        if len(g) < 2:
            self.error("Invalid line '%s'" % line, fatal=True)

        if g[1][0] == '@':
            # "1 @I0001@ INDI"
            # "1 @N0001@ NOTE value"
            tag_and_val = g[2].split(None, 1)
            r = (self.line,
                 int(g[0]),                     # level
                 tag_and_val[0],                # tag
                 g[1],                          # xref_id
                 tag_and_val[1] if len(tag_and_val) == 2 else '') # value
        else:
            # "2 RESI where"
            r = (self.line,
                 int(g[0]),                     # level
                 g[1],                          # tag
                 None,                          # xref_id
                 g[2] if len(g) == 3 else '')   # value

        if r[1] == 1 and r[2] == "CHAR":
            if r[4] == "ANSEL":
                self.encoding = "iso-8859-1"
                self.decode = self.decode_any
            elif r[4] == "ANSI":
                # ??? Heredis specific
                self.encoding = "heredis-ansi"
                self.decode = self.decode_heredis_ansi
            elif r[4] == "UNICODE":
                self.encoding = "utf-16"
                self.decode = self.decode_any
            elif r[4] == "UTF-8":
                self.encoding = "utf-8"
                self.decode = self.decode_any
            elif r[4] == "ASCII":
                self.encoding = "ascii"
                self.decode = self.decode_any
            else:
                self.error('Unknown encoding %s' % (r[4], ))

        return r

    def peek(self):
        # logger.debug('MANU %s', self.current)
        return self.current

    def consume(self):
        c = self.current
        # logger.debug('MANU %s', self.current)
        self._readline()
        return c

    def _readline(self):
        if not self.prefetch:
            self.current = (self.line + 1, -1, None, None, None)
            return

        result = self.prefetch
        value = result[_Lexical.FIELD_VALUE]
        self.prefetch = self._parse_line(self.file.readline())

        while self.prefetch:
            if self.prefetch[_Lexical.FIELD_TAG] == "CONT":
                value += "\n"
                value += self.prefetch[_Lexical.FIELD_VALUE]
            elif self.prefetch[_Lexical.FIELD_TAG] == "CONC":
                value += self.prefetch[_Lexical.FIELD_VALUE]
            else:
                break

            self.prefetch = self._parse_line(self.file.readline())

        # It seems that tags are case insensitive
        self.current = (result[0],
                         result[1],
                         result[_Lexical.FIELD_TAG].upper(),
                         result[_Lexical.FIELD_XREF_ID],
                         value)


class GedcomRecord(object):

    def __init__(self, line, tag, id=None, value='', fields=None):
        """
        Return of parsing one line of gedcom.
        :param int linenum: line number where this occurs
        :param str tag: the tag
        :param str|None value: the value after the tag, unless it was a
            xref. This is None if gedcom does not allow a value for this tag.
        """
        self.line = line
        self.tag = tag
        self.value = value

        if fields is None:
            self.fields = []
        else:
            self.fields = fields   # array of GedcomRecord, in file order
        self.xref = None   # points to one of the dict(), used to resolve xref
        self.id = id

    def __repr__(self):
        return "GedcomRecord(tag=%s,line=%s)" % (self.tag, self.id)

    def as_xref(self):
        """
        Report the ID of the object that self points to, or None.
        The caller is responsible for knowing whether this point to an INDI,
        a SOUR,...
        """
        if self.value and self.value[0] == '@':
            return self.value
        return None


class F(object):

    def __init__(self, tag, min, max, text="", children=None):
        """
        Describes one field of the grammar
        :param str tag: the tag found at the beginning of the line.
        :param int min: the minimal number of occurrences within parent
        :param int max: the maximum number of occurrences within parent
        :param str|None text:
            None indicates that no text value is expected
            "Y" indicates that the only valid values are "Y" or null,
              to indicate that an event took place, with no additional info
            "" indicates that some textual value is expected
            "INDI" indicates an xref to an INDI field is expected, or inline
               textual value
        :param None|list children:
            list of F objects that can be found as children. You can also
            use tag names instead of F objects, they will be looked up
            later.
            CONT and CONC children are always handled automatically and do
            not need to appear in this grammar.
        """
        assert isinstance(min, int)
        assert isinstance(max, int)
        assert children is None or isinstance(children, list)

        self.tag = tag
        self.min = min
        self.max = max
        self.text = text
        if children is None:
            self.children = None
        else:
            self.children = {c.tag: c for c in children}

    def parse(self, lexical):
        """
        Read current line from lexical parser, and process it.
        This doesn't modify self, and is fully reentrant
        """

        if self.tag:
            (linenum, level, tag, id, value) = lexical.consume()
            assert tag == self.tag, '%s != %s' % (tag, self.tag)
        else:
            # special case for toplevel FILE
            linenum = 0
            id = None
            value = ''
            tag = ''
            level = -1

        tags = {}    # tag -> number of times children were seen
        val = value
        has_xref = False

        if self.text is None:
            if value:
                lexical.error(
                    "Unexpected text value after %s" % tag,
                    line=linenum,
                    fatal=False)
            val = None

        elif self.text == "Y":
            # Gedcom standard says value must be "Y", but PAF also uses "N".
            # The tag should simply not be there in this case
            if value and value not in ("Y", "N"):
                lexical.error(
                    "Unexpected text value after %s, expected 'Y'" % tag,
                    line=linenum,
                    fatal=False)

        elif self.text == "":
            pass   # allow any text

        else:
            has_xref = value != ''

        r = GedcomRecord(id=id, line=linenum, tag=tag, value=val)

        while True:
            (clinenum, clevel, ctag, cid, cval) = lexical.peek()
            if clevel <= level:
                break

            # if has_xref:
            #     lexical.error(
            #         'Unexpected %s in xref' % ctag,
            #         line=clinenum,
            #         fatal=True)

            if self.children is None:
                cdescr = None
            else:
                cdescr = self.children.get(ctag, None)

            count = tags[ctag] = tags.setdefault(ctag, 0) + 1

            if cdescr is None:
                if ctag[0] == '_':
                    # A custom tag is allowed, and should accept anything
                    lexical.error(
                        "Custom tag ignored: %s" % ctag,
                        line=clinenum)
                else:
                    lexical.error(
                        "Unexpected tag: %s" % ctag,
                        line=clinenum,
                        fatal=True)

                # skip this record (should be a special type of F)
                while True:
                    (i, l, t, i, v) = lexical.consume()  # done with current line
                    (i, l, t, i, v) = lexical.peek()     # what is on the next line ?
                    if l <= clevel:
                        break

            else:
                if cdescr.max != unlimited and cdescr.max < count:
                    lexical.error(
                        'Too many %s in %s (skipped)' % (ctag, tag),
                        line=clinenum,
                        fatal=False)
                c = cdescr.parse(lexical)  # read until end of child record
                if c is not None:
                    r.fields.append(c)

        # We have parsed all children, make sure we are not missing any

        if self.children is not None and not has_xref:
            # Not an xref, check we have the right children
            for ctag, cdescr in self.children.items():
                if tags.get(ctag, 0) < cdescr.min:
                    ptag = tag if tag else "file"
                    if ptag[0] != "_":
                        lexical.error(
                            'Missing {count} occurrence of {child} in {parent}'.format(
                                parent=ptag,
                                count=cdescr.min - tags.get(ctag, 0),
                                child=ctag),
                            line=linenum,
                            fatal=True)
                    else:
                        lexical.error(
                            'Skipping {parent}, missing {count} occurrence of {child}'.format(
                                parent=ptag,
                                count=cdescr.min - tags.get(ctag, 0),
                                child=ctag),
                            line=linenum,
                            fatal=False)
                    return None

        return r


# Address structure (gedcom 5.5.1, p31)

ADDR = [
    F("ADR1", 0, 1),                 # Address line 1
    F("ADR2", 0, 1),                 # Address line 2
    F("ADR3", 0, 1),                 # Address line 3
    F("CITY", 0, 1),                 # Address city (for sorting)
    F("STAE", 0, 1),                 # Address state (for sorting)
    F("POST", 0, 1),                 # Address postal code (for sorting)
    F("CTRY", 0, 1),                 # Address country (for sorting)
    F("NOTE", 0, unlimited),         # ??? RootsMagic extension
]

ADDR_STRUCT = [
    F("ADDR", 0, 1, '', ADDR),
    F("_ADDR", 0, 1, '', ADDR),      # ??? Geneatique 2010
    F("PHON", 0, 3),                 # Phone number
    F("EMAIL", 0, 3),                # address email
    F("FAX", 0, 3),                  # address fax
    F("WWW", 0, 3),                  # address web page
    F("WEB", 0, 1),                  # ??? Heredis extension
]
ADDR_FIELDS = set(f.tag for f in ADDR_STRUCT)

# statistics: number of tags of each type
# https://www.tamurajones.net/GEDCOM_STS.xhtml
STS = [
    F("INDI", 0, 1),
    F("FAM",  0, 1),
    F("REPO", 0, 1),
    F("SOUR", 0, 1),
    F("NOTE", 0, 1),
    F("SUBM", 0, 1),
    F("OBJE", 0, 1),
    F("_LOC", 0, 1),
]

# Header structure, Gedcom 5.5.1, p23
HEADER = [
    F("SOUR", 1, 1, '', [                # Approved system id
       F("VERS", 0, 1),                  # Version number
       F("NAME", 0, 1),                  # Name of product
       F("CORP", 0, 1, '', ADDR_STRUCT), # Name of business
       F("DATA", 0, 1, '', [             # Name of source data
           F("DATE", 0, 1),              # Publication date
           F("COPR", 0, 1),              # Copyright source data
       ]),
    ]),
    F("DEST", 0, 1),                     # Receiving system name
    F("DATE", 0, 1, '', [                # Transmission date
       F("TIME", 0, 1),                  # Time value
    ]),
    F("SUBM", 1, 1, "SUBM"),             # Xref to SUBM
    F("SUBN", 0, 1, "SUBN"),             # Submission number
    F("FILE", 0, 1),                     # File name
    F("COPR", 0, 1),                     # Copyright Gedcom file
    F("GEDC", 1, 1, None, [
        F("VERS", 1, 1),                 # Version number
        F("FORM", 1, 1),                 # Gedcom form
    ]),
    F("CHAR", 1, 1, '', [                # Character set
        F("VERS", 0, 1),                 # Version number
    ]),
    F("LANG", 0, 1),                     # Language of text
    F("_STS", 0, 1, '', STS),            # statistics
    F("PLAC", 0, 1, None, [
       F("FORM", 1, 1),                   # Place hierarchy
    ]),
    F("_HME", 0, 1),                     # Extension from gedcom torture
    F("NOTE", 0, 1),                     # Gedcom content description
]

CHAN = \
    F("CHAN", 0, 1, None, [              # Geccom 5.5.1, p31
        F("DATE", 1, 1, '', [            # change date
            F("TIME", 0, 1),             # time value
        ]),
        F("NOTE", 0, unlimited, "NOTE"),
    ])

SUBMISSION_REC = [                     # Gedcom 5.5.1, p28
    F("SUBM", 0, 1, "SUBM"),
    F("FAMF", 0, 1),                   # Name of family file
    F("TEMP", 0, 1),                   # Temple code
    F("ANCE", 0, 1),                   # Generations of ancestors
    F("DESC", 0, 1),                   # Generations of descendants
    F("ORDI", 0, 1),                   # Ordinance process flag
    F("RIN",  0, 1),                   # Automated record id
    F("NOTE", 0, unlimited, "NOTE"),
    CHAN,
]

MULTIMEDIA_LINK = [
    F("FORM", 0, 1),
    F("TITL", 0, 1),              # descriptive title
    F("FILE", 1, unlimited, '', [ # multimedia file refn
        F("FORM", 0, 1, '', [     # multimedia format (min=1 in gedcom 5.5.1)
            F("MEDI", 0, 1,),     # source media type
        ]),
    ]),
    F("FORM", 0, 1, '', [         # multimedia format (gedcom 5.5.0)
        F("MEDI", 0, 1,),         # source media type
    ]),
    F("_TYPE", 0, 1),             # ??? RootsMagic extension
    F("_SCBK", 0, 1),             # ??? RootsMagic extension
    F("_PRIM", 0, 1),             # ??? RootsMagic extension
    F("NOTE", 0, unlimited, "NOTE"),   # ??? Gramps extension
]

SOURCE_CITATION = [
    F("TEXT", 0, unlimited),           # Text from source
    F("QUAY", 0, 1),                   # Certainty assessment
    F("PAGE", 0, 1),                   # Where within source
    F("EVEN", 0, 1, '', [              # Event type cited from
        F("ROLE", 0, 1),               # Role in event
    ]),
    F("DATA", 0, 1, None, [
        F("DATE", 0, 1),               # Entry recording date
        F("TEXT", 0, unlimited),       # Text from source
    ]),
    F("_QUAL", 0, 1),                  # ??? RootsMagic extension
    F("_INFO", 0, 1),                  # ??? RootsMagic extension
    # F("_TMPLT", 0, 1, '', TMPLT),      # ??? RootsMagic extension
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
    F("NOTE", 0, unlimited, "NOTE"),
]

PLACE_STRUCT = [
    F("FORM", 0, 1),                   # Place hierarchy
    F("FONE", 0, unlimited, '', [      # Place phonetic variation
        F("TYPE", 1, 1),               # Phonetic type
    ]),
    F("ROMN", 0, unlimited, '', [      # Place romanized variation
        F("TYPE", 1, 1),               # Romanized type
    ]),
    F("MAP", 0, 1, None, [
        F("LATI", 1, 1),               # Place latitude
        F("LONG", 1, 1),               # Place longitude
    ]),
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),   # In TGC55C.ged
]

MULTIMEDIA_REC = [
    F("FILE", 0, 1, "", [                     # Multimedia file reference
        F("FORM", 1, 1, "", [                 # Multimedia format
            F("TYPE", 0, 1, ""),
        ]),
        F("TITL", 0, 1),                      # Descriptive title
    ]),
    F("TITL", 0, 1),                          # gecom 5.5 (?) used in TGC55C.ged
    F("BLOB", 0, 1),                          # gecom 5.5
    F("FORM", 0, 1),                          # gecom 5.5
    F("REFN", 0, unlimited, "", [             # User reference number
        F("TYPE", 0, 1),                      # User reference type
    ]),
    F("RIN",  0, 1),                          # Automated record id
    F("NOTE", 0, unlimited, "NOTE"),
    F("BLOB", 0, 1),                          # Removed in gedcom 5.5.1
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    CHAN,
]

EVENT_DETAIL = ADDR_STRUCT + [
    F("TYPE", 0, 1, ''),                # Event or fact classification
    F("DATE", 0, 1),                    # Date value
    F("_SDATE", 0, 1),                  # Sort date in RootsMagic
    F("PLAC", 0, 1, '', PLACE_STRUCT),  # Place name
    F("AGNC", 0, 1),                    # Responsible agency
    F("RELI", 0, 1),                    # Religious affiliation
    F("CAUS", 0, 1),                    # Cause of event
    F("RESN", 0, 1),                    # Restriction notice
    F("_ACT", 0, unlimited),            # ??? Geneatique 2010
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    # F("ASSO", 0, unlimited, '', ASSOC), # ??? Geneatique 2010
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
]

FAMILY_EVENT_DETAIL = [
    F("HUSB", 0, 1, None, [
        F("AGE", 1, 1),                # age at event
    ]),
    F("WIFE", 0, 1, None, [
        F("AGE", 1, 1),                # age at event
    ]),
    F("AGE", 0, unlimited),            # Invalid, but used in TGC55C.ged
] + EVENT_DETAIL

FAM_EVENT_STRUCT = [
    F("RESN", 0, 1),                   # Restriction notice
    F("ANUL", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("CENS", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("DIV",  0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("DIVF", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("ENGA", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("MARB", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("MARC", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("MARR", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("MARL", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("MARS", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("RESI", 0, unlimited, "Y", FAMILY_EVENT_DETAIL),
    F("EVEN", 0, unlimited, '',  FAMILY_EVENT_DETAIL),
]
FAM_EVENT_FIELDS = set(f.tag for f in FAM_EVENT_STRUCT)

LDS_SPOUSE_SEALING = [
    F("STAT", 0, 1, '', [        # Spouse sealing Date status
        F("DATE", 1, 1),         # Change date
    ]),
    F("DATE", 0, 1),             # Date LDS ordinance
    F("TEMP", 0, 1),             # Temple code
    F("PLAC", 0, 1),             # Place living ordinance
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    F("NOTE", 0, unlimited, "NONE"),
]

FAM_REC = FAM_EVENT_STRUCT + [
    F("_UID", 0, 1),                   # Reunion on OSX
    F("RESN", 0, 1,),                  # Restriction notice
    F("HUSB", 0, 1, "INDI"),
    F("WIFE", 0, 1, "INDI"),
    F("CHIL", 0, unlimited, "INDI"),   # xref to children
    F("NCHI", 0, 1),                   # count of children
    F("SUBM", 0, unlimited, "SUBM"),
    F("SLGS", 0, unlimited, None, LDS_SPOUSE_SEALING), # lds spouse sealing
    F("REFN", 0, unlimited, '', [      # User reference number
       F("TYPE", 0, 1),                # User reference type
    ]),
    F("RIN", 0, 1),                    # Automated record id
    CHAN,
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
]

SUBM_REC = ADDR_STRUCT + [
    F("NAME", 1, 1),                   # Submitter name
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
    F("LANG", 0, 3),                   # Language preference
    F("RFN",  0, 1),                   # Submitter registered rfn
    F("RIN",  0, 1),                   # Automated record id
    F("COMM", 0, unlimited),           # ??? PAF extension
    F("NOTE", 0, unlimited, "NOTE"),
    CHAN,
]

PERSONAL_NAME_STRUCT = [
    F("TYPE", 0, 1),                   # Name type
    F("NPFX", 0, 1),                   # Name piece prefix
    F("GIVN", 0, 1),                   # Name piece given
    F("NICK", 0, 1),                   # Name piece nickname
    F("SPFX", 0, 1),                   # Name piece surname prefix
    F("SURN", 0, 1),                   # Name piece surname
    F("NSFX", 0, 1),                   # Name piece suffix
    F("POST", 0, 1),                   # ??? Geneatique 2010
    F("CITY", 0, 1),                   # ??? Geneatique 2010
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
]

INDI_EV_DETAIL = EVENT_DETAIL + [
    F("AGE", 0, unlimited),
]

INDIVIDUAL_ATTRIBUTE_STRUCT = [
    F("CAST",  0, unlimited, '', INDI_EV_DETAIL), # Cast name
    F("DSCR",  0, unlimited, '', INDI_EV_DETAIL), # Physical description
    F("EDUC",  0, unlimited, '', INDI_EV_DETAIL), # Scholastic achievement
    F("IDNO",  0, unlimited, '', INDI_EV_DETAIL), # Natural Id number
    F("NATI",  0, unlimited, '', INDI_EV_DETAIL), # National or tribal origin
    F("NCHI",  0, unlimited, '', INDI_EV_DETAIL), # Count of children
    F("NMR",   0, unlimited, '', INDI_EV_DETAIL), # Count of marriages
    F("OCCU",  0, unlimited, '', INDI_EV_DETAIL), # Occupation
    F("PROP",  0, unlimited, '', INDI_EV_DETAIL), # Possessions
    F("RELI",  0, unlimited, '', INDI_EV_DETAIL), # Religious affiliation
    F("RESI",  0, unlimited, "Y", INDI_EV_DETAIL), # Resides at
    F("SSN",   0, unlimited, '', INDI_EV_DETAIL), # Social security number
    F("TITL",  0, unlimited, '', INDI_EV_DETAIL), # Nobility type title
    F("FACT",  0, unlimited, '', INDI_EV_DETAIL), # Attribute descriptor
]

INDIVIDUAL_EVENT_STRUCT = [
    F("BIRT", 0, unlimited, "Y", INDI_EV_DETAIL + [
        F("FAMC", 0, 1, "FAM"),
    ]),
    F("CHR", 0, unlimited, "Y", INDI_EV_DETAIL + [
        F("FAMC", 0, 1, "FAM"),       # Child to family link
    ]),
    F("DEAT", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("BURI", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("CREM", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("ADOP", 0, unlimited, "Y",  INDI_EV_DETAIL + [
        F("FAMC", 0, 1, "FAM", [
            F("ADOP", 0, 1),          # Adopted by which parent
        ]),
    ]),
    F("BAPM", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("BARM", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("BASM", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("BLES", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("CHRA", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("CONF", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("FCOM", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("ORDN", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("NATU", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("EMIG", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("EMIG", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("IMMI", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("CENS", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("PROB", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("WILL", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("GRAD", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("RETI", 0, unlimited, "Y", INDI_EV_DETAIL),
    F("EVEN", 0, unlimited, "", INDI_EV_DETAIL),
         # Gedcom 5.5.1 says no text should be allowed, but Gramps outputs the
         # name of the event there.
]

LDS_INDI_ORDINANCE_BAPL = [
    F("DATE", 0, 1),      # Date LDS ordinance
    F("TEMP", 0, 1),      # Temple code
    F("PLAC", 0, 1),      # Place living ordinance
    F("STAT", 0, 1, '', [ # LDS Baptimsm date status
        F("DATE", 1, 1),  # Change date
    ]),
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
]

LDS_INDI_ORDINANCE_SGLC = [
    F("DATE", 0, 1),      # Date LDS ordinance
    F("TEMP", 0, 1),      # Temple code
    F("PLAC", 0, 1),      # Place living ordinance
    F("FAMC", 1, 1, "FAM"),
    F("STAT", 0, 1, '', [ # LDS Baptimsm date status
        F("DATE", 1, 1),  # Change date
    ]),
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
]

LDS_INDI_ORDINANCE = [
    F("BAPL", 0, 1, None, LDS_INDI_ORDINANCE_BAPL),
    F("CONL", 0, 1, "Y", LDS_INDI_ORDINANCE_BAPL),
    F("ENDL", 0, 1, None, LDS_INDI_ORDINANCE_BAPL),
    F("SLGC", 0, 1, None, LDS_INDI_ORDINANCE_SGLC),
]

GRAMPS_CUSTOM_EVENT = ADDR_STRUCT + [
    F("TYPE", 0, 1),   # Always in GRAMPS, never in FTM
    F("DATE", 0, 1),   # Always in GRAMPS, optional in FTM
    F("NOTE", 0, unlimited),
    F("PLAC", 0, 1, '', PLACE_STRUCT),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
]

INDI_REC = INDIVIDUAL_EVENT_STRUCT + \
    INDIVIDUAL_ATTRIBUTE_STRUCT + \
    LDS_INDI_ORDINANCE + [
    F("RESN", 0, 1),                    # Restriction notice
    F("NAME", 0, unlimited, '', PERSONAL_NAME_STRUCT),
    F("SEX",  0, 1),                    # Sex value
    F("_UID", 0, unlimited),            # ??? RootsMagic extension
    F("FAMC", 0, unlimited, "FAM", [    # Child to family link
        F("PEDI", 0, 1),                # Pedigree linkage type
        F("STAT", 0, 1),                # Child linkage status
        F("NOTE", 0, unlimited, "NOTE"),
    ]),
    F("FAMS", 0, unlimited, "FAM", [    # Spouse to family link
        F("NOTE", 0, unlimited, "NOTE"),
    ]),
    F("SUBM", 0, unlimited, "SUBM"),    # Submitter
    F("ASSO", 0, unlimited, "INDI", [   # Association
        F("RELA", 1, 1),                # Relation-is descriptor
        F("NOTE", 0, unlimited, "NOTE"),
        F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    ]),
    F("RELATION", 0, unlimited, '', [   # Geneatique 2010
        F("ASSO", 0, unlimited, '', [
            F("RELA", 0, 1),
            F("TYPE", 0, 1),
            F("NOTE", 0, unlimited, "NOTE"),
            F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
        ]),
    ]),
    F("ALIA", 0, unlimited, "INDI"),
    F("ANCI", 0, unlimited, "SUBM"),
    F("DESI", 0, unlimited, "SUBM"),
    F("RFN",  0, 1),                   # Permanent record file number
    F("AFN",  0, 1),                   # Ancestral file number
    F("REFN", 0, unlimited, '', [      # User reference number
        F("TYPE", 0, 1),               # User reference type
    ]),
    F("RIN", 0, 1),                    # Automated record id
    CHAN,
    F("NOTE", 0, unlimited, "NOTE", [
       F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),   # In TGC55C.ged
    ]),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
    F("IMAGE", 0, unlimited, '', [     # ??? Geneatique 2010
        F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
        F("NOTE", 0, unlimited, "NOTE"),
    ]),
    F("SIGN", 0, 1),                   # ??? Geneatique 2010
    F("_CHV", 0, 1),                   # ??? Geneatique 2010
    F("_DEG", 0, unlimited, '', GRAMPS_CUSTOM_EVENT), # ??? gramps extensions for diplomas
    F("_MILT", 0, unlimited, '', GRAMPS_CUSTOM_EVENT),  # ??? gramps FTM extension
]

ROOTSMAGIC_TMPLT = [
    F("TID", 0, 1),
    F("FIELD", 0, unlimited, "", [
        F("NAME", 0, unlimited),
        F("VALUE", 0, unlimited),
    ]),
]

SOURCE_REC = [
    F("DATA", 0, 1, None, [
        F("EVEN", 0, unlimited, '', [          # Event recorded
            F("DATE", 0, 1),                   # Date period
            F("PLAC", 0, 1),                   # Source jurisdiction place
        ]),
        F("AGNC", 0, 1),                       # Responsible agency
        F("NOTE", 0, unlimited, "NOTE"),
    ]),
    F("AUTH", 0, 1),                           # Source originator
    F("TITL", 0, 1),                           # Source descriptive title
    F("ABBR", 0, 1),                           # Source filed by entry
    F("PUBL", 0, 1),                           # Source publication facts
    F("TEXT", 0, 1),                           # Text from source
    F("REPO", 0, 1, "REPO", [                  # Source repository citation
        F("NOTE", 0, unlimited, "NOTE"),
        F("CALN", 0, unlimited, "", [          # Source call number
            F("MEDI", 0, 1),                   # Source media type
        ]),
    ]),
    F("REFN", 0, unlimited, "", [              # User reference number
        F("TYPE", 0, 1),                       # User reference type
    ]),
    F("RIN", 0, 1),                            # Automated record id
    CHAN,
    F("NOTE", 0, unlimited, "NOTE"),           # Note on source
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
    F("_SUBQ", 0, 1),                          # ??? RootsMagic
    F("_BIBL", 0, 1),                          # ??? RootsMagic
    F("_TMPLT", 0, 1, "", ROOTSMAGIC_TMPLT),   # ??? RootsMagic extension
]

NOTE_REC = [
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    F("REFN", 0, unlimited, "", [
        F("TYPE", 0, 1),
    ]),
    F("RIN",  0, 1),
    CHAN,
]

REPO_REC = ADDR_STRUCT + [
    F("NAME", 0, 1),                           # Name of repository
    F("NOTE", 0, unlimited, "NOTE"),           # Repository notes
    F("REFN", 0, unlimited, "", [              # User reference number
        F("TYPE", 0, 1),                       # User reference type
    ]),
    F("RIN", 0, 1),                            # Automated record id
    CHAN,

]

ROOTSMAGIC_EVDEF = [
    F("TYPE", 0, 1),                          # eg./  "P"
    F("TITL", 0, 1),                          # eg./  "Birth"
    F("ABBR",  0, 1),
        # eg./  "Birth"
        # eg./ [person] was born< [Date]>< [PlaceDetails]>< [Place]>.
    F("SENT",  0, 1),
    F("PLAC",  0, 1),                         # eg./ "Y"
    F("DATE",  0, 1),                         # eg./ "Y"
    F("DESC",  0, 1),                         # eg./ "N"
]

FILE = \
    F('', 1, 1, None, [
        F("HEAD",   1, 1,         None, HEADER),
        F("SUBN",   0, 1,         None, SUBMISSION_REC),
        F("FAM",    0, unlimited, None, FAM_REC),
        F("INDI",   0, unlimited, None, INDI_REC),
        F("OBJE",   0, unlimited, None, MULTIMEDIA_REC),
        F("NOTE",   0, unlimited, "", NOTE_REC),
        F("REPO",   0, unlimited, None, REPO_REC),
        F("SOUR",   0, unlimited, None, SOURCE_REC),
        F("SUBM",   0, unlimited, None, SUBM_REC),
        F("_EVDEF", 0, unlimited, None, ROOTSMAGIC_EVDEF),  # ??? RootsMagic
        F("TRLR",   1, 1,         None),
    ])


def parse_gedcom(filename, print_warning=lambda m: print(m)):
    """Parse the specified GEDCOM file, check its syntax, and return a
       GedcomFile instance.
       Raise Invalid_Gedcom in case of error.
       :param filename:
           Either the name of a file, or an instance of a class
           compatible with file.
    """

    start = time.time()
    result = FILE.parse(
        _Lexical(_File(filename), print_warning=print_warning))
    logger.info('Parsed in %ss', time.time() - start)
    return result


if __name__ == '__main__':
    parse_gedcom(sys.argv[1])

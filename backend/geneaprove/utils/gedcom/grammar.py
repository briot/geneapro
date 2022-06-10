from .f import F, unlimited

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
    F("SOUR", 1, 1, '', [                 # Approved system id
       F("VERS", 0, 1),                   # Version number
       F("NAME", 0, 1),                   # Name of product
       F("CORP", 0, 1, '', ADDR_STRUCT),  # Name of business
       F("DATA", 0, 1, '', [              # Name of source data
           F("DATE", 0, 1),               # Publication date
           F("COPR", 0, 1),               # Copyright source data
       ]),
    ]),
    F("DEST", 0, 1),                     # Receiving system name
    F("DATE", 0, 1, '', [                # Transmission date
       F("TIME", 0, 1),                  # Time value
    ]),
    F("SUBM",
        0,  # Standard says minimum is 1, but Geneweb doesn't output it
        1, "SUBM"),             # Xref to SUBM
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
    F("TITL", 0, 1),               # descriptive title
    F("FILE", 1, unlimited, '', [  # multimedia file refn
        F("FORM", 0, 1, '', [      # multimedia format (min=1 in gedcom 5.5.1)
            F("MEDI", 0, 1,),      # source media type
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
    F("FILE", 0, 1, "", [              # Multimedia file reference
        F("FORM", 1, 1, "", [          # Multimedia format
            F("TYPE", 0, 1, ""),
        ]),
        F("TITL", 0, 1),               # Descriptive title
    ]),
    F("TITL", 0, 1),                   # gecom 5.5 (?) used in TGC55C.ged
    F("BLOB", 0, 1),                   # gecom 5.5
    F("FORM", 0, 1),                   # gecom 5.5
    F("REFN", 0, unlimited, "", [      # User reference number
        F("TYPE", 0, 1),               # User reference type
    ]),
    F("RIN",  0, 1),                   # Automated record id
    F("NOTE", 0, unlimited, "NOTE"),
    F("BLOB", 0, 1),                   # Removed in gedcom 5.5.1
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
    F("ASSO", 0, unlimited, "FAM", [   # ??? Geneweb extension. Text is a ref.
        F("TYPE", 1, 1),
        F("RELA", 1, 1),
    ]),
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
    F("NOTE", 0, unlimited, "NOTE"),
]

FAM_REC = FAM_EVENT_STRUCT + [
    F("_UID", 0, unlimited),           # Reunion on OSX
    F("RESN", 0, 1,),                  # Restriction notice
    F("HUSB", 0, 1, "INDI"),
    F("WIFE", 0, 1, "INDI"),
    F("CHIL", 0, unlimited, "INDI"),   # xref to children
    F("NCHI", 0, 1),                   # count of children
    F("SUBM", 0, unlimited, "SUBM"),
    F("SLGS", 0, unlimited, None, LDS_SPOUSE_SEALING),  # lds spouse sealing
    F("REFN", 0, unlimited, '', [      # User reference number
       F("TYPE", 0, 1),                # User reference type
    ]),
    F("RIN", 0, 1),                    # Automated record id
    CHAN,
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
    F("OBJE", 0, unlimited, "OBJE", MULTIMEDIA_LINK),
    F("FACT",  0, unlimited, '', [     # Gramps extension
        F("TYPE", 0, 1, ''),
    ]),
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
    F("CAST",  0, unlimited, '', INDI_EV_DETAIL),   # Cast name
    F("DSCR",  0, unlimited, '', INDI_EV_DETAIL),   # Physical description
    F("EDUC",  0, unlimited, '', INDI_EV_DETAIL),   # Scholastic achievement
    F("IDNO",  0, unlimited, '', INDI_EV_DETAIL),   # Natural Id number
    F("NATI",  0, unlimited, '', INDI_EV_DETAIL),   # National or tribal origin
    F("NCHI",  0, unlimited, '', INDI_EV_DETAIL),   # Count of children
    F("NMR",   0, unlimited, '', INDI_EV_DETAIL),   # Count of marriages
    F("OCCU",  0, unlimited, '', INDI_EV_DETAIL),   # Occupation
    F("PROP",  0, unlimited, '', INDI_EV_DETAIL),   # Possessions
    F("RELI",  0, unlimited, '', INDI_EV_DETAIL),   # Religious affiliation
    F("RESI",  0, unlimited, "Y", INDI_EV_DETAIL),  # Resides at
    F("SSN",   0, unlimited, '', INDI_EV_DETAIL),   # Social security number
    F("TITL",  0, unlimited, '', INDI_EV_DETAIL),   # Nobility type title
    F("FACT",  0, unlimited, '', INDI_EV_DETAIL),   # Attribute descriptor
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

    # Gedcom 5.5.1 says no text should be allowed, but Gramps outputs the
    # name of the event there.
    F("EVEN", 0, unlimited, "", INDI_EV_DETAIL),
]

LDS_INDI_ORDINANCE_BAPL = [
    F("DATE", 0, 1),       # Date LDS ordinance
    F("TEMP", 0, 1),       # Temple code
    F("PLAC", 0, 1),       # Place living ordinance
    F("STAT", 0, 1, '', [  # LDS Baptimsm date status
        F("DATE", 1, 1),   # Change date
    ]),
    F("NOTE", 0, unlimited, "NOTE"),
    F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
]

LDS_INDI_ORDINANCE_SGLC = [
    F("DATE", 0, 1),         # Date LDS ordinance
    F("TEMP", 0, 1),         # Temple code
    F("PLAC", 0, 1),         # Place living ordinance
    F("FAMC", 1, 1, "FAM"),
    F("STAT", 0, 1, '', [    # LDS Baptimsm date status
        F("DATE", 1, 1),     # Change date
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

INDI_REC = (
    INDIVIDUAL_EVENT_STRUCT +
    INDIVIDUAL_ATTRIBUTE_STRUCT +
    LDS_INDI_ORDINANCE + [
        F("RESN", 0, 1),                    # Restriction notice
        F("NAME", 0, unlimited, '', PERSONAL_NAME_STRUCT),
        F("SEX",  0, 1),                    # Sex value
        F("_UID", 0, unlimited),            # ??? RootsMagic extension
        F("FAMC", 0, unlimited, "FAM", [    # Child to family link
            F("PEDI", 0, 1),                # Pedigree linkage type
            F("STAT", 0, 1),                # Child linkage status
            F("NOTE", 0, unlimited, "NOTE"),
            F("_FREL", 0, 1, ''),  # Gramps, e.g. "adopted", father-relation
            F("_MREL", 0, 1, ''),  # Gramps, e.g. "birth"  mother-relation
        ]),
        F("FAMS", 0, unlimited, "FAM", [    # Spouse to family link
            F("NOTE", 0, unlimited, "NOTE"),
        ]),
        F("SUBM", 0, unlimited, "SUBM"),    # Submitter
        F("ASSO", 0, unlimited, "INDI", [   # Association
            F("RELA", 1, 1),                # Relation-is descriptor
            F("NOTE", 0, unlimited, "NOTE"),
            F("SOUR", 0, unlimited, "SOUR", SOURCE_CITATION),
            F("TYPE", 0, 1),                # ??? Geneweb extension
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

        # ??? gramps extensions for diplomas
        F("_DEG", 0, unlimited, '', GRAMPS_CUSTOM_EVENT),

        # ??? gramps FTM extension
        F("_MILT", 0, unlimited, '', GRAMPS_CUSTOM_EVENT),
    ]
)

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

    # eg.  "Birth"
    # eg. [person] was born< [Date]>< [PlaceDetails]>< [Place]>.
    F("ABBR",  0, 1),

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

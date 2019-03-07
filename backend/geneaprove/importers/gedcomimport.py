"""
Provides a gedcom importer
"""

from django.utils.translation import ugettext as _
import django.utils.timezone
from geneaprove.utils.gedcom import parse_gedcom, Invalid_Gedcom, \
        GedcomRecord, ADDR_FIELDS, FAM_EVENT_FIELDS
from geneaprove import models
from django.db import transaction, connection
import geneaprove.importers
import re
import datetime
import logging
import traceback
import time
import os

logger = logging.getLogger('geneaprove.importers')

# If true, the given name read from gedcom is split (on spaces) into
# a given name and one or more middle names. This might not be appropriate
# for all languages.
GIVEN_NAME_TO_MIDDLE_NAME = True

# If true, a different persona is created for each source. For instance,
# if person ID001 has two events (birth and death) each with its own sources,
# then two personas (or more) will be created for ID001, all joined through
# a "sameAs" persona-to-persona relationship.
MULTIPLE_PERSONAS = True

# Id used for inlined sources in gedcom (ie there is no id in the gedcom
# file)
INLINE_SOURCE = -2
NO_SOURCE = -1

# fields extracted by _extract_ADDR_PLAC_OBJE. This associates the multimedia
# objects with the place itself, so they should be ignored afterwards.
PLAC_OBJE_FIELDS = set(["PLAC", "OBJE"]).union(ADDR_FIELDS)

SOUR_FIELDS = set(["SOUR"])

FORM_TO_MIME = {
    'jpeg': 'image/jpeg',  # Gramps
    'image/png': 'image/png',  # Gramps
    'image/jpeg': 'image/jpeg',
    'png': 'image/png',  # rootsMagic
    'jpg': 'image/jpg',  # rootsMagic
    'JPG': 'image/jpg',  # rootsMagic
    '': 'application/octet-stream'}


##################################
# GedcomImporter
##################################

class GedcomImporter(object):
    """
    Gedcom importer. This translates from the gedcom data model into our own,
    and can be used by any importer for which the software uses roughly the
    gedcom model.
    """

    def __init__(self, filename, *args, **kwargs):
        self.errors = []
        self.init_fields()
        self._process_FILE(filename)

    def _process_FILE(self, filename):
        logger.info("First pass: parse gedcomfile")
        self._data = parse_gedcom(filename)

        logger.info("Second pass: create records")
        self._create_ids(filename=filename)

        self.execute_bulks()
        logger.info(f"Done inserting bulks {filename}")

    def _create_ids(self, filename):
        for f in self._data.fields:
            if f.tag == "SUBM":
                self._ids_subm[f.id] = self._create_bare_SUBM(f)
            elif f.tag == "NOTE":
                self._ids_note[f.id] = f.value
            elif f.tag == "INDI":
                self._ids_indi[(NO_SOURCE, f.id)] = self._create_bare_indi(f)

        for f in self._data.fields:
            if f.tag == "SUBM":
                self._process_SUBM(f, self._ids_subm[f.id])
            elif f.tag == "HEAD":
                self._process_HEAD(f, filename)  # Need SUBM

        for f in self._data.fields:
            if f.tag == "SOUR":
                self._ids_sour[f.id] = self._create_bare_sour(f) # need HEAD

        for f in self._data.fields:
            if f.tag == "REPO":
                self._ids_repo[f.id] = self._process_REPO(f)  # Need NOTE
            elif f.tag == "OBJE":
                # Need bare source,NOTE
                self._ids_obje[f.id] = self._process_OBJE(f)

        # Parse toplevel sources, since we'll need their title for nested
        # sources
        for f in self._data.fields:
            if f.tag == "SOUR":
                self._ids_sour[f.id] = self._process_SOUR(
                    f, prefix="SOUR")[1]  # Need NOTE/OBJE

        for f in self._data.fields:
            if f.tag in ("HEAD", "SUBM", "TRLR", "NOTE", "SUBN",
                         "SOUR", "REPO"):
                pass   # nothing else to do
            elif f.tag == "INDI":
                self._process_INDI(f)  # Need FAM,SOUR,NOTE,OBJE,SUBM
            elif f.tag == "FAM":
                self._process_FAM(f)   # Need bare indi, SOUR
            else:
                self.ignored(f, prefix='')

    def _process_HEAD(self, head, filename):
        created_by = 'unknown'
        date = None

        name = filename if isinstance(filename, str) \
            else filename.name if hasattr(filename, 'name') \
            else 'uploaded'

        for f in head.fields:
            if f.tag == "SUBM":
                self._researcher = self._ids_subm[f.as_xref()]
            elif f.tag == "FILE":
                prj = self._create_project(f, researcher=self._researcher)
            elif f.tag == "SOUR":
                for a in f.fields:
                    if a.tag in ("VERS", "CORP"):
                        pass   # Ignored
                    elif a.tag == "NAME":
                        created_by = a.value
                    elif a.tag == "DATA":
                        for b in a.fields:
                            if b.tag == "DATE":  # publication date
                                date = self._process_DATE(b)
                            elif b.tag == "COPR":
                                pass
                            else:
                                self.ignored(b, prefix='HEAD.SOUR.DATA')
                    else:
                        self.ignored(a, prefix='HEAD.SOUR')
            elif f.tag in ("DEST", "COPR", "GEDC", "LANG", "CHAR"):
                # Ignored. CHAR was already handled by the gedcom parser itself
                pass
            elif f.tag == "DATE":     # transmission date
                if date is None:
                    date = self._process_DATE(f)
            else:
                self.ignored(f, prefix='HEAD')

        date_str = date.strftime('%Y-%m-%d %H:%M:%S %Z') if date else None
        title = f'"{os.path.basename(name)}", {self._researcher.name}, exported from {created_by}, created on {date_str}, imported on {datetime.datetime.now(django.utils.timezone.get_default_timezone()).strftime("%Y-%m-%d %H:%M:%S %Z")}'
        self._source_for_gedcom = models.Source.objects.create(
            jurisdiction_place_id=None,
            researcher=self._researcher,
            subject_date=date,
            title=title,
            abbrev=title,
            biblio=title,
            last_change=date or django.utils.timezone.now())

    def _create_bare_indi(self, indi):
        """
        Create an entry for an INDI in the database, with no associated event
        or characteristic.
        """
        name = ''
        chan = None
        for f in indi.fields:
            if f.tag == "NAME":
                # Gedcom says the first name should be used
                if not name:
                    name = f.value
            elif f.tag == "CHAN":
                chan = self._process_CHAN(f)
            elif f.tag == "FAMS":
                self.ignore_fields(f, prefix="INDI")
                pass   # Handled in "FAM" itself
            elif f.tag == "FAMC":
                famc = self._famc.setdefault(f.as_xref(), {})
                n = famc[indi.id] = {
                    "PEDI": 'birth',
                    "STAT": 'proven',
                    "NOTE": [],
                }

                for a in f.fields:
                    if a.tag in ("PEDI", "STAT"):
                        n[a.tag] = a.value
                    elif a.tag == "NOTE":
                        n[a.tag].append(self._get_note(a))
                    else:
                        self.ignored(a, prefix="INDI.FAMC")

            elif f.tag == "ADOP":
                # Special case for adoptions: we need to associate with the
                # parents, although potentially only one parent has adopted.

                famc = None
                for a in f.fields:
                    if a.tag == "FAMC":
                        famc = a.as_xref()
                        # Other fields parsed later in _process_FAM

                if famc:
                    self._adoptions.setdefault(famc, []).append((f, indi.id))
                else:
                    self.report_error(f, "ADOP without a FAM")

            else:
                # do not report on ignored or unexpected fields here
                pass

        # The name to use is the first one in the list of names
        p = models.Persona.objects.create(
            name=name, description=None,
            last_change=chan or django.utils.timezone.now())
        p._gedcom_id = indi.id
        return p

    def _create_bare_sour(self, sour):
        """
        Create a basic source object, with no attributes set
        """

        chan = None

        for f in sour.fields:
            if f.tag == "CHAN":
                chan = self._process_CHAN(f)
            # Do not report on ignored or unexpected fields

        return models.Source.objects.create(
            higher_source=self._source_for_gedcom,
            researcher=self._researcher,
            last_change=chan or django.utils.timezone.now())

    def _create_bare_SUBM(self, subm):
        return models.Researcher.objects.create(
            name='', place=None)

    def _process_SUBM(self, subm, result):
        """
        Process a SUBM record to create a researcher
        :param GedcomRecord subm: the SUBM field
        :param Researcher result: the object to decorate
        """

        name = None
        place = self._extract_ADDR_PLAC_OBJE(subm)

        for f in subm.fields:
            if f.tag == "NAME":
                if name is not None:
                    self.report_error(f, "Duplicate SUBM.NAME")
                name = f.value or 'unknown'
            elif place is None and f.tag == "OBJE":
                self.ignored(f, prefix='SUBM')
            elif f.tag in PLAC_OBJE_FIELDS:
                pass   # handled in _extract_ADDR_PLAC_OBJE
            else:
                self.ignored(f, prefix='SUBM')

        if name is None:
            self.report_error(res, "Missing SUBM.NAME")

        result.name = name
        result.place = place
        result.save()

    def init_fields(self):
        self._surety_scheme = models.Surety_Scheme.objects.get(id=1)
        parts = list(self._surety_scheme.parts.all())
        self._default_surety = parts[int(len(parts) / 2)]

        self._researcher = None
        self._source_for_gedcom = None

        self._obje_for_places = dict()
        # The OBJE created for each place.
        # This is needed because at least GRAMPS outputs the PLAC for an
        # event along with all its OBJE (so we have lots of duplicates)

        self._principal = models.Event_Type_Role.objects.get(
            pk=models.Event_Type_Role.PK_principal)
        self._birth__father = models.Event_Type_Role.objects.get(
            pk=models.Event_Type_Role.PK_birth__father)
        self._birth__mother = models.Event_Type_Role.objects.get(
            pk=models.Event_Type_Role.PK_birth__mother)
        self._adoption__adopting = models.Event_Type_Role.objects.get(
            pk=models.Event_Type_Role.PK_adoption__adopting)
        self._adoption__not_adopting = models.Event_Type_Role.objects.get(
            pk=models.Event_Type_Role.PK_adoption__not_adopting)

        self._event_types = dict()
        self._char_types = dict()
        self._citation_part_types = dict()
        self._place_part_types = dict()
        self._p2p_types = dict()

        self._places = dict()  # lookup name => models.Place
        self._sources = {}     # lookup name => models.Source
        self._famc = {}        # Family Id -> {personId -> FAMC}
        self._births = {}      # Indi Id -> Event
        self._adoptions = {}   # Family Id -> (GedcomRecord, child gedcom_id)

        self._create_enum_cache()

        self._all_place_parts = []    # list of Place_Part to bulk_create
        self._all_p2c = []            # list of P2C to bulk_create
        self._all_p2e = []            # list of P2E to bulk_create
        self._all_p2p = []            # list of P2P to bulk_create
        self._all_char_parts = []     # list of Characteristic_Part
        self._all_citation_parts = [] # list of Citation_Part

        # Matches gedcom ids with objects in the database. Those objects are
        # created in an initial pass, so that xref can be resolved later on.

        self._ids_subm = {}  # Submitter gedcomid           => Researcher
        self._ids_repo = {}  # Repo gedcomid                => Repository
        self._ids_note = {}  # Note gedcomid                => string
        self._ids_obje = {}  # Obje gedcomid                => [Representation]
        self._ids_sour = {}  # Source gedcomid              => Source
        self._ids_indi = {}  # (source gecom, Indi gedcomid) => Persona
            # Returns the person to use for a given source (or NO_SOURCE for
            # those events and characteristics with no source)

    def execute_bulks(self):
        models.Place_Part.objects.bulk_create(self._all_place_parts)
        models.P2C.objects.bulk_create(self._all_p2c)
        models.P2E.objects.bulk_create(self._all_p2e)
        models.P2P.objects.bulk_create(self._all_p2p)
        models.Characteristic_Part.objects.bulk_create(self._all_char_parts)
        models.Citation_Part.objects.bulk_create(self._all_citation_parts)

    def _create_project(self, file, researcher):
        """
        Register the project in the database
        :param GedcomRecord file: the "HEAD.FILE"
        """

        p = models.Project.objects.create(
            name='Gedcom import',
            description=f'Import from {file.value}',
            scheme=self._surety_scheme)
        models.Researcher_Project.objects.create(
            researcher=researcher,
            project=p,
            role='Generated GEDCOM file')
        return p

    def unexpected(self, field):
        self.report_error(field, f"Unexpected tag {field.tag}")

    def ignored(self, field, prefix):
        self.report_error(
            field,
            f"Ignored {prefix + '.' if prefix else ''}{field.tag}")

    def ignore_fields(self, field, prefix):
        """
        `field` itself was taken into account, but none of its children.
        `prefix` should not include the name of field itself.
        """
        for a in field.fields:
            self.ignored(a, prefix=f'{prefix}.{field.tag}')

    def report_error(self, field, msg):
        logger.debug(f'Line {field.line}: {msg}')
        self.errors.append((field.line, msg))

    def errors_as_string(self):
        self.errors.sort(key=lambda e: e[0] if e[0] is not None else -1)

        return "\n".join(
            f'Line {"???" if line is None else line}: {msg}'
            for (line, msg) in self.errors)

    def _create_enum_cache(self):
        """Create a local cache for enumeration tables"""

        for evt in models.Event_Type.objects.exclude(gedcom__isnull=True):
            if evt.gedcom:
                self._event_types[evt.gedcom] = evt

        types = models.Characteristic_Part_Type.objects.exclude(
            gedcom__isnull=True)
        for c in types:
            if c.gedcom:
                self._char_types[c.gedcom] = c

        self._char_types['_MIDL'] = \
            models.Characteristic_Part_Type.objects.get(gedcom='_MIDL')
        # Handled specially in _create_characteristic
        self._char_types['NAME'] = True

        for p in models.Place_Part_Type.objects.exclude(gedcom__isnull=True):
            if p.gedcom:
                self._place_part_types[p.gedcom] = p

        cit_part_types = models.Citation_Part_Type.objects.exclude(
            gedcom__isnull=True)
        for p in cit_part_types:
            self._citation_part_types[p.gedcom] = p

        for p in models.P2P_Type.objects.all():
            self._p2p_types[p.name.lower()] = p

    def _process_CHAN(self, chan):
        """data should be a form of CHAN"""

        # In Geneatique 2010, there can be several occurrences of CHAN. But
        # we only preserve the most recent one

        if chan is None:
            return django.utils.timezone.now()

        if isinstance(chan, GedcomRecord):
            result = datetime.datetime.now(
                django.utils.timezone.get_default_timezone())
            for f in chan.fields:
                if f.tag == "DATE":
                    result = self._process_DATE(f)
                else:
                    self.ignored(f, prefix='CHAN')
            return result
        else:
            return chan   # already parsed earlier

    def _process_DATE(self, date):
        """
        Return a datetime object from data (a DATE record).
        The TIME is also taken into account, if specified.
        """
        if date:
            d = date.value
            tmp = datetime.datetime.strptime(d, "%d %b %Y")

            for f in date.fields:
                if f.tag == "TIME":
                    self.ignore_fields(f, prefix="DATE")
                    tmp = datetime.datetime.strptime(
                        d + " " + f.value, "%d %b %Y %H:%M:%S")
                else:
                    self.ignored(f, prefix='DATE')

            return django.utils.timezone.make_aware(
                tmp, django.utils.timezone.get_default_timezone())

        return datetime.datetime.now(
            django.utils.timezone.get_default_timezone())

    def _process_REPO(self, repo):
        """
        Create a Repository
        """

        place = self._extract_ADDR_PLAC_OBJE(repo)
        name = ''
        info = []

        for f in repo.fields:
            if place is None and f.tag == "OBJE":
                self.ignored(f, prefix='REPO')
            elif f.tag in PLAC_OBJE_FIELDS:
                pass  # already processed above
            elif f.tag == "NAME":
                self.ignore_fields(f, prefix="REPO")
                name = f.value
            elif f.tag == "RIN":
                self.ignore_fields(f, prefix="REPO")
                info.append(f"Automated record id: {f.value}")
            elif f.tag == "REFN":
                added = False
                for a in f.fields:
                    if a.tag == "TYPE":
                        self.ignore_fields(f, prefix="REPO.REFN")
                        added = True
                        info.append(f"{a.value}: {f.value}")
                    else:
                        self.ignored(a, prefix='REPO.REFN')
                if not added:
                    info.append(f"Reference number: {f.value}")
            elif f.tag == "CHAN":
                chan = self._process_CHAN(f)
            elif f.tag == "NOTE":
                self.ignore_fields(f, prefix="REPO")
                info.append(self._get_note(f))
            else:
                self.ignored(f, prefix='REPO')

        info = '\n'.join(info)

        if info or place or name:
            return models.Repository.objects.create(
                place=place,
                name=name or info,
                type=None,
                info=info)
        return None

    def _process_FAM(self, fam):
        """Create the equivalent of a FAMILY in the database"""

        husb = None
        wife = None
        children = []
        fam_events = []
        notes = []  # list of GedcomRecord
        sources = []
        chan = self._process_CHAN(None)

        for f in fam.fields:
            if f.tag == "HUSB":
                self.ignore_fields(f, prefix="FAM")
                husb = self._ids_indi[(NO_SOURCE, f.as_xref())]
            elif f.tag == "WIFE":
                self.ignore_fields(f, prefix="FAM")
                wife = self._ids_indi[(NO_SOURCE, f.as_xref())]
            elif f.tag == "CHIL":
                self.ignore_fields(f, prefix="FAM")
                children.append(f)
            elif f.tag == "CHAN":
                chan = self._process_CHAN(f)
            elif f.tag == "NOTE":
                self.ignore_fields(f, prefix="FAM")
                notes.append(f)
            elif f.tag == "SOUR":
                sources.append(f)
            elif f.tag in FAM_EVENT_FIELDS:
                fam_events.append(f)
            else:
                self.ignored(f, prefix="FAM")

        # We might have a family with children only.
        # Or a family with only one parent.
        # In such cases, we create the missing parents, so the siblings
        # are not lost (if we created a single parent, there might still
        # be ambiguities if that parent also belonged to another family

        if not husb:
            husb = models.Persona.objects.create(
                name=f"@Unknown husband in family {fam.id}@")
        if not wife:
            wife = models.Persona.objects.create(
                name=f"@Unknown wife in family {fam.id}@")

        # For all events, the list of individuals

        husb_and_wife = [
            (husb, self._principal),
            (wife, self._principal)
        ]

        # Get the FAMC information for all individuals
        famc = self._famc.get(fam.id, {})

        # Process all events

        found = 0

        for e in fam_events:
            found += 1
            self._create_event(
                e, husb_and_wife, CHAN=chan, surety=self._default_surety,
                prefix="FAM")

        for n in notes:
            all_children = [self._ids_indi[(NO_SOURCE, x.as_xref())]
                            for x in children]
            for indi in [husb, wife] + all_children:
                self._create_characteristic(n, indi, CHAN=chan, prefix="FAM")

        if sources:
            # If we have some SOUR for the family, we need to create a
            # special relationship to represent them. They are not
            # associated with one specific event.

            found += 1
            self._create_event(
                GedcomRecord(line=fam.line,
                             tag="EVEN",
                             fields=sources + [
                                 GedcomRecord(
                                     line=fam.line,
                                     tag="TYPE",
                                     value="Note")
                             ]),
                husb_and_wife,
                surety=self._default_surety,
                prefix="FAM",
                CHAN=chan)

        # Now add the children.
        # If there is an explicit BIRT event for the child, this was already
        # fully handled in _create_indi, so we do nothing more here. But if
        # there is no known BIRT even, we still need to associate the child
        # with its parents.

        for child in children:   # GedComRecord for CHIL
            x = child.as_xref()

            famc_for_child = famc.get(x, {})
            pedi = famc_for_child.get("PEDI", "birth")
            stat = famc_for_child.get("STAT", "proven")
            notes = famc_for_child.get("NOTE", [])

            e = self._births.get(x, None)
            c = self._ids_indi[(NO_SOURCE, x)]

            father_role = self._birth__father
            mother_role = self._birth__mother
            if pedi in "birth":
                pass
            elif pedi in ("adopted", "foster", "sealing"):
                father_role = self._adoption__adopting
                mother_role = self._adoption__adopting
            else:
                self.report_error(
                    child, f"Unknown INDI.FAMC.PEDI: {pedi}")

            if stat == "challenged":
                surety = self._surety_scheme.parts.all()[0]
                disproved = False
            elif stat == "disproven":
                surety = self._default_surety
                disproved = True
            elif stat == "proven":
                surety = self._default_surety
                disproved = False
            else:
                self.report_error(
                    child, f"Unknown INDI.FAMC.STAT: {stat}")

            parents = [
                (husb, father_role),
                (wife, mother_role)
            ]

            if notes:
                self.ignored(
                    child, prefix="INDI.FAMC.NOTE")

            if e is None:
                found += 1
                self._create_event(
                    GedcomRecord(line=child.line,
                                 tag="BIRT",
                                 fields=[]),
                    parents + [(c, self._principal)],
                    CHAN=chan,
                    disproved=disproved,
                    surety=surety,
                )

            else:
                for p, role in parents:
                    self._all_p2e.append(
                        models.P2E(
                            surety=surety,
                            researcher=self._researcher,
                            disproved=False,
                            person=p,
                            event=e,
                            source=self._source_for_gedcom,  # ???
                            role=role,
                            last_change=chan,
                            rationale=''))

        # Handle adoptions

        for ged, indi_id in self._adoptions.get(fam.id, []):
            adop = "BOTH"
            for a in ged.fields:
                if a.tag == "FAMC":
                    for b in a.fields:
                        if b.tag == "ADOP":
                            self.ignore_fields(b, prefix="INDI.ADOP.FAMC")
                            adop = b.value
                        else:
                            self.ignored(b, prefix="INDI.ADOP.FAMC")
                else:
                    self.ignored(a, prefix="INDI.ADOP")

            child = self._ids_indi[(NO_SOURCE, indi_id)]

            roles = [(child, self._principal)]
            if adop in ("BOTH", "HUSB"):
                roles.append((husb, self._adoption__adopting))
            else:
                roles.append((husb, self._adoption__not_adopting))

            if adop in ("BOTH", "WIFE"):
                roles.append((wife, self._adoption__adopting))
            else:
                roles.append((wife, self._adoption__not_adopting))

            found += 1
            self._create_event(
                ged, roles, CHAN=child.last_change,
                surety=self._default_surety)

        # if there is no event to "build" the family, we generate a dummy
        # one. Otherwise there would be no relationship between husband and
        # wife in the geneaprove database, thus losing information from gedcom

        if found == 0:
            self._create_event(
                GedcomRecord(line=fam.line,
                             tag="EVEN",
                             fields=sources + [
                                 GedcomRecord(
                                     line=fam.line,
                                     tag="TYPE",
                                     value="Family")
                             ]),
                husb_and_wife, CHAN=chan,
                surety=self._default_surety)

    def _indi_for_source(self, sourceId, indi):
        """
        Return the instance of Persona to use for the given source.
        A new one is created as needed.
        sourceId should be "INLINE_SOURCE" for inline sources (since this
        source cannot occur in a different place anyway).
        sourceId should be "NO_SOURCE" when not talking about a specific
        source.
        """

        if not MULTIPLE_PERSONAS \
           or sourceId == NO_SOURCE \
           or not hasattr(indi, "_gedcom_id"):
            return indi

        if sourceId != INLINE_SOURCE:
            p = self._ids_indi.get((sourceId, indi._gedcom_id), None)
            if p:
                return p

        ind = models.Persona.objects.create(
            name=indi.name,
            description='',  # was set for the first persona already
            last_change=indi.last_change)

        if sourceId != INLINE_SOURCE:
            self._ids_indi[(sourceId, indi._gedcom_id)] = ind

        # Link old and new personas

        self._all_p2p.append(
            models.P2P(
                surety=self._default_surety,
                researcher=self._researcher,
                person1=indi,
                person2=ind,
                type_id=models.P2P_Type.sameAs,
                rationale='Single individual in the gedcom file'))
        return ind

    def _get_note(self, field):
        """
        Retrieve the content of the NOTE field
        """
        x = field.as_xref()
        return self._ids_note[x] if x else field.value

    def _create_characteristic(self, field, indi, CHAN=None, prefix=""):
        """Create a Characteristic for the person indi.
         Return True if a characteristic could be created, false otherwise.

         :param GedcomRecord field:
         :param Persona indi:
         :param datetime.datetime|None CHAN:
         :param str prefix: for error messages

         As defined in the GEDCOM standard, and except for the NAME which
         is special, all other attributes follow the following grammar:
             n TITL nobility_type_title
             +1 <EVENT_DETAIL>
         where EVENT_DETAIL can define any of the following: TYPE, DATE,
         PLAC, ADDR, AGE, AGNC, CAUS, SOUR, NOTE, MULT
        """

        if prefix:
            prefix += "."

        if field.tag == 'NAME':
            # Special handling for name: its value was used to create the
            # person itself, and now we are only looking into its subelements
            # for the components of the name
            typ = None
        else:
            typ = self._char_types[field.tag]

        last_change = self._process_CHAN(CHAN)
        place = self._extract_ADDR_PLAC_OBJE(field)
        sources = self._extract_SOUR(field)
        date = None

        # First pass to find information required to create characteristic

        for f in field.fields:
            if f.tag in PLAC_OBJE_FIELDS:
                pass   # already processed (or later, for OBJE)
            elif f.tag in SOUR_FIELDS:
                pass   # already processed
            elif f.tag == "DATE":
                self.ignore_fields(f, prefix=prefix + field.tag)
                date = f.value

        c = models.Characteristic.objects.create(
            place=place,
            name=(typ and typ.name) or field.tag.capitalize(),
            date=date)

        # Associate the characteristic with the persona

        for sid, s in sources:
            self._all_p2c.append(
                models.P2C(
                    surety=self._default_surety,
                    researcher=self._researcher,
                    person=self._indi_for_source(sourceId=sid, indi=indi),
                    last_change=last_change,
                    source=s,
                    characteristic=c)
            )

        # The main characteristic part is the value found on the same
        # GEDCOM line as the characteristic itself. For simple
        # characteristics like "SEX", this will in fact be the only part.

        if typ:
            if field.tag == 'NOTE':
                v = self._get_note(field)
            else:
                v = field.value or ''

            self._all_char_parts.append(
                models.Characteristic_Part(characteristic=c, type=typ, name=v))

        # Second pass to add characteristic parts

        for f in field.fields:
            if place is None and f.tag == "OBJE":
                if sources:
                    for sid, s in sources:
                        self._process_OBJE(f, source=s)
                else:
                    self.ignored(f, prefix=field.tag)

            elif f.tag in PLAC_OBJE_FIELDS \
               or f.tag in SOUR_FIELDS \
               or f.tag in ("DATE"):
                pass   # already handled

            elif f.tag == "NOTE":
                self.ignore_fields(f, prefix=prefix + field.tag)
                self._all_char_parts.append(
                    models.Characteristic_Part(
                        characteristic=c,
                        type=self._char_types["NOTE"],
                        name=self._get_note(f)))

            elif f.tag == "GIVN" and GIVEN_NAME_TO_MIDDLE_NAME:
                self.ignore_fields(f, prefix=prefix + field.tag)

                givn = self._char_types[f.tag]
                midl = self._char_types['_MIDL']
                n = f.value.replace(',', ' ').split(' ')
                self._all_char_parts.append(
                    models.Characteristic_Part(
                        characteristic=c, type=givn, name=n[0]))
                self._all_char_parts.extend(
                    models.Characteristic_Part(
                        characteristic=c, type=midl, name=m)
                    for m in n[1:] if m)

            elif f.tag in self._char_types:
                self.ignore_fields(f, prefix=prefix + field.tag)

                # Includes "TYPE", since "FACT.TYPE" explains what the
                # attribute is about.
                t = self._char_types[f.tag]
                self._all_char_parts.append(
                    models.Characteristic_Part(
                        characteristic=c, type=t, name=f.value))

            else:
                self.ignored(f, prefix=prefix + field.tag)

    def _process_SOUR(self, sour, prefix):
        """
        Process one SOUR node and returns corresponding Source object
        :param GedcomRecord sour:
        :param str prefix: for error messages
        :return: (gedcom_id, Source)
        """
        attr = []
        last_change = self._process_CHAN(None)
        parent = self._source_for_gedcom
        title = ''
        abbr = ''
        bibl = ''
        notes = []   # list of strings
        obje = []    # list of GedcomRecord
        repos = []
        text = []    # Text representation of the source
        subject_date = None
        events = []  # Anonymous events referenced in source

        x = sour.as_xref()
        if x:
            parent = self._ids_sour[x]
            title = parent.title
            abbr = parent.abbrev
            bibl = parent.biblio

        for f in sour.fields:
            if f.tag == "TITL":
                self.ignore_fields(f, prefix=prefix)
                title = f.value
            elif f.tag == "ABBR":
                self.ignore_fields(f, prefix=prefix)
                abbr = f.value
            elif f.tag == "_BIBL":
                self.ignore_fields(f, prefix=prefix)
                bibl = f.value
            elif f.tag in ("AUTH", "PUBL", "TEXT", "RIN",
                           "_SUBQ", "PAGE", "QUAY", "_QUAL", "_INFO"):
                self.ignore_fields(f, prefix=prefix)
                attr.append((f.tag, f.value))
            elif f.tag == "CHAN":
                last_change = self._process_CHAN(f)
            elif f.tag == "NOTE":
                self.ignore_fields(f, prefix=prefix)
                notes.append(self._get_note(f))
            elif f.tag == "OBJE":
                obje.append(f)
            elif f.tag == "REPO":
                # Fields are handled below
                repos.append(f)
            elif f.tag == "DATA":
                for a in f.fields:
                    if a.tag == "EVEN":  # List of events in that source
                        events.append(a)
                    elif a.tag == "AGNC":
                        self.ignore_fields(a, prefix=f"{prefix}.DATA")
                        notes.append(f"Agency: {a.value}")
                    elif a.tag == "NOTE":
                        self.ignore_fields(a, prefix=f"{prefix}.DATA")
                        notes.append(a.value)
                    elif a.tag == "DATE":   # for SOURCE_CITATION
                        self.ignore_fields(a, prefix=f"{prefix}.DATA")
                        if subject_date:
                            self.report_error(a, "Multiple DATA.DATE")
                        subject_date = a.value
                    elif a.tag == "TEXT":   # for SOURCE_CITATION
                        self.ignore_fields(a, prefix=f"{prefix}.DATA")
                        text.append(a.value)
                    else:
                        self.ignored(a, prefix=f"{prefix}.DATA")

            else:
                self.ignored(f, prefix=prefix)

        attr.sort()  # sort by gedcom name, then value
        if x:
            a = f"{', '.join(f'{n[0]}: {n[1]}' for n in attr)}"
            if a:
                title = f"{title} ({a})"
                abbr = f"{abbr} ({a})"
                bibl = f"{bibl} ({a})"

        lookup_name = f'TITL={title} ABBR={abbr or title} _BIBL={bibl or title} {" ".join(f"{n[0]}={n[1]}" for n in attr)}'

        if lookup_name in self._sources:
            # Assume the previous time we saw it it already had the same
            # citation parts (which should be the case when gedcom was
            # created by software).
            return (NO_SOURCE, self._sources[lookup_name])
        else:
            # We might have a bare source, created in the initial pass.
            # In this case, we'll complete its attributes, otherwise create
            # a new one
            if sour.id is not None:
                s = self._ids_sour[sour.id]
            else:
                s = models.Source(
                    higher_source=parent,
                    researcher=self._researcher,
                    last_change=last_change)

            s.title = title
            s.abbrev = abbr or title
            s.biblio = bibl or title
            s.comments = '\n\n'.join(notes)
            s.subject_date = subject_date
            s.save()

            # Associate with the repositories

            for r in repos:
                caln = []
                notes = []

                for a in r.fields:
                    if a.tag == "CALN":
                        medi = ""
                        for b in a.fields:
                            if b.tag == "MEDI":
                                self.ignore_fields(
                                    b, prefix=f"{prefix}.REPO.CALN")
                                medi = b.value
                            else:
                                self.ignored(
                                    b, prefix=f"{prefix}.REPO.CALN")

                        if medi:
                            caln.append(f"{a.value} ({medi})")
                        else:
                            caln.append(a.value)

                    elif a.tag == "NOTE":
                        self.ignore_fields(a, prefix=f"{prefix}.REPO")
                        notes.append(self._get_note(a))
                    else:
                        self.ignored(a, prefix=f"{prefix}.REPO")

                models.Repository_Source.objects.create(
                    repository=self._ids_repo[r.as_xref()],
                    source=s,
                    activity=None,
                    call_number="\n".join(caln),
                    description="\n\n".join(notes))

            # Create the citation parts

            for tag, value in attr:
                t = self._citation_part_types.get(tag, None)
                if t is None:
                    t = self._citation_part_types[tag] = \
                        models.Citation_Part_Type.objects.create(
                            gedcom=tag, name=tag)
                self._all_citation_parts.append(
                    models.Citation_Part(
                        source=s,
                        type=t,
                        value=value))

            # Create the source representations (multimedia and text)

            for ob in obje:
                self._process_OBJE(ob, source=s)

            for t in text:
                models.Representation.objects.create(
                    source=s,
                    file=None,
                    mime_type="text/plain",
                    comments=t)

            # Create anonymous events

            for a in events:
                date = None
                plac = self._extract_ADDR_PLAC_OBJE(a)

                for b in a.fields:
                    if b.tag == "DATE":
                        self.ignore_fields(b, prefix=f"{prefix}.DATA.EVEN")
                        date = b.value
                    elif b.tag in PLAC_OBJE_FIELDS:
                        pass # already handled
                    else:
                        self.ignored(b, prefix=f"{prefix}.DATA.EVEN")

                types = a.value or "EVEN"
                for tname in types.split(','):
                    tname = tname.strip()
                    t = self._event_types.get(tname, None)
                    if t is None:
                        t = self._event_types[tname] = \
                            models.Event_Type.objects.create(
                                gedcom=tname, name=tname)
                    e = models.Event.objects.create(
                        type=t,
                        place=plac,
                        name=t.name,
                        date=date)
                    anonymous = models.Persona.objects.create(
                        name="Anonymous from gedcom source",
                        description="Created automatically by importer",
                        last_change=last_change)
                    self._all_p2e.append(
                        models.P2E(
                            surety=self._default_surety,
                            researcher=self._researcher,
                            disproved=False,
                            person=anonymous,
                            event=e,
                            source=s,
                            role=self._principal,
                            last_change=last_change,
                            rationale="Event described in Gedcom"))

            # Return the source

            self._sources[lookup_name] = s
            return (sour.id or NO_SOURCE, s)

    def _extract_SOUR(self, parent, default_to_gedcom=True):
        """
        Extract all SOUR fields from `parent`, and return a list of sources.

        :return: list of (gedcomi, Source)
           This list is never empty if default_to_gedcom is True
        """
        source_nodes = []

        for f in parent.fields:
            if f.tag == "SOUR":
                x = f.as_xref()
                source_nodes.append(
                    self._process_SOUR(f, prefix=f"{parent.tag}.SOUR"))
            else:
                # Do not return ignored fields here
                pass

        if not source_nodes:
            # If no specific source was mentioned, we associate it directly
            # with the gedcom file itself
            if default_to_gedcom:
                return [(NO_SOURCE, self._source_for_gedcom)]
            else:
                return []

        return source_nodes

    def _extract_ADDR_PLAC_OBJE(self, event):
        """
        When `event` describes an event or an attribute, the source must be an
        xref. Thus any OBJE is in fact associated with the place itself.
        This function extracts both PLAC and OBJE fields and create the Place
        (or retrieve a matching one if one can be found).

        :return: (Place, string)
           The second part is a string describing the address fields that could
           not be added to the place.
        """

        # Check if the place already exists, since GEDCOM will duplicate
        # places unfortunately.
        # We need to take into account all the place parts, which is done
        # by simulating a long name including all the optional parts. We also
        # include non-standard fields added by various software.

        obje = []
        plac = None
        addr = None
        attr = []   # (gedcom, value), can have duplicates

        for f in event.fields:
            if f.tag == "PLAC":
                if plac is not None:
                    self.report_error(f, "Duplicate PLAC, ignored")
                plac = f

                for a in f.fields:
                    if a.tag in ("FORM", "NOTE"):
                        # FORM would in fact tell us how to split the name to
                        # get its various components, which we could use to
                        # initialize the place parts
                        self.ignore_fields(a, prefix=f"{event.tag}.PLAC")
                        attr.append((a.tag, self._get_note(a)))
                    elif a.tag in ("FONE", "ROMN"):
                        for b in a.fields:
                            if b == "TYPE":   # Appears once
                                self.ignore_fields(
                                    b, prefix=f"{event.tag}.PLAC.{a.tag}")
                                attr.append((b.value, a.value))
                            else:
                                self.ignore(
                                    b, prefix=f"{event.tag}.PLAC.{a.tag}")

                    elif a.tag == "MAP":
                        lat = ''
                        long = ''
                        for b in a.fields:
                            if b.tag == "LATI":
                                self.ignore_fields(
                                    b, prefix=f"{event.tag}.PLAC.MAP")
                                lat = b.value
                            elif b.tag == "LONG":
                                self.ignore_fields(
                                    b, prefix=f"{event.tag}.PLAC.MAP")
                                long = b.value
                            else:
                                self.ignored(
                                    b, prefix=f"{event.tag}.PLAC.MAP")
                        attr.append((f'MAP', f'{lat},{long}'))
            elif f.tag in ("ADDR", "_ADDR"):
                addr = f      # name = f.value
                for a in f.fields:
                    attr.append((a.tag, a.value))
            elif f.tag == "OBJE":
                obje.append(f)
            elif f.tag in ADDR_FIELDS:  # PHON, EMAIL, FAX,...
                attr.append((f.tag, f.value))
            else:
                # do not report ignored field in this function
                pass

        # Compute the name to use
        # Gedcom says we should use the value as the display name for the
        # address. The detailed fields are meant for search and filtering.

        name = ''
        if plac is not None and plac.value:
            name = plac.value
        if addr is not None and addr.value:
            # Assumes the name in PLAC and ADDR are the same, we can't store
            # both and this would result in duplicates.
            if not name:
                name = addr.value

        # Maybe there was no place ?

        if not name and not attr:
            # OBJE will be associated with other records (INDI,...)
            return None

        # Do we already have this place ?
        # Make up a temporary name using all possible attributes, as a lookup

        attr.sort()  # sort by gedcom name, then value
        lookup_name = f"{name} {' '.join(f'{n[0]}={n[1]}' for n in attr)}"

        p = self._places.get(lookup_name, None)
        if not p:
            # ??? Should create hierarchy of places
            p = models.Place.objects.create(
                name=name,
                date=None,
                parent_place=None)
            self._places[lookup_name] = p  # For reuse

            for gedcom, value in attr:
                pa = self._place_part_types.get(gedcom, None)
                if pa is None:
                    logger.info(f'Create new place part: {gedcom}')
                    pa = self._place_part_types[gedcom] = \
                        models.Place_Part_Type.objects.create(
                            gedcom=gedcom, name=gedcom)

                self._all_place_parts.append(
                    models.Place_Part(place=p, type=pa, name=value))

        # If an event has an OBJE: since the source is an xref, the object
        # is in fact associated with the place. Unfortunately, it will be
        # duplicated among all other occurrences of that place (which itself
        # is duplicated).
        # Make sure we do not add the same OBJE multiple times for a
        # given place.
        # A multimedia representation is always associated with a source, so
        # we create that source.
        # ??? Should this be a characteristic of the place instead ?

        known_obje = self._obje_for_places.setdefault(p, set())
        source_for_repr = None

        for o in obje:
            for repr in self._process_OBJE(
                o, unless_in=known_obje, source=source_for_repr, place=p):

                source_for_repr = repr.source

        return p

    def _process_OBJE(self, obje, unless_in=set(), source=None,
                      place=None, source_name=""):
        """
        Process a MULTIMEDIA_LINK or MULTIMEDIA_REC.
        Returns None if the gedcom object has already been created in
        `unless_in`. This also updates unless_in to store the returned object,
        to avoid duplicates.

        :param Source source:
           The resulting representations are associated with the Source object
           `source`. If this is None, a new source is automatically created.
        :param Place place:
            If specified, the representations are images/movies/... of that
            place.
        :return: a list of Representation objects
        """
        x = obje.as_xref()
        if x:
            if obje.fields:
                self.report_error(
                    obje, "Both XREF and inline fields are not supported")
            if x in unless_in:
                return []
            else:
                unless_in.add(x)
                return self._ids_obje[x]

        title = ""
        attr = []   # (property name, property value)
        files = []  # (filename, format, media type)
        default_mime = ""
        default_media = ""
        CHAN = datetime.datetime.now(
            django.utils.timezone.get_default_timezone())

        # Gedcom 5.5.0 had a shared FORM, used for all files
        for f in obje.fields:
            if f.tag == "FORM":
                default_mime = FORM_TO_MIME.get(
                    f.value, 'application/octet-stream')
                for a in f.fields:
                    if a.tag == "MEDI":
                        self.ignore_fields(a, prefix="OBJE.FORM")
                        default_media = v.value
                    else:
                        self.ignored(a, prefix="OBJE.FORM")
            else:
                # Do not report missing fields
                pass

        for f in obje.fields:
            if f.tag == "TITL":
                self.ignore_fields(f, prefix="OBJE")
                attr.append(("Title", f.value))
                title = f.value

            elif f.tag in ("FORM", "_TYPE", "_SCBK", "_PRIM", "NOTE",
                         "RIN", "REFN"):
                self.ignore_fields(f, prefix="OBJE")

                # ??? Should have a mapping to user-readable names
                attr.append((f.tag, f.value))

            elif f.tag == "FILE":
                filename = f.value
                mime = default_mime
                media = default_media

                for a in f.fields:
                    if a.tag == "FORM":
                        mime = FORM_TO_MIME.get(
                            a.value, 'application/octet-stream')
                        for b in a.fields:
                            if b.tag in ("MEDI", "TYPE"):
                                self.ignore_fields(b, prefix="OBJE.FILE.FORM")
                                media = v.value
                            else:
                                self.ignored(b, prefix="OBJE.FILE.FORM")

                    elif a.tag == "TITL":
                        # in a MULTIMEDIA_REC
                        self.ignore_fields(a, prefix="OBJE.FILE")
                        title = a.value
                    else:
                        self.ignored(a, prefix="OBJE.FILE")

                files.append((filename, mime, media))

            elif f.tag == "CHAN":
                CHAN = self._process_CHAN(f)

            elif f.tag == "FORM":
                pass # already handled

            else:   # in particular "BLOB" is not supported
                self.ignored(f, prefix="OBJE")

        attr.sort()
        lookup_name = "#".join(f'{n[0]}={n[1]}' for n in attr)
        if lookup_name in unless_in:
            return []

        comments = title + \
                "\n\n".join(f'{n[0]}: {n[1]}' for n in attr if n != "TITL")

        # Create a source if necessary, to which all representations will be
        # associated
        if not source:
            t = f'Media for {place.name if place else title}'
            source = self._sources.get(t, None)
            if source:
                # No need to add media again
                return []
            else:
                source = models.Source.objects.create(
                    last_change=CHAN,
                    subject_place=place,
                    researcher=self._researcher,
                    higher_source=self._source_for_gedcom,
                    title=t,
                    abbrev=t,
                    biblio=t)
                self._sources[t] = source

        return [
            models.Representation.objects.create(
                source=source,
                file=f[0],
                mime_type=f[1],
                comments=comments +
                   (f"\nFormat: {f[2] if f[2] else ''}"))
            for f in files]

    def _create_event(self, field, indi_and_role, surety, CHAN=None,
                      disproved=False, prefix=""):
        """
        Create a new event, associated with INDI by way of one or more
        assertions based on sources.

        :param list indi_and_role: list of individual to associate with the
           event, and their role
        :param str prefix: for error messages
        """

        assert isinstance(indi_and_role, list)

        # Find the type and name of event from the gedcom tag.
        # Priority is given to the "TYPE" field, which describes the event
        # more accurately.

        evt_type_name = ""
        evt_type = self._event_types[field.tag]
        type_descr = ''
        sources = self._extract_SOUR(field)
        date = None
        place = self._extract_ADDR_PLAC_OBJE(field)

        if prefix:
            prefix += "."

        # The notes we find are associated with the event, not with the source.
        # Since they are also found in the context of INDI, they thus belong
        # to both the event and the person, so we store them in p2e assertions
        notes = []

        for f in field.fields:
            if place is None and f.tag == "OBJE":
                self.ignored(f, prefix=prefix + field.tag)
            elif f.tag in PLAC_OBJE_FIELDS:
                pass # already processed
            elif f.tag in SOUR_FIELDS:
                pass  # already processed
            elif f.tag == "FAMC" and field.tag == "ADOP":
                pass  # already processed
            elif f.tag == "TYPE":
                self.ignore_fields(f, prefix=prefix + field.tag)
                type_descr = f' (f.value)'

                # In Gramps, an "EVEN" is used to represent events entered as
                # a person's event, for instance when the partner is not know.
                # There is no associated family.

                if f.value == 'Marriage':
                    evt_type = self._event_types['MARR']
                elif f.value == 'Engagement':
                    evt_type = self._event_types['ENGA']
                elif f.value == 'Residence':
                    evt_type = self._event_types['RESI']
                elif f.value == 'Separation':
                    evt_type = self._event_types['DIV']  # ??? incorrect
                elif f.value == 'Military':
                    evt_type = self._event_types['_MILT']
                else:
                    evt_type_name = f.value
                    type_descr = ''  # to avoid duplication in name of event

            elif f.tag == "DATE":
                self.ignore_fields(f, prefix=prefix + field.tag)
                date = f.value
            elif f.tag == "NOTE":
                self.ignore_fields(f, prefix=prefix + field.tag)
                notes.append(self._get_note(f))
            else:
                self.ignored(f, prefix=prefix + field.tag)

        # Create a descriptive name for the event

        name = field.value \
                if field.value and field.value not in ("Y", "N") else ""
        if not name:
            # type of event
            # More specific information for type
            # Principals
            name = f'{(evt_type_name or evt_type.name).title()}{type_descr} -- {" and ".join(p.name for p, role in indi_and_role if p and role == self._principal)}'

        # For each source, we duplicate the event.
        # Otherwise, we end up with multiple 'principal', 'mother',...
        # for the same event.
        # ??? We should then mark them as being the same event, via a
        # Place2Place table relationship.

        for sid, s in sources:
            e = models.Event.objects.create(
                type=evt_type,
                place=place,
                name=name,
                date=date)

            for p, role in indi_and_role:
                if p:
                    self._all_p2e.append(
                        models.P2E(
                            surety=surety,
                            researcher=self._researcher,
                            disproved=disproved,
                            person=self._indi_for_source(sourceId=sid, indi=p),
                            event=e,
                            source=s,
                            role=role,
                            last_change=CHAN,
                            rationale=("\n\n".join(notes)
                                       if role == self._principal
                                       else "")))

                    if role == self._principal and evt_type.gedcom == 'BIRT':
                        self._births[p._gedcom_id] = e

    def _process_INDI(self, data):
        """Add events and characteristics to an INDI"""

        indi = self._ids_indi[(NO_SOURCE, data.id)]

        for f in data.fields:
            if f.tag in ("CHAN", "FAMC", "FAMS", "ADOP"):
                # already taken into account in _create_bare_indi
                pass

            elif f.tag == "OBJE":
                d = GedcomRecord(
                    line=f.line,
                    tag='_IMG',
                    fields=[
                        f,
                        GedcomRecord(
                            line=f.line,
                            tag='SOUR',
                            fields=[
                                GedcomRecord(
                                    line=f.line,
                                    tag='TITL',
                                    value=f'Media for {indi.name}')
                            ])
                    ])
                self._create_characteristic(d, indi, CHAN=indi.last_change)

            elif f.tag in self._char_types:
                self._create_characteristic(
                    f, indi, CHAN=indi.last_change, prefix="INDI")
            elif f.tag[0] == "_" and f.value and not f.fields:
                # A GEDCOM extension by an application.  If this is a simple
                # string value, assume this is a characteristic.  Create the
                # corresponding type in the database, and import the field
                self._char_types[f.tag] = \
                    models.Characteristic_Part_Type.objects.create(
                        is_name_part=False, name=f.tag, gedcom=f.tag)
                self._create_characteristic(
                    f, indi, CHAN=indi.last_change, prefix="INDI")

            elif f.tag in self._event_types:
                self._create_event(
                    f, [(indi, self._principal)], CHAN=indi.last_change,
                    surety=self._default_surety, prefix="INDI")
            elif f.tag[0] == "_" and f.fields:
                # A GEDCOM extension as a complex value. Assume it is an event
                self._event_types[f.tag] = \
                    models.Event_Type.objects.create(gedcom=f.tag, name=f.tag)
                self._create_event(
                    f, [(indi, self._principal)], CHAN=indi.last_change,
                    surety=self._default_surety, prefix="INDI")

            elif f.tag == "SOUR":
                # The individual is apparently cited in a source, but is not
                # related to a specific GEDCOM event. So instead we associate
                # with a general census event.
                d = GedcomRecord(
                    line=f.line,
                    tag="CENS",
                    fields=[f])
                self._create_event(
                    d, [(indi, self._principal)],
                    CHAN=indi.last_change,
                    surety=self._default_surety)

            elif f.tag == "ASSO":
                related = self._ids_indi[(NO_SOURCE, f.as_xref())]
                relation = None

                for a in f.fields:
                    if a.tag == "RELA":
                        self.ignore_fields(a, prefix="INDI.ASSO")

                        l = a.value.lower()
                        relation = self._p2p_types.get(l, None)
                        if relation is None:
                            relation = models.P2P_Type.objects.create(
                                name=a.value)
                            self._p2p_types[l] = relation
                    else:
                        self.ignored(a, prefix="INDI.ASSO")

                if relation is None:
                    self.report_error(f, "ASSO without a RELA field")
                else:
                    self._all_p2p.append(
                        models.P2P(
                            surety=self._default_surety,
                            researcher=self._researcher,
                            last_change=indi.last_change,
                            person1=indi,
                            person2=related,
                            type=relation))

            elif f.tag == "ALIA":
                related = self._ids_indi[(NO_SOURCE, f.as_xref())]
                self._all_p2p.append(
                    models.P2P(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        last_change=indi.last_change,
                        person1=indi,
                        person2=related,
                        rationale="Marked as aliases in imported gedcom",
                        type_id=models.P2P_Type.sameAs))

            else:
                self.ignored(f, prefix='INDI')

##################################
# GedcomFileImporter
##################################

class GedcomFileImporter(geneaprove.importers.Importer):
    """Register a new importer in geneaprove: imports GEDCOM files"""

    class Meta:
        """see inherited documentation"""
        displayName = _('GEDCOM')
        description = _(
            'Imports a standard GEDCOM file, which most genealogy' +
            ' software can export to')

    def parse(self, filename):
        """Parse and import a gedcom file.
           :param filename:
               Either the name of a file, or an instance of a class compatible
               with file().
           :return:
               A tuple (success, errors), where errors might be None
        """

        try:
            with transaction.atomic():
                m = GedcomImporter(filename)
            return (True, m.errors_as_string())
        except Invalid_Gedcom as e:
            logger.error(f"Exception while parsing GEDCOM:{e.msg}")
            return (False, e.msg)
        except Exception as e:
            logger.error(f"Unexpected Exception during parsing: {e.msg}")
            return (False, traceback.format_exc())

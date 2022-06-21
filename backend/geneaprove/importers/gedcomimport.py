"""
Provides a gedcom importer
"""

import datetime
import logging
import traceback
import os
from typing import List, Tuple, Optional, BinaryIO, Union, Dict, Set

from django.utils.translation import ugettext as _
import django.utils.timezone
from django.db import transaction
from geneaprove.utils.gedcom import parse_gedcom
from geneaprove.utils.gedcom.exceptions import Invalid_Gedcom
from geneaprove.utils.gedcom.records import GedcomRecord
from geneaprove.utils.gedcom.grammar import ADDR_FIELDS, FAM_EVENT_FIELDS
from geneaprove.models import Project, Researcher_Project, Repository_Source
from geneaprove.models.asserts import P2P_Type, P2C, P2E, P2P, P2G, G2C
from geneaprove.models.characteristic import (
    Characteristic_Part_Type, Characteristic_Part, Characteristic)
from geneaprove.models.event import Event, Event_Type_Role, Event_Type
from geneaprove.models.group import Group, Group_Type
from geneaprove.models.persona import Persona
from geneaprove.models.place import Place, Place_Part_Type, Place_Part
from geneaprove.models.representation import Representation
from geneaprove.models.repository import Repository
from geneaprove.models.researcher import Researcher
from geneaprove.models.source import Source, Citation_Part_Type, Citation_Part
from geneaprove.models.surety import Surety_Scheme
import geneaprove.importers

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
INLINE_SOURCE = 'inline'
NO_SOURCE = 'nosource'   # gedcomid

FORM_TO_MIME = {
    'jpeg': 'image/jpeg',  # Gramps
    'image/png': 'image/png',  # Gramps
    'image/jpeg': 'image/jpeg',
    'png': 'image/png',  # rootsMagic
    'jpg': 'image/jpg',  # rootsMagic
    'JPG': 'image/jpg',  # rootsMagic
    '': 'application/octet-stream'}


class Famc:
    __slots__ = ("PEDI", "STAT", "NOTE", "FREL", "MREL")

    def __init__(self, PEDI: str, STAT: str, NOTE: List[str]):
        self.PEDI = PEDI
        self.STAT = STAT
        self.NOTE = NOTE


##################################
# GedcomImporter
##################################

class GedcomImporter:
    """
    Gedcom importer. This translates from the gedcom data model into our own,
    and can be used by any importer for which the software uses roughly the
    gedcom model.
    """

    def __init__(self, filename: Union[BinaryIO, str]):
        self.filename = filename
        self.errors: List[Tuple[int, str]] = []
        self._source_for_gedcom: Optional[Source] = None

        self._surety_scheme = Surety_Scheme.objects.get(id=1)
        parts = list(self._surety_scheme.parts.all())
        self._default_surety = parts[int(len(parts) / 2)]

        self._researcher: Optional[Researcher] = None

        self._obje_for_places: Dict[Place, Set[str]] = dict()
        # The OBJE created for each place.
        # This is needed because at least GRAMPS outputs the PLAC for an
        # event along with all its OBJE (so we have lots of duplicates)

        self._principal = Event_Type_Role.objects.get(
            pk=Event_Type_Role.PK_principal)
        self._birth__father = Event_Type_Role.objects.get(
            pk=Event_Type_Role.PK_birth__father)
        self._birth__mother = Event_Type_Role.objects.get(
            pk=Event_Type_Role.PK_birth__mother)
        self._adoption__adopting = Event_Type_Role.objects.get(
            pk=Event_Type_Role.PK_adoption__adopting)
        self._adoption__not_adopting = Event_Type_Role.objects.get(
            pk=Event_Type_Role.PK_adoption__not_adopting)

        self._event_types: Dict[str, Event_Type] = {}
        self._char_types: Dict[
            str,
            Optional[Characteristic_Part_Type],
            ] = {}
        self._citation_part_types: Dict[str, Citation_Part_Type] = {}
        self._place_part_types: Dict[str, Place_Part_Type] = {}
        self._p2p_types: Dict[str, P2P_Type] = {}
        self._group_types: Dict[str, Group_Type] = {}

        self._places: Dict[str, Place] = {}
        self._sources: Dict[str, Source] = {}     # lookup name => Source
        self._births: Dict[str, Event] = {}      # Indi gedcomid -> Event
        self._adoptions: Dict[
                str,   # Family gedcomid -> (GedcomRecord, child gedcom_id)
                List[
                    Tuple[
                        GedcomRecord,
                        str,   # person gedcomid
                    ]
                ]
            ] = {}
        self._famc: Dict[
                str,       # gedcom id of family
                Dict[
                    str,   # gedcomid id of individual
                    Famc,  # relationship of the individual with the family
                ]
            ] = {}

        self._create_enum_cache()

        self._all_place_parts: List[Place_Part] = []
        self._all_p2c: List[P2C] = []
        self._all_p2e: List[P2E] = []
        self._all_p2p: List[P2P] = []
        self._all_p2g: List[P2G] = []
        self._all_g2c: List[G2C] = []
        self._all_char_parts: List[Characteristic_Part] = []
        self._all_citation_parts: List[Citation_Part] = []

        # Matches gedcom ids with objects in the database. Those objects are
        # created in an initial pass, so that xref can be resolved later on.

        self._ids_subm: Dict[str, Researcher] = {}  # from gedcom id
        self._ids_repo: Dict[str, Repository] = {}  # from gedcom id
        self._ids_note: Dict[str, str] = {}         # from gedcom id
        self._ids_obje: Dict[str, List[Representation]] = {}
        self._ids_sour: Dict[str, Source] = {}

        self.gedcom_ids: Dict[Persona, str] = {}

        # Returns the person to use for a given source (or NO_SOURCE for
        # those events and characteristics with no source)
        self._ids_indi: Dict[
            Tuple[str, str],   # (source gedcomid, indi gedcom)
            Persona] = {}

        def print_warning(filename: str, line: int, msg: str) -> None:
            self.errors.append((line, msg))

        d = parse_gedcom(
            self.filename,
            print_warning=print_warning,
        )
        assert d is not None
        self._data = d
        self._process_FILE()

    def _process_FILE(self) -> None:
        self._create_ids()
        self.execute_bulks()

    def _create_ids(self) -> None:
        for f in self._data.fields:
            if f.tag == "SUBM":
                assert f.id is not None, 'missing id at toplevel'
                self._ids_subm[f.id] = self._create_bare_SUBM(f)
            elif f.tag == "NOTE":
                assert f.id is not None, 'missing id at toplevel'
                self._ids_note[f.id] = f.value
            elif f.tag == "INDI":
                assert f.id is not None, 'missing id at toplevel'
                self._ids_indi[(NO_SOURCE, f.id)] = self._create_bare_indi(f)

        for f in self._data.fields:
            if f.tag == "SUBM":
                assert f.id is not None, 'missing id at toplevel'
                self._process_SUBM(f, self._ids_subm[f.id])
            elif f.tag == "HEAD":
                self._source_for_gedcom = self._process_HEAD(f)  # Need SUBM

        for f in self._data.fields:
            if f.tag == "SOUR":
                assert f.id is not None, 'missing id at toplevel'
                self._ids_sour[f.id] = self._create_bare_sour(f)  # need HEAD

        for f in self._data.fields:
            if f.tag == "REPO":
                assert f.id is not None, 'missing id at toplevel'
                r = self._process_REPO(f)  # Need NOTE
                assert r is not None
                self._ids_repo[f.id] = r
            elif f.tag == "OBJE":
                assert f.id is not None, 'missing id at toplevel'
                # Need bare source,NOTE
                self._ids_obje[f.id] = self._process_OBJE(f)

        # Parse toplevel sources, since we'll need their title for nested
        # sources
        for f in self._data.fields:
            if f.tag == "SOUR":
                assert f.id is not None, 'missing id at toplevel'
                self._ids_sour[f.id] = self._process_SOUR(
                    f)[1]  # Need NOTE/OBJE

        for f in self._data.fields:
            if f.tag in ("HEAD", "SUBM", "TRLR", "NOTE", "SUBN",
                         "SOUR", "REPO"):
                pass   # nothing else to do
            elif f.tag == "INDI":
                self._process_INDI(f)  # Need FAM,SOUR,NOTE,OBJE,SUBM
            elif f.tag == "FAM":
                self._process_FAM(f)   # Need bare indi, SOUR

        for f, name in self._data.report_not_imported():
            self.report_error(
                f,
                f"Ignored {name}",
            )

    def _process_HEAD(self, head: GedcomRecord) -> Source:
        created_by = 'unknown'
        date = None

        name = (
            self.filename if isinstance(self.filename, str)
            else self.filename.name if hasattr(self.filename, 'name')
            else 'uploaded'
        )

        for f in head.fields:
            if f.tag == "SUBM":
                xref = f.as_xref()
                assert xref is not None
                self._researcher = self._ids_subm[xref]
            elif f.tag == "FILE":
                self._create_project(f, researcher=self._researcher)
            elif f.tag == "CHAR":
                _ = f.value   # handled in the lexical parser itself.

            elif f.tag == "SOUR":
                created_by = f.value

                for a in f.fields:
                    if a.tag in ("VERS", "CORP"):
                        _ = a.value            # Ignored, nothing to import
                    elif a.tag == "NAME":
                        created_by = a.value   # override f.value
                    elif a.tag == "DATA":
                        for b in a.fields:
                            if b.tag == "DATE":  # publication date
                                date = self._process_DATE(b)
                            elif b.tag == "COPR":
                                _ = b.value
                                pass
            elif f.tag == "GEDC":
                for a in f.fields:
                    if a.tag in ("FORM", "VERS"):
                        _ = a.value    # Ignored, nothing to import
            elif f.tag in ("DEST", "COPR", "LANG"):
                _ = f.value   # ignored, nothing to import

            elif f.tag == "DATE":     # transmission date
                if date is None:
                    date = self._process_DATE(f)

        date_str = date.strftime('%Y-%m-%d %H:%M:%S %Z') if date else None
        imported_date_time = datetime.datetime.now(
            django.utils.timezone.get_default_timezone()).strftime(
                "%Y-%m-%d %H:%M:%S %Z")

        researcher_name = (
            self._researcher.name if self._researcher else "unknown")

        title = (
            f'"{os.path.basename(name)}", '
            f'{researcher_name}, '
            f'exported from {created_by}, '
            f'created on {date_str}, '
            f'imported on {imported_date_time}')

        return Source.objects.create(
            jurisdiction_place_id=None,
            researcher=self._researcher,
            subject_date=date,
            title=title,
            abbrev=title,
            biblio=title,
            last_change=date or django.utils.timezone.now(),
        )

    def _create_bare_indi(self, indi: GedcomRecord) -> Persona:
        """
        Create an entry for an INDI in the database, with no associated event
        or characteristic.
        """
        assert indi.id is not None

        name = ''
        chan = None
        for f in indi.fields:
            if f.tag == "NAME":
                # The children (SURN,...) will be imported as characteristics
                # later on. The text itself, though, is only a summary added by
                # the exporter. The Gedcom standard says that only the first
                # such name should be used to describe the person, so that's
                # what we import as the display_name.
                # We still read f.value always to mark it as imported, though
                display_name = f.value
                name = name or display_name

            elif f.tag == "CHAN":
                chan = self._process_CHAN(f)
            elif f.tag == "FAMS":
                # When we parse the family itself, we will get the list of
                # members, which is the reverse of the FAMS relationship. We
                # do not need an actual import of FAMS
                _ = f.value
            elif f.tag == "FAMC":   # family-child relationship
                xref = f.as_xref()
                assert xref is not None
                famc = self._famc.setdefault(xref, {})
                n = famc[indi.id] = Famc(
                    PEDI='birth',
                    STAT='proven',
                    NOTE=[],
                )

                for a in f.fields:
                    if a.tag == "PEDI":
                        n.PEDI = a.value
                    elif a.tag == "STAT":
                        n.STAT = a.value
                    elif a.tag == "NOTE":
                        n.NOTE.append(self._get_note(a))

            elif f.tag == "ADOP":
                # Special case for adoptions: we need to associate with the
                # parents, although potentially only one parent has adopted.

                famc_xref = None
                for a in f.fields:
                    if a.tag == "FAMC":
                        famc_xref = a.as_xref()
                        # Other fields parsed later in _process_FAM

                if famc_xref is not None:
                    self._adoptions.setdefault(
                        famc_xref,
                        []
                        ).append((f, indi.id))
                else:
                    self.report_error(f, "ADOP without a FAM")

            else:
                # do not report on ignored or unexpected fields here
                pass

        p = Persona.objects.create(
            display_name=name, description=None,
            last_change=chan or django.utils.timezone.now())
        self.gedcom_ids[p] = indi.id
        return p

    def _create_bare_sour(self, sour: GedcomRecord) -> Source:
        """
        Create a basic source object, with no attributes set
        """

        chan = None

        for f in sour.fields:
            if f.tag == "CHAN":
                chan = self._process_CHAN(f)
            # Do not report on ignored or unexpected fields

        return Source.objects.create(
            higher_source=self._source_for_gedcom,
            researcher=self._researcher,
            last_change=chan or django.utils.timezone.now())

    def _create_bare_SUBM(self, subm: GedcomRecord) -> Researcher:
        r: Optional[Researcher] = None

        for a in subm.fields:
            if a.tag == "NAME":
                r = Researcher.objects.create(name=a.value, place=None)

        if r is None:
            r = Researcher.objects.create(name='', place=None)

        return r

    def _process_SUBM(self, subm: GedcomRecord, result: Researcher) -> None:
        """
        Process a SUBM record to create a researcher
        :param subm: the SUBM field
        :param result: the object to decorate
        """

        name: Optional[str] = None
        place = self._extract_ADDR_PLAC_OBJE(subm, sources=[])

        for f in subm.fields:
            if f.tag == "NAME":
                name = f.value or 'unknown'

        assert name is not None
        result.name = name
        result.place = place
        result.save()

    def execute_bulks(self) -> None:
        Place_Part.objects.bulk_create(self._all_place_parts)
        P2C.objects.bulk_create(self._all_p2c)
        P2E.objects.bulk_create(self._all_p2e)
        P2P.objects.bulk_create(self._all_p2p)
        P2G.objects.bulk_create(self._all_p2g)
        G2C.objects.bulk_create(self._all_g2c)
        Characteristic_Part.objects.bulk_create(self._all_char_parts)
        Citation_Part.objects.bulk_create(self._all_citation_parts)

    def _create_project(
            self,
            file: GedcomRecord,
            researcher: Optional[Researcher],
            ) -> None:
        """
        Register the project in the database
        :param GedcomRecord file: the "HEAD.FILE"
        """

        p = Project.objects.create(
            name='Gedcom import',
            description=f'Import from {file.value}',
            scheme=self._surety_scheme)
        if researcher:
            Researcher_Project.objects.create(
                researcher=researcher,
                project=p,
                role='Generated GEDCOM file')
        return p

    def unexpected(self, field: GedcomRecord) -> None:
        self.report_error(field, f"Unexpected tag {field.tag}")

    def report_error(self, field: GedcomRecord, msg: str) -> None:
        logger.debug('Line %s: %s', field.line, msg)
        self.errors.append((field.line, msg))

    def errors_as_string(self) -> str:
        self.errors.sort(key=lambda e: e[0] if e[0] is not None else -1)

        return "\n".join(
            f'Line {"???" if line is None else line}: {msg}'
            for (line, msg) in self.errors
        )

    def _create_enum_cache(self) -> None:
        """Create a local cache for enumeration tables"""

        for evt in Event_Type.objects.exclude(gedcom__isnull=True):
            if evt.gedcom:
                self._event_types[evt.gedcom] = evt

        types = Characteristic_Part_Type.objects.exclude(
            gedcom__isnull=True)
        for c in types:
            if c.gedcom:
                self._char_types[c.gedcom] = c

        self._char_types['_MIDL'] = \
            Characteristic_Part_Type.objects.get(gedcom='_MIDL')

        # Handled specially in _parse_characteristic
        self._char_types['NAME'] = None

        for p in Place_Part_Type.objects.exclude(gedcom__isnull=True):
            self._place_part_types[p.gedcom] = p

        for g in Group_Type.objects.exclude(gedcom__isnull=True):
            self._group_types[g.gedcom] = g

        cit_part_types = Citation_Part_Type.objects.exclude(
            gedcom__isnull=True
        )
        for p in cit_part_types:
            self._citation_part_types[p.gedcom] = p

        for p in P2P_Type.objects.all():
            self._p2p_types[p.name.lower()] = p

    def _process_CHAN(
            self,
            chan: Union[None, GedcomRecord, datetime.datetime],
            ) -> datetime.datetime:
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
            return result
        else:
            return chan   # already parsed earlier

    def _process_DATE(self, date: GedcomRecord) -> datetime.datetime:
        """
        Return a datetime object from data (a DATE record).
        The TIME is also taken into account, if specified.
        """
        if date:
            d = date.value

            tmp = datetime.datetime.strptime(d, "%d %b %Y")

            for f in date.fields:
                if f.tag == "TIME":
                    tmp = datetime.datetime.strptime(
                        d + " " + f.value, "%d %b %Y %H:%M:%S")

            return django.utils.timezone.make_aware(
                tmp, django.utils.timezone.get_default_timezone())

        return datetime.datetime.now(
            django.utils.timezone.get_default_timezone())

    def _process_REPO(self, repo: GedcomRecord) -> Optional[Repository]:
        """
        Create a Repository
        """

        place = self._extract_ADDR_PLAC_OBJE(repo, sources=[])
        name = ''
        info = []
        chan = self._process_CHAN(None)

        for f in repo.fields:
            if f.tag == "NAME":
                name = f.value
            elif f.tag == "RIN":
                info.append(f"Automated record id: {f.value}")
            elif f.tag == "REFN":
                added = False
                for a in f.fields:
                    if a.tag == "TYPE":
                        added = True
                        info.append(f"{a.value}: {f.value}")
                if not added:
                    info.append(f"Reference number: {f.value}")
            elif f.tag == "CHAN":
                chan = self._process_CHAN(f)
            elif f.tag == "NOTE":
                info.append(self._get_note(f))

        info_str = '\n'.join(info)

        if info_str or place or name:
            return Repository.objects.create(
                place=place,
                name=name or info_str,
                type=None,
                info=info_str,
                last_change=chan,
            )
        return None

    def _process_FAM(self, fam: GedcomRecord) -> None:
        """Create the equivalent of a FAMILY in the database"""

        assert fam.id is not None
        husb = None
        wife = None
        children = []
        fam_events: List[GedcomRecord] = []  # events for the family
        fam_chars: List[GedcomRecord] = []   # characteristics of the family
        notes: List[GedcomRecord] = []
        chan = self._process_CHAN(None)
        sources = self._extract_SOUR(fam, default_to_gedcom=True)

        for f in fam.fields:
            if f.tag == "HUSB":
                xref = f.as_xref()
                assert xref is not None
                husb = self._ids_indi[(NO_SOURCE, xref)]
            elif f.tag == "WIFE":
                xref = f.as_xref()
                assert xref is not None
                wife = self._ids_indi[(NO_SOURCE, xref)]
            elif f.tag == "CHIL":
                children.append(f)
            elif f.tag == "CHAN":
                chan = self._process_CHAN(f)
            elif f.tag == "NOTE":
                fam_chars.append(f)
            elif f.tag in FAM_EVENT_FIELDS:
                fam_events.append(f)
            elif f.tag in self._char_types:
                fam_chars.append(f)

        # We might have a family with children only.
        # Or a family with only one parent.
        # In such cases, we create the missing parents, so the siblings
        # are not lost (if we created a single parent, there might still
        # be ambiguities if that parent also belonged to another family

        if not husb:
            husb = Persona.objects.create(
                display_name=f"@Unknown husband in family {fam.id}@"
            )
        if not wife:
            wife = Persona.objects.create(
                display_name=f"@Unknown wife in family {fam.id}@"
            )

        # For all events, the list of individuals

        husb_and_wife = [
            (husb, self._principal),
            (wife, self._principal)
        ]

        # Get the FAMC information for all individuals
        famc = self._famc.get(fam.id, {})

        # Process all events. We memorize those events that build the family
        # in our model (since there is no explicit Family entity). We will then
        # associate the gedcom family characteristics to those events instead.

        found = 0

        for e in fam_events:
            found += 1
            self._create_event(
                e,
                husb_and_wife,
                CHAN=chan,
                surety=self._default_surety,
                prefix="FAM",
            )

        # Now add the children.
        # If there is an explicit BIRT event for the child, this was already
        # fully handled in _create_indi, so we do nothing more here. But if
        # there is no known BIRT even, we still need to associate the child
        # with its parents.

        for child in children:   # GedComRecord for CHIL
            xr = child.as_xref()
            assert xr is not None

            famc_for_child = famc.get(xr, None)
            if famc_for_child is None:
                famc_for_child = famc[xr] = Famc('', '', [])

            pedi = famc_for_child.PEDI = 'birth'
            stat = famc_for_child.STAT = 'proven'

            ev: Optional[Event] = self._births.get(xr, None)
            c = self._ids_indi[(NO_SOURCE, xr)]

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

            if ev is None:
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
                for s in sources:
                    for p, role in parents:
                        self._all_p2e.append(P2E(
                            surety=surety,
                            researcher=self._researcher,
                            disproved=False,
                            person=p,
                            event=ev,
                            source=s[1],
                            role=role,
                            last_change=chan,
                            rationale='',
                        ))

        # Handle adoptions

        for ged, indi_id in self._adoptions.get(fam.id, []):
            adop = "BOTH"
            for a in ged.fields:
                if a.tag == "FAMC":
                    for b in a.fields:
                        if b.tag == "ADOP":
                            adop = b.value

            child2 = self._ids_indi[(NO_SOURCE, indi_id)]

            roles: List[Tuple[Optional[Persona], int]] = [
                (child2, self._principal)
            ]
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
                ged, roles, CHAN=child2.last_change,
                surety=self._default_surety)

        # if there is no event to "build" the family, we generate a dummy
        # one. Otherwise there would be no relationship between husband and
        # wife in the geneaprove database, thus losing information from gedcom

        if found == 0:
            self._create_event(
                GedcomRecord(line=fam.line,
                             tag="EVEN",
                             fields=[
                                 GedcomRecord(
                                     line=fam.line,
                                     tag="TYPE",
                                     value="Family")
                             ]),
                husb_and_wife,
                extra_sources=sources,
                CHAN=chan,
                surety=self._default_surety,
            )

        # If we have family characteristics, we create a group for
        # the family, so that the events are not duplicated for each member.
        # Likewise if we have sources for the family

        if fam_chars or notes or sources:
            all_persons: List[Optional[Persona]] = [husb, wife]
            for x in children:
                xr = x.as_xref()
                if xr is not None:
                    all_persons.append(self._ids_indi[(NO_SOURCE, xr)])

            g = Group.objects.create(
                type=self._group_types["FAM"],
                place=None,
                name=f"Family {fam.id}",
            )
            for source in sources:
                for indi in all_persons:
                    self._all_p2g.append(P2G(
                        surety=self._default_surety,
                        last_change=chan,
                        person=indi,
                        group=g,
                        source=source[1],
                    ))

                for fam_char in fam_chars:
                    char = self._parse_characteristic(fam_char, sources)
                    G2C.objects.create(
                        surety=self._default_surety,
                        last_change=chan,
                        group=g,
                        characteristic=char,
                        source=source[1],
                    )

    def _indi_for_source(self, sourceId: str, indi: Persona) -> Persona:
        """
        Return the instance of Persona to use for the given source.
        A new one is created as needed.
        sourceId should be "INLINE_SOURCE" for inline sources (since this
        source cannot occur in a different place anyway).
        sourceId should be "NO_SOURCE" when not talking about a specific
        source.
        """

        gedcom_id = self.gedcom_ids.get(indi)

        if (
                not MULTIPLE_PERSONAS
                or sourceId == NO_SOURCE
                or gedcom_id is None
           ):
            return indi

        if sourceId != INLINE_SOURCE:
            p = self._ids_indi.get((sourceId, gedcom_id), None)
            if p:
                return p

        ind = Persona.objects.create(
            display_name=indi.display_name,
            description='',  # was set for the first persona already
            last_change=indi.last_change)

        if sourceId != INLINE_SOURCE:
            self._ids_indi[(sourceId, gedcom_id)] = ind

        # Link old and new personas

        self._all_p2p.append(P2P(
            surety=self._default_surety,
            researcher=self._researcher,
            person1=indi,
            person2=ind,
            type_id=P2P_Type.sameAs,
            rationale='Single individual in the gedcom file',
        ))
        return ind

    def _get_note(self, field: GedcomRecord) -> str:
        """
        Retrieve the content of the NOTE field
        """
        x = field.as_xref()
        return self._ids_note[x] if x else field.value

    def _parse_characteristic(
            self,
            field: GedcomRecord,
            sources: List[Tuple[str, Source]],
            ) -> Characteristic:
        """
        Parse a Characteristic record

        As defined in the GEDCOM standard, and except for the NAME which
        is special, all other attributes follow the following grammar:
            n TITL nobility_type_title
            +1 <EVENT_DETAIL>
        where EVENT_DETAIL can define any of the following: TYPE, DATE,
        PLAC, ADDR, AGE, AGNC, CAUS, SOUR, NOTE, MULT
        """

        typ = (
            # Special handling for name: its value was used to create the
            # person itself, and now we are only looking into its subelements
            # for the components of the name
            None
            if field.tag == 'NAME'
            else self._char_types[field.tag]
        )

        place = self._extract_ADDR_PLAC_OBJE(field, sources=sources)
        date = None

        # First pass to find information required to create characteristic

        for f in field.fields:
            if f.tag == "DATE":
                date = f.value

        c = Characteristic.objects.create(
            place=place,
            name=(typ and typ.name) or field.tag.capitalize(),
            date=date)

        # The main characteristic part is the value found on the same
        # GEDCOM line as the characteristic itself. For simple
        # characteristics like "SEX", this will in fact be the only part.

        if typ:
            if field.tag == 'NOTE':
                v = self._get_note(field)
            else:
                v = field.value or ''

            self._all_char_parts.append(
                Characteristic_Part(characteristic=c, type=typ, name=v))

        # For a NAME (typ is None), we might not have any decomposition, in
        # which case we should still create at least one part for the
        # characteristic

        elif not field.fields and field.value:
            self._all_char_parts.append(
                Characteristic_Part(
                    characteristic=c,
                    type=self._char_types["SURN"],
                    name=field.value,
                ))

        # Second pass to add characteristic parts

        for f in field.fields:
            if place is None and f.tag == "OBJE":
                if sources:
                    for sid, s in sources:
                        self._process_OBJE(f, source=s)

            elif f.tag == "NOTE":
                self._all_char_parts.append(
                    Characteristic_Part(
                        characteristic=c,
                        type=self._char_types["NOTE"],
                        name=self._get_note(f)))

            elif f.tag == "GIVN" and GIVEN_NAME_TO_MIDDLE_NAME:
                givn = self._char_types[f.tag]
                midl = self._char_types['_MIDL']
                n = f.value.replace(',', ' ').split(' ')
                self._all_char_parts.append(
                    Characteristic_Part(
                        characteristic=c, type=givn, name=n[0]))
                self._all_char_parts.extend(
                    Characteristic_Part(
                        characteristic=c, type=midl, name=m)
                    for m in n[1:] if m)

            elif f.tag in self._char_types:
                # Includes "TYPE", since "FACT.TYPE" explains what the
                # attribute is about.
                t = self._char_types[f.tag]
                self._all_char_parts.append(
                    Characteristic_Part(
                        characteristic=c,
                        type=t,
                        name=f.value,
                    )
                )

        return c

    def _create_characteristic(
            self,
            field: GedcomRecord,
            indi: Persona,
            CHAN: datetime.datetime = None,
            prefix="",
            ) -> None:
        """
        Create a Characteristic for the person indi.
        """
        sources = self._extract_SOUR(field)
        last_change = self._process_CHAN(CHAN)
        c = self._parse_characteristic(field, sources)

        for sid, s in sources:
            self._all_p2c.append(
                P2C(
                    surety=self._default_surety,
                    researcher=self._researcher,
                    person=self._indi_for_source(sourceId=sid, indi=indi),
                    last_change=last_change,
                    source=s,
                    characteristic=c)
            )

    def _process_SOUR(
            self,
            sour: GedcomRecord,
            ) -> Tuple[str, Source]:
        """
        Process one SOUR node and returns corresponding Source object
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
        subject_date: Optional[str] = None
        events = []  # Anonymous events referenced in source

        x = sour.as_xref()
        if x:
            parent = self._ids_sour[x]
            title = parent.title or ''
            abbr = parent.abbrev or ''
            bibl = parent.biblio or ''

        for f in sour.fields:
            if f.tag == "TITL":
                title = f.value
            elif f.tag == "ABBR":
                abbr = f.value
            elif f.tag == "_BIBL":
                bibl = f.value
            elif f.tag in ("AUTH", "PUBL", "TEXT", "RIN",
                           "_SUBQ", "PAGE", "QUAY", "_QUAL", "_INFO"):
                attr.append((f.tag, f.value))
            elif f.tag == "CHAN":
                last_change = self._process_CHAN(f)
            elif f.tag == "NOTE":
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
                        notes.append(f"Agency: {a.value}")
                    elif a.tag == "NOTE":
                        notes.append(a.value)
                    elif a.tag == "DATE":   # for SOURCE_CITATION
                        if subject_date:
                            self.report_error(a, "Multiple DATA.DATE")
                        subject_date = a.value
                    elif a.tag == "TEXT":   # for SOURCE_CITATION
                        text.append(a.value)

        attr.sort()  # sort by gedcom name, then value
        if x:
            a_s = f"{', '.join(f'{n[0]}: {n[1]}' for n in attr)}"
            if a_s:
                title = f"{title} ({a_s})"
                abbr = f"{abbr} ({a_s})"
                bibl = f"{bibl} ({a_s})"

        lookup_name = (
            f'TITL={title} ABBR={abbr or title} _BIBL={bibl or title}'
            f' {" ".join(f"{n[0]}={n[1]}" for n in attr)}'
        )

        if lookup_name in self._sources:
            s = self._sources[lookup_name]
        elif sour.id is not None:
            # We might have a bare source, created in the initial pass.
            # In this case, we'll complete its attributes, otherwise create
            # a new one
            s = self._ids_sour[sour.id]
        else:
            s = Source(
                higher_source=parent,
                researcher=self._researcher,
                last_change=last_change)

        # We might have a bare source, created in the initial pass.
        # In this case, we'll complete its attributes, otherwise create
        # a new one
        if sour.id is not None:
            s = self._ids_sour[sour.id]
        else:
            s = Source(
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
                            medi = b.value

                    if medi:
                        caln.append(f"{a.value} ({medi})")
                    else:
                        caln.append(a.value)

                elif a.tag == "NOTE":
                    notes.append(self._get_note(a))

            rr = r.as_xref()
            assert rr is not None

            Repository_Source.objects.create(
                repository=self._ids_repo[rr],
                source=s,
                activity=None,
                call_number="\n".join(caln),
                description="\n\n".join(notes))

        # Create the citation parts

        for tag, value in attr:
            cp = self._citation_part_types.get(tag, None)
            if cp is None:
                cp = self._citation_part_types[tag] = \
                    Citation_Part_Type.objects.create(gedcom=tag, name=tag)
            self._all_citation_parts.append(
                Citation_Part(
                    source=s,
                    type=cp,
                    value=value))

        # Create the source representations (multimedia and text)

        for ob in obje:
            self._process_OBJE(ob, source=s)

        for txt in text:
            Representation.objects.create(
                source=s,
                file=None,
                mime_type="text/plain",
                comments=txt)

        # Create anonymous events

        for a in events:
            date = None
            plac = self._extract_ADDR_PLAC_OBJE(
                a,
                sources=[(sour.id or NO_SOURCE, s)]
            )

            for b in a.fields:
                if b.tag == "DATE":
                    date = b.value

            types = a.value or "EVEN"
            for tname in types.split(','):
                tname = tname.strip()
                et = self._event_types.get(tname, None)
                if et is None:
                    et = self._event_types[tname] = \
                        Event_Type.objects.create(
                            gedcom=tname, name=tname)
                ev = Event.objects.create(
                    type=et,
                    place=plac,
                    name=et.name,
                    date=date)
                anonymous = Persona.objects.create(
                    description="Created automatically by importer",
                    display_name='Anonymous from gedcom source',
                    last_change=last_change)
                self._all_p2e.append(
                    P2E(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        disproved=False,
                        person=anonymous,
                        event=ev,
                        source=s,
                        role=self._principal,
                        last_change=last_change,
                        rationale="Event described in Gedcom"))

        # Return the source

        self._sources[lookup_name] = s
        return (sour.id or NO_SOURCE, s)

    def _extract_SOUR(
            self,
            parent: GedcomRecord,
            default_to_gedcom=True,
            ) -> List[Tuple[str, Source]]:
        """
        Extract all SOUR fields from `parent`, and return a list of sources.

        :return: list of (gedcomid, Source)
           This list is never empty, if default_to_gedcom is True
        """
        assert self._source_for_gedcom is not None
        source_nodes: List[Tuple[str, Source]] = []

        for f in parent.fields:
            if f.tag == "SOUR":
                source_nodes.append(self._process_SOUR(f))

        if not source_nodes:
            # If no specific source was mentioned, we associate it directly
            # with the gedcom file itself
            if default_to_gedcom:
                return [(NO_SOURCE, self._source_for_gedcom)]
            else:
                return []

        return source_nodes

    def _extract_ADDR_PLAC_OBJE(
            self,
            event: GedcomRecord,
            sources: List[Tuple[str, Source]],
            ) -> Optional[Place]:
        """
        Extracts the PLAC attribute for an event or attribute.
        `sources` should be the list of SOUR for the event.
        :return:
           An existing matching place or a newly created place.
        """

        # Check if the place already exists, since GEDCOM will duplicate
        # places unfortunately.
        # We need to take into account all the place parts, which is done
        # by simulating a long name including all the optional parts. We also
        # include non-standard fields added by various software.

        obje: List[GedcomRecord] = []
        plac: Optional[GedcomRecord] = None
        addr: Optional[GedcomRecord] = None
        attr: List[Tuple[str, str]] = []  # (gedcom, value) with duplicates

        for f in event.fields:
            if f.tag == "PLAC":
                assert plac is None    # detected by gedcom.py otherwise
                plac = f

                for a in f.fields:
                    if a.tag in ("FORM", "NOTE"):
                        # FORM would in fact tell us how to split the name to
                        # get its various components, which we could use to
                        # initialize the place parts
                        attr.append((a.tag, self._get_note(a)))
                    elif a.tag in ("FONE", "ROMN"):
                        for b in a.fields:
                            if b.tag == "TYPE":   # Appears once
                                attr.append((b.value, a.value))

                    elif a.tag == "MAP":
                        lat = ''
                        long = ''
                        for b in a.fields:
                            if b.tag == "LATI":
                                lat = b.value
                            elif b.tag == "LONG":
                                long = b.value

                        if lat or long:
                            attr.append(('MAP', f'{lat},{long}'))

            elif f.tag in ("ADDR", "_ADDR"):
                addr = f
                for a in f.fields:
                    attr.append((a.tag, a.value))
            elif f.tag == "OBJE":
                obje.append(f)
            elif f.tag in ADDR_FIELDS:  # PHON, EMAIL, FAX,...
                attr.append((f.tag, f.value))

        # If there are OBJE fields, they are associated with:
        # - the sources if there is any inlined source information (so
        #   excluding xref, for which OBJE would be defined elsewhere).
        # - else the place if there is any
        #   ??? We should likely create a source with only one assertion
        #   that says "representation for place". Media should only be
        #   associated with sources.
        # - else a new empty source created on the fly. This source is added
        #   to `sources`

        if obje:
            for s in sources:
                if s[0] == NO_SOURCE:  # an inlined source
                    for o in obje:
                        for repr in self._process_OBJE(o, source=s[1]):
                            pass
                    obje = []
                    break

        elif plac is not None:
            pass   # we will associate the OBJE with the place

        else:
            # create a new empty source
            # ??? For now, OBJE is reported as not imported
            obje = []
            pass

        # Maybe there was no place ?

        if plac is None and addr is None:
            return None

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

        # Do we already have this place ?
        # Make up a temporary name using all possible attributes, as a lookup

        attr.sort()  # sort by gedcom name, then value
        lookup_name = f"{name} {' '.join(f'{n[0]}={n[1]}' for n in attr)}"

        p = self._places.get(lookup_name, None)
        if not p:
            # ??? Should create hierarchy of places
            new_p = Place.objects.create(
                name=name,
                date=None,
                parent_place=None)
            self._places[lookup_name] = new_p  # For reuse

            for gedcom, value in attr:
                pa = self._place_part_types.get(gedcom, None)
                if pa is None:
                    logger.info(f'Create new place part: {gedcom}')
                    pa = self._place_part_types[gedcom] = \
                        Place_Part_Type.objects.create(
                            gedcom=gedcom, name=gedcom)

                self._all_place_parts.append(
                    Place_Part(place=new_p, type=pa, name=value))
        else:
            new_p = p

        # If an event has an OBJE: since the source is an xref, the object
        # is in fact associated with the place. Unfortunately, it will be
        # duplicated among all other occurrences of that place (which itself
        # is duplicated).
        # Make sure we do not add the same OBJE multiple times for a
        # given place.
        # A multimedia representation is always associated with a source, so
        # we create that source.
        # ??? Should this be a characteristic of the place instead ?

        known_obje = self._obje_for_places.setdefault(new_p, set())
        source_for_repr = None

        for o in obje:
            for repr in self._process_OBJE(
                    o,
                    unless_in=known_obje,
                    source=source_for_repr,
                    place=new_p,
                    ):
                source_for_repr = repr.source

        return new_p

    def _process_OBJE(
            self,
            obje: GedcomRecord,
            unless_in: Set[str] = None,
            source: Source = None,
            place: Place = None,
            source_name="",
            ) -> List[Representation]:
        """
        Process a MULTIMEDIA_LINK or MULTIMEDIA_REC.
        Returns None if the gedcom object has already been created in
        `unless_in`. This also updates unless_in to store the returned object,
        to avoid duplicates.

        :param source:
           The resulting representations are associated with the Source object
           `source`. If this is None, a new source is automatically created.
        :param place:
            If specified, the representations are images/movies/... of that
            place.
        """
        x = obje.as_xref()
        if x:
            if obje.fields:
                self.report_error(
                    obje, "Both XREF and inline fields are not supported")
            if unless_in is None:
                unless_in = set()
            if x in unless_in:
                return []
            else:
                unless_in.add(x)
                return self._ids_obje[x]

        title = ""
        attr: List[Tuple[str, str]] = []   # (property name, property value)
        files: List[Tuple[str, str, str]] = []  # (file, format, media type)
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
                        default_media = a.value
            else:
                # Do not report missing fields
                pass

        for f in obje.fields:
            if f.tag == "TITL":
                attr.append(("Title", f.value))
                title = f.value

            elif f.tag in (
                    "FORM", "_TYPE", "_SCBK", "_PRIM", "NOTE",
                    "RIN", "REFN",
                    ):
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
                                media = b.value

                    elif a.tag == "TITL":
                        # in a MULTIMEDIA_REC
                        title = a.value

                files.append((filename, mime, media))

            elif f.tag == "CHAN":
                CHAN = self._process_CHAN(f)

            elif f.tag == "FORM":
                pass  # already handled

        attr.sort()
        lookup_name = "#".join(f'{n[0]}={n[1]}' for n in attr)
        if unless_in is not None and lookup_name in unless_in:
            return []

        comments = (
            title +
            "\n\n".join(
                f'{n[0]}: {n[1]}'
                for n in attr
                if n[0] != "Title"
            )
        )

        # Create a source if necessary, to which all representations will be
        # associated
        if not source:
            t = f'Media for {place.name if place else title}'
            source = self._sources.get(t, None)
            if source:
                # No need to add media again
                return []

            source = self._sources[t] = Source.objects.create(
                last_change=CHAN,
                subject_place=place,
                researcher=self._researcher,
                higher_source=self._source_for_gedcom,
                title=t,
                abbrev=t,
                biblio=t,
            )

        return [
            Representation.objects.create(
                source=source,
                file=f[0],
                mime_type=f[1],
                comments=f"{comments}\nFormat: {f[2] or ''}"
            )
            for f in files]

    def _create_event(
            self,
            field: GedcomRecord,
            indi_and_role: List[
                Tuple[
                    Optional[Persona],
                    int]   # role
                ],
            surety: Surety_Scheme,
            CHAN: datetime.datetime = None,
            disproved=False,
            prefix="",
            extra_sources: List[Tuple[str, Source]] = [],
            ) -> None:
        """
        Create a new event, associated with INDI by way of one or more
        assertions based on sources.

        :param indi_and_role: list of individual to associate with the
           event, and their role
        :param prefix: for error messages
        """

        assert isinstance(indi_and_role, list)

        # Find the type and name of event from the gedcom tag.
        # Priority is given to the "TYPE" field, which describes the event
        # more accurately.

        evt_type_name = ""
        evt_type = self._event_types[field.tag]
        type_descr = ''
        sources = extra_sources + self._extract_SOUR(field)
        date = None
        place = self._extract_ADDR_PLAC_OBJE(field, sources=sources)

        if prefix:
            prefix += "."

        # Create a descriptive name for the event

        name = (
            field.value
            if field.value and field.value not in ("Y", "N")
            else ""
        )
        if not name:
            # Principals
            #            principals = " and ".join(
            #                p.display_name for p, role in indi_and_role
            #                if p and role == self._principal)
            # type of event
            # More specific information for type
            if field.tag == "EVEN":
                # Those are custom types, for which adding the name of the
                # principals might be confusing.
                name = (
                    f'{(evt_type_name or evt_type.name)}'
                    f'{type_descr}')
            else:
                name = (
                    f'{(evt_type_name or evt_type.name).title()}'
                    f'{type_descr}'
                    #     f' -- {principals}'
                )

        # The notes we find are associated with the event, not with the source.
        # Since they are also found in the context of INDI, they thus belong
        # to both the event and the person, so we store them in p2e assertions
        notes = []

        for f in field.fields:
            if f.tag == "TYPE":
                type_descr = f' {f.value}'

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
                date = f.value
            elif f.tag == "NOTE":
                notes.append(self._get_note(f))
            elif f.tag == "AGE":
                # This records the age the persona had during the event.
                # We create this as a characteristic of the persona, where the
                # source is the same as for the event itself. That should
                # provide some minimum support for finding the origin of that
                # information later. If the even is unsourced, we end up with
                # a quite meaningless characteristic. We use a comment to
                # alleviate this a bit.

                for p, role in indi_and_role:
                    if p is not None and role == self._principal:
                        c = Characteristic.objects.create(
                            place=None,
                            name=f'Age at {name}',
                            date=date,
                        )
                        self._all_char_parts.append(Characteristic_Part(
                            characteristic=c,
                            type=self._char_types["AGE"],
                            name=f.value,
                        ))
                        for sid, s in sources:
                            self._all_p2c.append(P2C(
                                surety=self._default_surety,
                                researcher=self._researcher,
                                person=p,
                                last_change=CHAN,
                                source=s,
                                characteristic=c,
                            ))

        # For each source, we duplicate the event.
        # Otherwise, we end up with multiple 'principal', 'mother',...
        # for the same event.
        # ??? We should then mark them as being the same event, via a
        # Place2Place table relationship.

        for sid, s in sources:
            e = Event.objects.create(
                type=evt_type,
                place=place,
                name=name,
                date=date)

            for p, role in indi_and_role:
                if p:
                    self._all_p2e.append(
                        P2E(
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
                        self._births[self.gedcom_ids[p]] = e

    def _process_INDI(self, data: GedcomRecord):
        """Add events and characteristics to an INDI"""
        assert data.id is not None

        indi = self._ids_indi[(NO_SOURCE, data.id)]

        for f in data.fields:
            if f.tag == "OBJE":
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
                                    value=f'Media for {indi.id}')
                            ])
                    ])
                self._create_characteristic(d, indi, CHAN=indi.last_change)

            elif f.tag in self._char_types:
                self._create_characteristic(
                    f, indi, CHAN=indi.last_change, prefix="INDI")

            elif f.tag[0] == "_":
                if f.fields:

                    # A GEDCOM extension as a complex value. Assume it is an
                    # event
                    self._event_types[f.tag] = (
                        Event_Type.objects.create(gedcom=f.tag, name=f.tag)
                    )
                    self._create_event(
                        f, [(indi, self._principal)], CHAN=indi.last_change,
                        surety=self._default_surety, prefix="INDI")

                else:

                    # A GEDCOM extension by an application.  If this is a
                    # simple string value, assume this is a characteristic.
                    # Create the corresponding type in the database, and import
                    # the field

                    self._char_types[f.tag] = (
                        Characteristic_Part_Type.objects.create(
                            is_name_part=False, name=f.tag, gedcom=f.tag)
                    )
                    self._create_characteristic(
                        f, indi, CHAN=indi.last_change, prefix="INDI")

            elif f.tag in self._event_types:
                self._create_event(
                    f, [(indi, self._principal)], CHAN=indi.last_change,
                    surety=self._default_surety, prefix="INDI")

            elif f.tag == "SOUR":
                # The individual is apparently cited in a source, but is not
                # related to a specific GEDCOM event. So instead we associate
                # with a general census event.
                d = GedcomRecord(
                    line=f.line,
                    tag="EVEN",
                    fields=[
                        f,
                        GedcomRecord(
                            line=f.line,
                            tag="TYPE",
                            value="Cited in a source, not related to an event"
                        )])
                self._create_event(
                    d, [(indi, self._principal)],
                    CHAN=indi.last_change,
                    surety=self._default_surety)

            elif f.tag == "ASSO":
                # Gedcom says this should be an association to an individual,
                # but Geneweb also generates associations to families...
                f_xref = f.as_xref()
                assert f_xref is not None
                related = self._ids_indi.get((NO_SOURCE, f_xref))
                if related is None:
                    famc = self._famc.get(f_xref)
                    if famc is not None:
                        self.report_error(f, "ASSO to a FAM is invalid")
                    else:
                        self.report_error(f, "ASSOC to unknown INDI")

                if related:
                    relation = None

                    for a in f.fields:
                        if a.tag == "RELA":
                            lower_val = a.value.lower()
                            relation = self._p2p_types.get(lower_val, None)
                            if relation is None:
                                relation = P2P_Type.objects.create(
                                    name=a.value)
                                self._p2p_types[lower_val] = relation

                    if relation is None:
                        self.report_error(f, "ASSO without a RELA field")
                    else:
                        self._all_p2p.append(P2P(
                            surety=self._default_surety,
                            researcher=self._researcher,
                            last_change=indi.last_change,
                            person1=indi,
                            person2=related,
                            type=relation,
                        ))

            elif f.tag == "ALIA":
                f_xref = f.as_xref()
                assert f_xref is not None
                related = self._ids_indi[(NO_SOURCE, f_xref)]
                self._all_p2p.append(
                    P2P(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        last_change=indi.last_change,
                        person1=indi,
                        person2=related,
                        rationale="Marked as aliases in imported gedcom",
                        type_id=P2P_Type.sameAs))


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

    def parse(self, filename: Union[BinaryIO, str]) -> Tuple[bool, str]:
        """Parse and import a gedcom file.
           :return:
               A tuple (success, errors), where errors might be None
        """
        try:
            with transaction.atomic():
                m = GedcomImporter(filename)
            return (True, m.errors_as_string())
        except Invalid_Gedcom as e:
            logger.error("Exception while parsing GEDCOM: %s", e.msg)
            return (False, e.msg)
        except Exception as e:
            logger.error("Unexpected Exception during parsing: %s", e)
            return (False, traceback.format_exc())

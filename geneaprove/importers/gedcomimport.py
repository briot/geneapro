"""
Provides a gedcom importer
"""

from django.utils.translation import ugettext as _
import django.utils.timezone
from geneaprove.utils.gedcom import Gedcom, Invalid_Gedcom, GedcomRecord, GedcomString
from geneaprove import models
from django.db import transaction, connection
import geneaprove.importers
import re
import datetime
import traceback
import time

# If true, the given name read from gedcom is split (on spaces) into
# a given name and one or more middle names. This might not be appropriate
# for all languages.
GIVEN_NAME_TO_MIDDLE_NAME = True

# If true, a different persona is created for each source. For instance,
# if person ID001 has two events (birth and death) each with its own sources,
# then two personas (or more) will be created for ID001, all joined through
# a "sameAs" persona-to-persona relationship.
MULTIPLE_PERSONAS = True

DEBUG = False

# Id used for inlined sources in gedcom (ie there is no id in the gedcom
# file)
INLINE_SOURCE = -2
NO_SOURCE = -1


def location(obj):
    """Return the location (in the gedcom file) of obj"""

    try:
        if isinstance(obj, list):
            return obj[0].location()
        else:
            return obj.location()
    except AttributeError:
        return "???"

##################################
# GedcomImporter
##################################


class GedcomImporter(object):

    """
    Abstract Gedcom importer. This translates from the gedcom data model
    into our own, and can be used by any importer for which the software
    uses roughly the gedcom model.
    """

    @transaction.commit_manually
    def __init__(self, data):
        """
        From the data contained in a gedcom-like file (see description of
        the format in gedcom.py), creates corresponding data in the database.
        data is an instance of GedcomData.
        """

        if DEBUG:
            print "Start import", time.time()

        try:
            self._data = data
            self._researcher = self._create_researcher()
            prj = self._create_project(self._researcher)

            self._default_surety = prj.scheme.parts.all()
            self._default_surety = \
                self._default_surety[len(self._default_surety) / 2]

            self._births = dict()  # Index on persona id, contains Event

            self._objects = dict()  # Objects that were inserted in this import
            # to avoid duplicates.  file => Representation

            self._obje_for_places = dict()
            # The OBJE created for each place.
            # This is needed because at least GRAMPS outputs the PLAC for an
            # event along with all its OBJE (so we have lots of duplicates)

            self._principal = models.Event_Type_Role.objects.get(
                pk=models.Event_Type_Role.principal)
            self._birth__father = models.Event_Type_Role.objects.get(
                pk=models.Event_Type_Role.birth__father)
            self._birth__mother = models.Event_Type_Role.objects.get(
                pk=models.Event_Type_Role.birth__mother)

            self._event_types = dict()
            self._char_types = dict()
            self._citation_part_types = dict()
            self._place_part_types = dict()
            self._get_all_event_types()
            self._places = dict()
            self._repo = dict()

            self._sourcePersona = dict()  # Indexed on (sourceId, personId)
            # returns the Persona to use for that source. As a special
            # case, sourceId is set to NO_SOURCE for those events and
            # characteristics with no source.

            self._sources = dict()
            for r in data.REPO:
                self._create_repo(r)
            if DEBUG:
                print "Done importing repositories"

            if DEBUG:
                print "Importing %d sources" % (len(data.SOUR))
            for s in data.SOUR:
                self._create_source(s)
            if DEBUG:
                print "Done importing sources"

            max = len(data.INDI)
            if DEBUG:
                print "Importing %d indi" % max
            for index, s in enumerate(data.INDI):
                self._create_indi(s)
                if DEBUG and index % 20 == 0:
                    print "%d / %d (%0.2f %%)" % (
                        index, max, float(index) / float(max) * 100.0)
            if DEBUG:
                print "Done importing indi"

            if DEBUG:
                print "Importing %d families" % (len(data.FAM))
            for s in data.FAM:
                self._create_family(s)
            if DEBUG:
                print "Done importing families"

            for k, v in data.for_all_fields():
                if k not in ("SOUR", "INDI", "FAM", "HEAD", "SUBM",
                             "TRLR", "ids", "filename"):
                    self.report_error(
                        "%s Unhandled FILE.%s" % (location(v), k))

            transaction.commit()
        except:
            transaction.rollback()
            raise

    def report_error(self, msg):
        print msg

    def _get_all_event_types(self):
        """Create a local cache for Event_Type"""

        for evt in models.Event_Type.objects.exclude(gedcom__isnull=True):
            if evt.gedcom:
                self._event_types[evt.gedcom] = evt

        types = models.Characteristic_Part_Type.objects.exclude(
            gedcom__isnull=True)
        for c in types:
            if c.gedcom:
                self._char_types[c.gedcom] = c

        self._char_types['_MIDL'] = \
            models.Characteristic_Part_Type.objects.get(id=40)
        # Handled specially in _create_characteristic
        self._char_types['NAME'] = True

        for p in models.Place_Part_Type.objects.exclude(gedcom__isnull=True):
            if p.gedcom:
                self._place_part_types[p.gedcom] = p

        for p in models.Citation_Part_Type.objects.exclude(gedcom__isnull=True):
            self._citation_part_types[p.gedcom] = p

    def _create_CHAN(self, data):
        """data should be a form of CHAN"""

        # In Geneatique 2010, there can be several occurrences of CHAN. But
        # we only preserve the most recent one

        result = None

        if not data:
            data = []
        elif not isinstance(data, list):
            data = [data]

        for d in data:
            date = "01 JAN 1970"
            time = "00:00:00"

            if d.DATE:
                date = d.DATE.value
                if d.DATE.TIME:
                    tmp = datetime.datetime.strptime(
                        date + " " + d.DATE.TIME, "%d %b %Y %H:%M:%S")
                else:
                    tmp = datetime.datetime.strptime(date, "%d %b %Y")

                if result is None or tmp > result:
                    result = tmp

        if result:
            return django.utils.timezone.make_aware(
                result, django.utils.timezone.get_default_timezone())
        else:
            return django.utils.timezone.now()

    def _create_repo(self, data):
        if data.value and self._repo.get(data.value, None):
            return self._repo[data.value]

        info = []
        if getattr(data, "WWW", None):
            info.append("\nURL=".join(data.WWW))
        if getattr(data, "PHON", None):
            info.append("\nPhone=".join(data.PHON))
        if getattr(data, "RIN", None):
            info.append("\nRIN=" + data.RIN)
        if getattr(data, "NOTE", None):
            info.append("\nNote=".join(data.NOTE))

        info = "".join(info)
        r = None
        addr = getattr(data, "ADDR", None)
        name = getattr(data, "NAME", "")

        if info or addr or name:
            r = models.Repository.objects.create(
                place=None,
                addr=addr,
                name=name or info,
                type=None,
                info=info)

            if data.id:
                self._repo[data.id] = r

        for k, v in data.for_all_fields():
            # CALN is handled directly in the source itself
            if k not in ("NAME", "ADDR", "WWW", "PHON", "RIN", "NOTE", "id",
                         "CALN"):
                self.report_error("%s Unhandled REPO.%s" % (location(v), k))

        return r

    def _create_source(self, sour, subject_place=None):
        medium = ""
        rep = None

        if sour.__dict__.has_key('REPO') and sour.REPO:
            repo = sour.REPO
            if repo.value:
                # If we just have a "CALN", no need to create a repository
                rep = self._create_repo(repo)
            else:
                for k, v in repo.for_all_fields():
                    if k not in ("CALN", ):
                        self.report_error(
                            "%s Unhandled REPO.%s" % (location(v), k))

            caln = repo.CALN  # call number
            if caln:
                medium = (caln[0].MEDI or '').lower()

            for k, v in repo.for_all_fields():
                if k not in ("CALN", ):
                    self.report_error(
                        "%s Unhandled REPO.%s" % (location(v), k))

        try:
            chan = sour.CHAN
        except:
            chan = None

        title = getattr(sour, "TITL", "")
        if not title:
            try:
                title = "S%s" % sour.id
            except:
                title = "Unnamed source"

        src = models.Source.objects.create(
            higher_source_id=None,
            subject_place=subject_place,
            jurisdiction_place_id=None,
            researcher=self._researcher,
            subject_date=None,
            medium=medium,
            title=title,
            abbrev=getattr(sour, "ABBR", "") or title,
            biblio=title,
            last_change=self._create_CHAN(chan),
            comments='')
        if rep is not None:
            models.Repository_Source.objects.create(
                repository=rep,
                source=src,
                # activity=None,
                call_number=None,
                description=None)

        obje = sour.OBJE
        if obje:
            if not isinstance(obje, list):
                obje = [obje]
            for o in obje:
                obj = self._create_obje(o, src)

        for k, v in sour.for_all_fields():
            if k == "id":
                # ??? Should we preserve gedcom ids ?
                pass

            elif k not in ("REPO", "OBJE", "TITL", "CHAN", "ABBR"):
                self.report_error(
                    "%s Unhandled SOUR.%s" % (location(v), k))

        try:
            self._sources[sour.id] = src
        except:
            pass

        return src

    def _create_obje(self, data, source):
        """Create an object (representation) in the database"""

        if data is None:
            return None

        if isinstance(data, unicode):
            self.report_error('Ignore OBJE reference: %s' % data)
            return

        form_to_mime = {
            'jpeg': 'image/jpeg',  # Gramps
            'image/png': 'image/png',  # Gramps
            'image/jpeg': 'image/jpeg',
            'png': 'image/png',  # rootsMagic
            'jpg': 'image/jpg',  # rootsMagic
            'JPG': 'image/jpg',  # rootsMagic
            '': 'application/octet-stream'}

        mime = form_to_mime.get(data.FORM, 'application/octet-stream')

        obj = self._objects.get(data.FILE, None)
        if not obj or obj.comments != data.TITL:
            self._objects[data.FILE] = models.Representation.objects.create(
                source=source, mime_type=mime, file=data.FILE,
                comments=data.TITL)

    def _create_family(self, data):
        """Create the equivalent of a FAMILY in the database"""

        husb = data.HUSB
        if husb:
            husb = self._sourcePersona[(NO_SOURCE, husb.id)]

        wife = data.WIFE
        if wife:
            wife = self._sourcePersona[(NO_SOURCE, wife.id)]

        family_events = ("MARR", "DIV", "CENS", "ENGA", "EVEN")
        found = 0

        # We might have a family with children only.
        # Or a family with only one parent.
        # In such cases, we create the missing parents, so the the siblings
        # are not lost (if we created a single parent, their might still
        # be ambiguities if that parent also belonged to another family

        if not husb:
            husb = models.Persona.objects.create(name="@Unknown@")
        if not wife:
            wife = models.Persona.objects.create(name="@Unknown@")

        for field in family_events:
            for evt in getattr(data, field, []):
                found += 1
                self._create_event(
                    [(husb, self._principal), (wife, self._principal)],
                    field, evt, CHAN=data.CHAN)

        # if there is no event to "build" the family, we generate a dummy
        # one. Otherwise there would be no relationship between husband and
        # wife in the geneaprove database, thus losing information from gedcom

        if found == 0:
            family_built = GedcomRecord()
            family_built._setLine(data._line)
            self._create_event(
                [(husb, self._principal), (wife, self._principal)],
                "MARR",
                family_built,
                CHAN=data.CHAN)

        # Now add the children

        children = data.CHIL
        last_change = self._create_CHAN(data.CHAN)

        for c in data.CHIL:
            # Associate parents with the child's birth event. This does not
            # recreate an event if one already exists.

            # ??? If the child already had a birth, we should attach to the
            # existing event, since in GEDCOM these are the same.
            self._create_event(
                indi=[
                    (self._sourcePersona[(NO_SOURCE, c.id)], self._principal),
                    (husb, self._birth__father),
                    (wife, self._birth__mother)],
                field="BIRT", data=c, CHAN=data.CHAN)

        for k, v in data.for_all_fields():
            if k not in ("CHIL", "HUSB", "WIFE", "id",
                         "CHAN") + family_events:
                self.report_error("%s Unhandled FAM.%s" % (location(v), k))

    def _addr_image(self, data):
        result = ""
        if data:
            for (key, val) in data.for_all_fields():
                result += ' %s=%s' % (key, val)
        return result

    def _create_place(self, data, id=''):
        """If data contains a subnode PLAC, parse and returns it.
        """

        if data is None:
            return None

        addr = getattr(data, "ADDR", None)
        data = getattr(data, "PLAC", None)

        if addr is None and data is None:
            return None
        if data is None and addr is not None:
            self.report_error("%s Unexpected: got an ADDR without a PLAC" % (
                location(addr)))
            return None

        # Check if the place already exists, since GEDCOM will duplicate
        # places unfortunately.
        # We need to take into account all the place parts, which is done
        # by simulating a long name including all the optional parts.

        # Take into account all parts (the GEDCOM standard only defines a
        # few of these for a PLAC, but software such a gramps add quite a
        # number of fields

        long_name = data.value + self._addr_image(addr)
        if data.MAP:
            long_name = long_name + ' MAP=%s,%s' % (data.MAP.LATI,
                                                    data.MAP.LONG)

        p = self._places.get(long_name)

        if not p:
            p = models.Place.objects.create(name=data.value, date=None,
                                            parent_place=None)
            self._places[long_name] = p  # For reuse

            if data.MAP:
                pp = models.Place_Part.objects.create(place=p,
                                                      type=self._place_part_types[
                                                          'MAP'], name=data.MAP.LATI
                                                      + ' ' + data.MAP.LONG)

            if addr:
                for key, val in addr.for_all_fields():
                    if key != 'value' and val:
                        part = self._place_part_types.get(key, None)
                        if not part:
                            self.report_error(
                                'Unknown place part: ' + key)
                        else:
                            pp = models.Place_Part.objects.create(place=p,
                                                                  type=part, name=val)

        # ??? Unhandled attributes of PLAC: FORM, SOURCE and NOTE
        # FORM would in fact tell us how to split the name to get its
        # various components, which we could use to initialize the place
        # parts

        for k, v in data.for_all_fields():
            if k not in ("MAP", ):
                self.report_error(
                    "%s Unhandled PLAC.%s" % (location(v), k))

        return p

    def _indi_for_source(self, sourceId, indi):
        """Return the instance of Persona to use for the given source.
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
            p = self._sourcePersona.get((sourceId, indi._gedcom_id), None)
            if p:
                return p

        ind = models.Persona.objects.create(
            name=indi.name,
            description='',  # was set for the first persona already
            last_change=indi.last_change)

        if sourceId != INLINE_SOURCE:
            self._sourcePersona[(sourceId, indi._gedcom_id)] = ind

        # Link old and new personas

        models.P2P.objects.create(
            surety=self._default_surety,
            researcher=self._researcher,
            person1=indi,
            person2=ind,
            type=models.P2P.sameAs,
            rationale='Single individual in the gedcom file')

        return ind

    def _get_note(self, data):
        """Retrieves the NOTE information from data, if any. Such notes can
           be xref, which are automatically resolved here.
        """
        n = []
        for p in getattr(data, "NOTE", []):
            if p.startswith("@") and p.endswith("@"):
                n.append(self._data.ids[p].value)
            else:
                n.append(p)

        return "\n\n".join(n)

    def _create_characteristic(self, key, value, indi):
        """Create a Characteristic for the person indi.
         Return True if a characteristic could be created, false otherwise.
         (key,value) come from the GEDCOM structure.

         A call to this subprogram might look like:
            self._create_characteristic(
                key="NAME",
                value=GedcomRecord(SURN=g.group(2), GIVN=g.group(1)),
                indi=indi)

            self._create_characteristic("SEX", "Male", indi)

         As defined in the GEDCOM standard, and except for the NAME which
         is special, all other attributes follow the following grammar:
             n TITL nobility_type_title
             +1 <EVENT_DETAIL>
         where EVENT_DETAIL can define any of the following: TYPE, DATE,
         PLAC, ADDR, AGE, AGNC, CAUS, SOUR, NOTE, MULT
        """

        if key == 'NAME':
            # Special handling for name: its value was used to create the
            # person itself, and now we are only looking into its subelements
            # for the components of the name
            typ = None
        else:
            typ = self._char_types[key]

        if not isinstance(value, list):
            value = [value]

        for val_index, val in enumerate(value):
            if val is None:
                continue

            # Create the Characteristic object iself.
            # This also computes its place and date.

            if isinstance(val, GedcomString):
                c = models.Characteristic.objects.create(
                    place=None,
                    name=(typ and typ.name) or key.capitalize())
                str_value = val
            else:
                # Processes ADDR and PLAC
                place = self._create_place(val)
                self._create_obje_for_place(val, place)  # processes OBJE

                c = models.Characteristic.objects.create(
                    place=place,
                    name=(typ and typ.name) or key.capitalize(),
                    date=getattr(val, "DATE", None))
                str_value = val.value

            # Associate the characteristic with the persona.
            # Such an association is done via assertions, based on sources.

            for sid, s in self._create_sources_ref(val):
                ind = self._indi_for_source(sourceId=sid, indi=indi)
                models.P2C.objects.create(
                    surety=self._default_surety,
                    researcher=self._researcher,
                    person=ind,
                    source=s,
                    characteristic=c)

            # The main characteristic part is the value found on the same
            # GEDCOM line as the characteristic itself. For simple
            # characteristics like "SEX", this will in fact be the only part.

            if typ:
                models.Characteristic_Part.objects.create(characteristic=c,
                                                          type=typ, name=str_value)

            # We might have other characteristic part, most notably for names.

            if isinstance(val, GedcomRecord):
                for k, v in val.for_all_fields():
                    t = self._char_types.get(k, None)
                    if t:
                        if k == 'NOTE':
                            # This will be automatically added as a
                            # characteristic part because initialdata.txt
                            # defines this. However, in gedcom these notes can
                            # be xref, so resolve them here.

                            n = self._get_note(val)
                            if n:
                                models.Characteristic_Part.objects.create(
                                    characteristic=c, type=t, name=n)

                        elif k == 'GIVN' and GIVEN_NAME_TO_MIDDLE_NAME:
                            if v:
                                n = v.replace(',', ' ').split(' ')
                                models.Characteristic_Part.objects.create(
                                    characteristic=c, type=t, name=n[0])

                                for m in n[1:]:
                                    if m:
                                        models.Characteristic_Part.objects.create(
                                            characteristic=c,
                                            type=self._char_types['_MIDL'],
                                            name=m)
                        elif v:
                            models.Characteristic_Part.objects.create(
                                characteristic=c, type=t, name=v)

                    elif k == 'SOUR':
                        pass  # handled in the _create_sources_ref loop above

                    elif k in ("ADDR", "PLAC", "OBJE"):
                        pass  # handled in _create_place

                    elif k == "DATE":
                        pass  # handled above

                    else:
                        self.report_error("%s Unhandled %s.%s" % (
                            location(val), key, k))

    def _create_obje_for_place(self, data, place, CHAN=None):
        # If an event has an OBJE: since the source is an xref, the object
        # is in fact associated with the place. Unfortunately, it will be
        # duplicated among all other occurrences of that place (which itself
        # is duplicated).

        if getattr(data, "OBJE", None):
            # Make sure we do not add the same OBJE multiple times for a
            # given place, and in addition create a source every time
            known_obje = self._obje_for_places.setdefault(place, set())
            obje = [ob
                    for ob in getattr(data, "OBJE", None)
                    if getattr(ob, "TITL", "") not in known_obje]
            known_obje.update(getattr(ob, "TITL", "") for ob in obje)

            if obje:
                if getattr(data, "PLAC", None) and place:
                    self._create_source(
                        GedcomRecord(
                            REPO=None,
                            CHAN=CHAN,
                            TITL='Media for %s' % data.PLAC.value,
                            OBJE=obje),
                        subject_place=place)
                else:
                    self.report_error("%s Unhandled OBJE" % (location(data.OBJE)))

    def _create_event(self, indi, field, data, CHAN=None):
        """Create a new event, associated with INDI by way of one or more
           assertions based on sources.
           INDI is a list of (persona, role). If persona is None, it will be
           ignored.
           It can be a single persona, in which case the role is "principal".
           For a BIRT event, no new event is created if one already exists for
           the principal. There must be a single principal for a BIRT event.
        """

        evt_name = ""

        # This is how Gramps represents events entered as
        # a person's event (ie partner is not known)

        if field == 'EVEN':
            if data.TYPE == 'Marriage':
                event_type = self._event_types['MARR']
            elif data.TYPE == 'Engagement':
                event_type = self._event_types['ENGA']
            elif data.TYPE == 'Residence':
                event_type = self._event_types['RESI']
            elif data.TYPE == 'Separation':
                event_type = self._event_types['DIV']  # ??? incorrect
            elif data.TYPE == 'Military':
                event_type = self._event_types['_MIL']
            elif data.TYPE == 'Unknown':
                event_type = self._event_types['EVEN']
            else:
                evt_name = "%s " % data.TYPE
                event_type = self._event_types['EVEN']
        else:
            event_type = self._event_types[field]

        # Find the principal for this event

        if isinstance(indi, list):
            principal = None
            name = []

            for (k, v) in indi:
                if k and v == self._principal:
                    name.append(k.name)
                    principal = k

            name = " and ".join(name)

            if principal is None:
                self.report_error(
                    "%s No principal given for event: %s - %s" % (
                        location(data), field, data))

        else:
            principal = indi
            name = principal.name
            indi = [(indi, self._principal)]

        evt = None

        # Can we find a descriptive name for this event ?

        if event_type.gedcom == 'BIRT':
            name = 'Birth of ' + name
            evt = self._births.get(principal.id, None)
        elif event_type.gedcom == 'MARR':
            name = 'Marriage of ' + name
        elif event_type.gedcom == "DEAT":
            name = "Death of " + name
        else:
            name = "%s of %s" % (evt_name or event_type.name, name)

        # Create the event if needed.

        if not evt:
            place = self._create_place(data)
            self._create_obje_for_place(data, place, CHAN)  # processes OBJE
            evt = models.Event.objects.create(type=event_type, place=place,
                                              name=name, date=getattr(data, "DATE", None))

            if event_type.gedcom == 'BIRT':
                self._births[principal.id] = evt
            all_src = self._create_sources_ref(data)
        else:
            all_src = self._create_sources_ref(None)

        last_change = self._create_CHAN(CHAN)

        for person, role in indi:
            if person:
                n = ""
                if role == self._principal:
                    # If we have a note associated with the event, we assume it
                    # deals with the event itself, not with its sources.  Since
                    # the note also appears in the context of an INDI, we store
                    # it in the assertion.

                    n = self._get_note(data)

                for sid, s in all_src:
                    ind = self._indi_for_source(sourceId=sid, indi=person)
                    a = models.P2E.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        person=ind,
                        event=evt,
                        source=s,
                        role=role,
                        last_change=last_change,
                        rationale=n)

        for k, v in data.for_all_fields():
            # ADDR and PLAC are handled in create_place
            # SOURCE is handled in create_sources_ref
            if k not in ("DATE", "ADDR", "PLAC", "SOUR", "TYPE", "OBJE",
                         "NOTE", "_all", "xref"):
                self.report_error("%s Unhandled EVENT.%s" % (location(v), k))

        return evt

    def _create_sources_ref(self, data):
        """Create a list of instances of Source for the record described by
         DATA. For instance, if Data is an event, these are all the sources in
         which the event was references.
         The return value is a list of tuples (source_id, Source instance).
         If there are no reference, this returns a list with a single element,
         None. As a result, you can always iterate over the result to insert
         rows in the database."""

        if not isinstance(data, unicode) and getattr(data, "SOUR", None):
            all_sources = []

            for s in data.SOUR:
                # As a convenience for the python API (this doesn't happen in a
                # Gedcom file), we allow direct source creation here. In
                # Gedcom, this is always an xref.

                if not s.value or s.value not in self._sources:
                    if not getattr(s, "TITL", None):
                        s.TITL = "source at %s %s" % (data.location(), data)
                    sour = (INLINE_SOURCE, self._create_source(s))
                else:
                    sour = (s.value, self._sources[s.value])

                # If we have parts, we need to create a nested source instead
                parts = []
                for k, v in s.for_all_fields():
                    if k == "DATA":
                        for k2, v2 in v.for_all_fields():
                            if k2 == "DATE":
                                parts.append(("DATE", v2)) # Entry recording date
                            elif k2 == "TEXT":
                                parts.append(("VERBATIM", v2)) # Verbatim copy
                            else:
                                parts.append((k2, v2))  # Custom
                    elif k == "NOTE":
                        pass   # Handled separately below
                    elif k == "OBJE":
                        self.report_error(
                            "%s Unhandled SOUR.%s" % (location(v), k))
                    else:
                        parts.append((k, v))

                parts_string = u"".join(u" %s=%s" % p for p in parts)

                if parts:
                    # Try to reuse an existing source with the same parts,
                    # since gedcom duplicates them
                    new_id = '%s %s' % (s.value, parts_string)
                    if new_id not in self._sources:
                        sour2 = models.Source.objects.create(
                            higher_source=sour[1],
                            researcher=self._researcher,
                            title=(sour[1].title or u'') + parts_string,
                            abbrev=(sour[1].abbrev or u'') + parts_string,
                            comments="".join(getattr(s, "NOTE", [])),
                            last_change=sour[1].last_change)

                        for k, v in parts:
                            try:
                                type = models.Citation_Part_Type.objects.get(
                                    gedcom=k)
                            except:
                                type = models.Citation_Part_Type.objects.create(
                                    name=k.title(), gedcom=k)
                            p = models.Citation_Part(type=type, value=v)
                            sour2.parts.add(p)
                        sour2.save()

                        self._sources[new_id] = sour2
                    else:
                        sour2 = self._sources[new_id]

                    sour = (sour[0], sour2)

                all_sources.append(sour)

            return all_sources

        return [(NO_SOURCE, None)]

    def _create_indi(self, data):
        """Create the equivalent of an INDI in the database"""

        if not data.NAME:
            name = ''
        else:
            name = data.NAME[0].value  # Use first available name

        # The name to use is the first one in the list of names
        indi = models.Persona.objects.create(
            name=name,
            description=data.NOTE,
            last_change=self._create_CHAN(data.CHAN))
        indi._gedcom_id = data.id

        self._sourcePersona[(NO_SOURCE, data.id)] = indi

        # For all properties of the individual

        for field, value in data.for_all_fields():
            if field == "id":
                # ??? Should we preserve the GEDCOM @ID001@
                pass

            elif field in ("FAMC", "FAMS"):
                # These are ignored: families are created through marriage or
                # child births.
                pass

            elif field in ("CHAN", "NOTE"):
                # Already handled
                pass

            elif field in self._char_types:
                self._create_characteristic(field, value, indi)

            elif field in self._event_types:
                for v in value:
                    self._create_event(indi=indi, field=field, data=v)

            elif field.startswith("_") \
                    and (isinstance(value, basestring)
                         or (isinstance(value, list)
                             and isinstance(value[0], basestring))):
                # A GEDCOM extension by an application.
                # If this is a simple string value, assume this is a characteristic.
                # Create the corresponding type in the database, and import the
                # field

                typ = models.Characteristic_Part_Type.objects.create(
                    is_name_part=False,
                    name=field,
                    gedcom=field)
                self._char_types[field] = typ

                if not isinstance(value, list):
                    value = [value]

                for v in value:
                    self._create_characteristic(field, v, indi)

            elif field == "SOUR":
                # The individual is apparently cited in a source, but is not
                # related to a specific GEDCOM event. So instead we associate
                # with a general census event.
                evt_data = GedcomRecord(SOUR=value)
                self._create_event(indi, field="CENS", data=evt_data)

            elif field == "OBJE":
                self._create_characteristic(
                    key="_IMG",
                    value=GedcomRecord(
                        value='',
                        SOUR=[GedcomRecord(
                            TITL="Media for %s" % name,  # used both for object and source
                            CHAN=None,
                            OBJE=value)]),
                    indi=indi)

            else:
                self.report_error("%s Unhandled INDI.%s: %s" % (
                    location(value), field, value))

        return indi

    def _create_project(self, researcher):
        """Register the project in the database"""

        filename = getattr(self._data.HEAD, "FILE", "") or self._data.filename
        p = models.Project.objects.create(name='Gedcom import',
                                          description='Import from ' +
                                          filename,
                                          scheme=models.Surety_Scheme.objects.get(id=1))
        models.Researcher_Project.objects.create(researcher=researcher,
                                                 project=p, role='Generated GEDCOM file')
        return p

    @staticmethod
    def _addr_to_string(data):
        """
      Convert an ADDR field to a single string. Our model does use different
      fields for current addresses
        """

        if data:
            addr = data.value + '\n'
            if data.ADR1:
                addr += data.ADR1 + '\n'
            if data.ADR2:
                addr += data.ADR2 + '\n'
            if data.POST:
                addr += data.POST + '\n'
            if data.CITY:
                addr += data.CITY + '\n'
            if data.STAE:
                addr += data.STAE + '\n'
            if data.CTRY:
                addr += data.CTRY + '\n'

         # Gramps sets this when the address is not provided
            addr = addr.replace('Not Provided', '')

         # Cleanup empty lines
            return re.sub('^\n+', '', re.sub('\n+', '\n', addr))
        else:

            return ''

    def _create_researcher(self):
        """
      Create the Researcher that created the data contained in the gedcom
      file
        """

        subm = self._data.HEAD.SUBM
        if subm:
            return models.Researcher.objects.create(name=subm.NAME.value
                                                    or 'unknown',
                                                    comment=GedcomImporter._addr_to_string(subm.ADDR))
        else:
            return models.Researcher.objects.create(name='unknown', comment='')

##################################
# GedcomImporterCumulate
##################################


class GedcomImporterCumulate(GedcomImporter):

    def __init__(self, *args, **kwargs):
        self.errors = []
        super(GedcomImporterCumulate, self).__init__(*args, **kwargs)

    def report_error(self, msg):
        self.errors.append(msg)


##################################
# GedcomFileImporter
##################################

class GedcomFileImporter(geneaprove.importers.Importer):

    """Register a new importer in geneaprove: imports GEDCOM files"""

    class Meta:

        """see inherited documentation"""
        displayName = _('GEDCOM')
        description = _('Imports a standard GEDCOM file, which most genealogy'
                        + ' software can export to')

    def __init__(self):
        self._parser = None  # The gedcom parser
        geneaprove.importers.Importer.__init__(self)

    def parse(self, filename):
        """Parse and import a gedcom file.
           :param filename:
               Either the name of a file, or an instance of a class compatible
               with file().
           :return:
               A tuple (success, errors), where errors might be None
        """

        try:
            parsed = Gedcom().parse(filename)
            parser = GedcomImporterCumulate(parsed)
            return (True, "\n".join(parser.errors))

        except Invalid_Gedcom, e:
            return (False, e.msg)
        except Exception, e:
            print "Unexpected Exception", e
            return (False, traceback.print_exc(e))

"""
Provides a gedcom importer
"""

from django.utils.translation import ugettext as _
from mysites.geneapro.utils.gedcom import Gedcom, Invalid_Gedcom, GedcomRecord, GedcomString
from mysites.geneapro import models
from django.db import transaction
import mysites.geneapro.importers
import re
import datetime

# If true, the given name read from gedcom is split (on spaces) into
# a given name and one or more middle names. This might not be appropriate
# for all languages
GIVEN_NAME_TO_MIDDLE_NAME = True

DEBUG = True


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
## GedcomImporter
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

        try:
            self._data = data
            self._researcher = self._create_researcher()
            prj = self._create_project(self._researcher)

            self._default_surety = prj.scheme.parts.all()
            self._default_surety = \
                self._default_surety[len(self._default_surety) / 2]

            self._births = dict()  # Index on persona id, contains Event

            self._objects = dict() # Objects that were inserted in this import
                                # to avoid duplicates.  file => Representation

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
            self._personas = dict()  # Indexes on ids from gedcom

            self._source_medium = dict()
            self._read_source_medium()

            self._sources = dict()
            for s in data.SOUR:
                self._create_source(s)
            for s in data.INDI:
                self._create_indi(s)
            for s in data.FAM:
                self._create_family(s)

            for k, v in data.for_all_fields():
                if k not in ("SOUR", "INDI", "FAM", "HEAD", "SUBM",
                             "TRLR", "ids"):
                    print "%s Unhandled FILE.%s" % (location(v), k)

            transaction.commit()
        except:
            transaction.rollback()
            raise

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
        self._char_types['NAME'] = True  # Handled specially in _create_characteristic

        for p in models.Place_Part_Type.objects.exclude(gedcom__isnull=True):
            if p.gedcom:
                self._place_part_types[p.gedcom] = p

        for p in models.Citation_Part_Type.objects.exclude(gedcom__isnull=True):
            self._citation_part_types[p.gedcom] = p

    def _read_source_medium(self):
        for m in models.Source_Medium.objects.all():
            self._source_medium[m.name] = m.id

    def _create_CHAN(self, data):
        """data should be a form of CHAN"""

        if data:
            date = "01 JAN 1970"
            time = "00:00:00"

            if data.DATE:
                date = data.DATE.value
                if data.DATE.TIME:
                    return datetime.datetime.strptime(
                       date + " " + data.DATE.TIME, "%d %b %Y %H:%M:%S")
                else:
                    return datetime.datetime.strptime(date, "%d %b %Y")

        return datetime.datetime.now()

    def _create_source(self, sour, subject_place=None):
        medium_id = 0

        if sour.__dict__.has_key('REPO') and sour.REPO:
            repo = sour.REPO
            caln = repo.CALN  # call number
            if caln:
                medium = (caln[0].MEDI or '').lower()
                medium_id = self._source_medium.get(medium)
                if not medium_id:
                    print "Unknown medium type for source '%s'" % medium
                    medium_id = 0

            for k, v in repo.for_all_fields():
                print "%s Unhandled REPO.%s" % (location(v), k)

        try:
            comment = sour.TITL or sour.ABBR
        except:
            comment = ''

        src = models.Source.objects.create(
            higher_source_id=None,
            subject_place=subject_place,
            jurisdiction_place_id=None,
            researcher=self._researcher,
            subject_date=None,
            medium_id=medium_id,
            last_change=self._create_CHAN(sour.CHAN),
            comments=comment)

        if sour.ABBR:
            cit = models.Citation_Part.objects.create(
                source=src,
                type=self._citation_part_types["ABBR"],
                value=sour.ABBR)
        if sour.TITL:
            cit = models.Citation_Part.objects.create(
                source=src,
                type=self._citation_part_types["TITL"],
                value=sour.TITL)

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
                print "%s Unhandled SOUR.%s" % (location(v), k)

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
            print 'Ignore OBJE reference: %s' % data
            return

        form_to_mime = {
            'jpeg': 'image/jpeg', # Gramps
            'image/png': 'image/png', # Gramps
            'png': 'image/png', # rootsMagic
            'jpg': 'image/jpg', # rootsMagic
            'JPG': 'image/jpg', # rootsMagic
            '': 'application/octet-stream'}

        mime = form_to_mime.get(data.FORM)
        if mime is None:
            print 'Unknown mime type for object: ' + data.FORM
            return

        obj = self._objects.get(data.FILE, None)
        if not obj or obj.comments != data.TITL:
            self._objects[data.FILE] = models.Representation.objects.create(
                source=source, mime_type=mime, file=data.FILE,
                comments=data.TITL)

    def _create_family(self, data):
        """Create the equivalent of a FAMILY in the database"""

        husb = data.HUSB
        if husb:
            husb = self._personas[husb.id]

        wife = data.WIFE
        if wife:
            wife = self._personas[wife.id]

        family_events = ("MARR", "DIV", "CENS", "ENGA", "EVEN")

        for field in family_events:
            for evt in getattr(data, field, []):
                self._create_event(
                    [(husb, self._principal), (wife, self._principal)],
                    field, evt, CHAN=data.CHAN)

        children = data.CHIL
        last_change = self._create_CHAN(data.CHAN)

        for c in data.CHIL:
            self._create_event(
                [(self._personas[c.id], self._principal),
                 (husb, self._birth__father),
                 (wife, self._birth__mother)],
                "BIRT", data=c, CHAN=data.CHAN)

        for k, v in data.for_all_fields():
            if k not in ("CHIL", "HUSB", "WIFE", "id",
                         "CHAN") + family_events:
                print "%s Unhandled FAM.%s" % (location(v), k)

    def _create_place(self, data, id=''):
        """If data contains a subnode PLAC, parse and returns it"""

        if data is None:
            return None

        addr = getattr(data, "ADDR", None)
        data = getattr(data, "PLAC", None)

        if addr is None and data is None:
            return None
        if data is None and addr is not None:
            print "%s Unexpected: got an ADDR without a PLAC" % (location(data))
            return None

        # Check if the place already exists, since GEDCOM will duplicate
        # places unfortunately.
        # We need to take into account all the place parts, which is done
        # by simulating a long name including all the optional parts.

        # Take into account all parts (the GEDCOM standard only defines a
        # few of these for a PLAC, but software such a gramps add quite a
        # number of fields

        long_name = data.value
        if addr:
            for (key, val) in addr.for_all_fields():
                long_name = long_name + ' %s=%s' % (key, val)
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
                        type=self._place_part_types['MAP'], name=data.MAP.LATI
                        + ' ' + data.MAP.LONG)

            if addr:
                for key, val in addr.for_all_fields():
                    if key != 'value' and val:
                        part = self._place_part_types.get(key, None)
                        if not part:
                            print 'Unknown place part: ' + key
                        else:
                            pp = models.Place_Part.objects.create(place=p,
                                    type=part, name=val)

        # ??? Unhandled attributes of PLAC: FORM, SOURCE and NOTE
        # FORM would in fact tell us how to split the name to get its
        # various components, which we could use to initialize the place
        # parts

        for k, v in data.for_all_fields():
            if k not in ("MAP", ):
                print "%s Unhandled PLAC.%s" % (location(v), k)

        return p

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
                c = models.Characteristic.objects.create(place=None)
                str_value = val
            else:
                place = self._create_place(val)
                c = models.Characteristic.objects.create(place=place,
                        date=getattr(val, "DATE", None))
                str_value = val.value

            # Associate the characteristic with the persona.
            # Such an association is done via assertions, based on sources.

            for s in self._create_sources_ref(val):
                models.P2C_Assertion.objects.create(
                    surety=self._default_surety,
                    researcher=self._researcher,
                    person=indi,
                    source=s,
                    characteristic=c,
                    value='charac')

            # The main characteristic part is the value found on the same
            # GEDCOM line as the characteristic itself. For simple characteristics
            # like "SEX", this will in fact be the only part.

            if typ:
                models.Characteristic_Part.objects.create(characteristic=c,
                        type=typ, name=str_value)

            # We might have other characteristic part, most notably for names.

            if isinstance(val, GedcomRecord):
                for k, v in val.for_all_fields():
                    t = self._char_types.get(k, None)
                    if t:
                        if k == 'GIVN' and GIVEN_NAME_TO_MIDDLE_NAME:
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

                    else:
                        print "%s Unhandled characteristic: %s" % (
                            location(val), k)

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
                print "No principal given for event: ", data

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

        # If we have a note associated with the event, we assume it deals with
        # the event itself, not with its sources.


        if not evt:
            place = self._create_place(data)
            evt = models.Event.objects.create(type=event_type, place=place,
                    name=name, date=getattr(data, "DATE", None))

            if event_type.gedcom == 'BIRT':
                self._births[principal.id] = evt

        # If an event has an OBJE: since the source is an xref, the object
        # is in fact associated with the place. Unfortunately, it will be duplicated
        # among all other occurrences of that place (which itself is duplicated).

        if getattr(data, "OBJE", None):
            if getattr(data, "PLAC", None) and place:
                for obj in data.OBJE:
                    self._create_source(
                        GedcomRecord(
                            REPO=None,
                            CHAN=CHAN,
                            TITL='Source for %s' % data.PLAC.value,
                            ABBR='Source for %s' % data.PLAC.value,
                            OBJE=obj),
                        subject_place=place)
            else:
                print "%s Unhandled EVENT.OBJE" % (location(data.OBJE))


        for k, v in data.for_all_fields():
            # ADDR and PLAC are handled in create_place
            # SOURCE is handled in create_sources_ref
            if k not in ("DATE", "ADDR", "PLAC", "SOUR", "TYPE", "OBJE",
                         "_all", "xref"):
                print "%s Unhandled EVENT.%s" % (location(v), k)

        last_change = self._create_CHAN(CHAN)
        all_src = self._create_sources_ref(data)

        for person, role in indi:
            if person:
                for s in all_src:
                    models.P2E_Assertion.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        person=person,
                        event=evt,
                        source=s,
                        role=role,
                        last_change=last_change,
                        value='')

        return evt

    def _create_sources_ref(self, data):
        """Create a list of instances of Source for the record described by
         DATA. For instance, if Data is an event, these are all the sources in
         which the event was references.
         If there are no reference, this returns a list with a single element,
         None. As a result, you can always iterate over the result to insert
         rows in the database."""

        if not isinstance(data, unicode) and getattr(data, "SOUR", None):
            all_sources = []

            for s in data.SOUR:
                all_sources.append(self._sources[s.value])
            # src = self._create_source (s)
            # all_sources.append (src)
            return all_sources

        return [None]

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
                # Create the corresponding type in the database, and import the field

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
                # The individual is apparently cited in a source, but is not related
                # to a specific GEDCOM event. So instead we associate with a general
                # census event.
                evt_data = GedcomRecord(SOUR=value)
                self._create_event(indi, field="CENS", data=evt_data)

            else:
                print "%s Unhandled INDI.%s: %s" % (location(value), field, value)

        self._personas[data.id] = indi
        return indi

    def _create_project(self, researcher):
        """Register the project in the database"""

        p = models.Project.objects.create(name='Gedcom import',
                description='Import from ' + self._data.HEAD.FILE,
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
## GedcomFileImporter
##################################

class GedcomFileImporter(mysites.geneapro.importers.Importer):
    """Register a new importer in geneapro: imports GEDCOM files"""

    class Meta:
        """see inherited documentation"""
        displayName = _('GEDCOM')
        description = _('Imports a standard GEDCOM file, which most genealogy'
                        + ' software can export to')

    def __init__(self):
        self._parser = None  # The gedcom parser
        mysites.geneapro.importers.Importer.__init__(self)

    def parse(self, filename):
        """Parse and import a gedcom file"""

        try:
            parsed = Gedcom().parse(filename)
            GedcomImporter(parsed)
        except Invalid_Gedcom, e:
            print e

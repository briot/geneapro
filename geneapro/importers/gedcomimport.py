"""
Provides a gedcom importer
"""

from django.utils.translation import ugettext as _
from mysites.geneapro.utils.gedcom import Gedcom, Invalid_Gedcom, GedcomRecord, GedcomString
from mysites.geneapro import models
from django.db import transaction
import mysites.geneapro.importers
import re

# If true, the given name read from gedcom is split (on spaces) into
# a given name and one or more middle names. This might not be appropriate
# for all languages
GIVEN_NAME_TO_MIDDLE_NAME = True

DEBUG = True


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

            self._principal = models.Event_Type_Role.objects.get(
                pk=models.Event_Type_Role.principal)
            self._birth__father = models.Event_Type_Role.objects.get(
                pk=models.Event_Type_Role.birth__father)
            self._birth__mother = models.Event_Type_Role.objects.get(
                pk=models.Event_Type_Role.birth__mother)

            self._event_types = dict()
            self._char_types = dict()
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

        self._char_types['MIDDLE_NAMES'] = \
            models.Characteristic_Part_Type.objects.get(id=40)

        for p in models.Place_Part_Type.objects.exclude(gedcom__isnull=True):
            if p.gedcom:
                self._place_part_types[p.gedcom] = p

    def _read_source_medium(self):
        for m in models.Source_Medium.objects.all():
            self._source_medium[m.name] = m.id

    def _create_source(self, sour):
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

        try:
            comment = sour.TITL
        except:
            comment = ''

        src = models.Source.objects.create(
            higher_source_id=None,
            subject_place_id=None,
            jurisdiction_place_id=None,
            researcher=self._researcher,
            subject_date=None,
            medium_id=medium_id,
            comments=comment)

        obje = sour.OBJE
        if obje:
            if not isinstance(obje, list):
                obje = [obje]
            for o in obje:
                obj = self._create_obje(o, src)

      # ??? Missing import of NOTE and CHAN

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

        repr = models.Representation.objects.create(source=source,
                mime_type=mime, file=data.FILE, comments=data.TITL)

    def _create_family(self, data):
        """Create the equivalent of a FAMILY in the database"""

        id = data.id

        husb = data.HUSB
        if husb:
            husb = self._personas[husb.id]

        wife = data.WIFE
        if wife:
            wife = self._personas[wife.id]

        for mar in data.MARR:
            evt = models.Event.objects.create(type=self._event_types['MARR'],
                    place=None, name='Marriage', date=mar.DATE)

            for src in self._create_sources_ref(mar):
                if husb:
                    models.P2E_Assertion.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        person=husb,
                        source=src,
                        event=evt,
                        role_id=models.Event_Type_Role.principal,
                        value='event')
                if wife:
                    models.P2E_Assertion.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        person=wife,
                        source=src,
                        event=evt,
                        role_id=models.Event_Type_Role.principal,
                        value='event')

        children = data.CHIL

        # Mark the parents of the child
        for c in data.CHIL:
            sources = self._create_sources_ref(c)

            p = self._personas[c.id]
            try:
                evt = self._births[p.id]
            except:
                self._births[p.id] = models.Event.objects.create(
                    type=self._event_types['BIRT'],
                    place=None, name='Birth of ' + c.NAME[0].value)

                for s in sources:
                    models.P2E_Assertion.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        source=s,
                        person=p,
                        event=self._births[p.id],
                        role=self._principal)

            for s in sources:
                if husb:
                    models.P2E_Assertion.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        person=husb,
                        source=s,
                        event=self._births[p.id],
                        role=self._birth__father)

                if wife:
                    models.P2E_Assertion.objects.create(
                        surety=self._default_surety,
                        researcher=self._researcher,
                        person=wife,
                        source=s,
                        event=self._births[p.id],
                        role=self._birth__mother)

    def _create_place(self, data, id=''):
        """If data contains a subnode PLAC, parse and returns it"""

        if data is None or getattr(data, "ADDR", None) is None:
            return None

        addr = data.ADDR
        data = data.PLAC

        # Check if the place already exists, since GEDCOM will duplicate
        # places unfortunately.
        # We need to take into account all the place parts, which is done
        # by simulating a long name including all the optional parts.

        # Take into account all parts (the GEDCOM standard only defines a
        # few of these for a PLAC, but software such a gramps add quite a
        # number of fields

        long_name = data.value
        if addr:
            for (key, val) in addr.__dict__.iteritems():
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

            # ??? Unhandled attributes of PLAC: FORM, SOURCE and NOTE
            # FORM would in fact tell us how to split the name to get its
            # various components, which we could use to initialize the place
            # parts

            if addr:
                for (key, val) in addr.__dict__.iteritems():
                    if key != 'value' and val:
                        part = self._place_part_types.get(key, None)
                        if not part:
                            print 'Unknown place part: ' + key
                        else:
                            pp = models.Place_Part.objects.create(place=p,
                                    type=part, name=val)

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
            t = None
        else:
            t = self._char_types.get(key, None)
            if not t:
                # This is not a GEDCOM attribute. We will test later on if this
                # is an event, and report the error to the user when
                # appropriate
                return False

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

            if t:
                models.Characteristic_Part.objects.create(characteristic=c,
                        type=t, name=str_value)
                str_value.processed = True # str_value should be a GedcomString

            # We might have other characteristic part, most notably for names.

            if isinstance(val, GedcomRecord):
                for (k, v) in val.__dict__.iteritems():
                    t = self._char_types.get(k, None)
                    if t:
                        if k == 'GIVN' and GIVEN_NAME_TO_MIDDLE_NAME:
                            if v:
                                n = v.replace(',', ' ').split(' ', 2)
                                models.Characteristic_Part.objects.create(
                                    characteristic=c, type=t, name=n[0])

                                if len(n) == 2:
                                    models.Characteristic_Part.objects.create(
                                        characteristic=c,
                                        type=self._char_types['MIDDLE_NAMES'],
                                        name=n[1])
                        elif v:
                            models.Characteristic_Part.objects.create(
                                characteristic=c, type=t, name=v)

                    elif k == 'SOUR':
                        pass  # handled in the _create_sources_ref loop above

                    elif k not in (
                        'TYPE',
                        'ADDR',
                        'AGE',
                        'AGNC',
                        'CAUS',
                        'NOTE',
                        'MULT',
                        'value',
                        'DATE',
                        'OBJE',
                        'PLAC',
                        'PHON',
                        ):
                        print 'Unknown characteristic: ' + k

        return True

    def _create_event(self, indi, event_type, data):
        """Create a new event, and return it"""

        if event_type.gedcom == 'BIRT':
            name = 'Birth of ' + indi.name
            evt = self._births.get(indi.id, None)
        elif event_type.gedcom == 'MARR':
            name = 'Marriage'
            evt = None
        else:
            evt = None
            name = ''

        if not evt:
            place = self._create_place(data)
            evt = models.Event.objects.create(type=event_type, place=place,
                    name=name, date=data.DATE)

            if event_type.gedcom == 'BIRT':
                self._births[indi.id] = evt

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
        indi = models.Persona.objects.create(name=name, description='')

        # Now create the characteristics
        for char in ["NAME"] + self._char_types.keys():
            try:
                if not self._create_characteristic(
                   char, data.__dict__[char], indi):
                    print 'Could not create characteristic %s for indi %s' \
                        % (char, data.id)
            except KeyError:
                pass

        # And finally create the events
        for event in self._event_types.keys():
            try:
                for v in data.__dict__[event]:
                    # This is how Gramps represents marriage events entered as
                    # a person's event (ie partner is not known)
                    if event == 'EVEN' and v.TYPE == 'Marriage':
                        type = self._event_types['MARR']
                    else:
                        type = self._event_types[event]

                    evt = self._create_event(indi=indi, event_type=type,
                            data=v)
                    sources = self._create_sources_ref(v)

                    for s in sources:
                        models.P2E_Assertion.objects.create(
                            surety=self._default_surety,
                            researcher=self._researcher,
                            person=indi,
                            event=evt,
                            source=s,
                            role=self._principal,
                            value='')

            except KeyError:
                pass

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
                addr = addr + data.ADR1 + '\n'
            if data.ADR2:
                addr = addr + data.ADR2 + '\n'
            if data.POST:
                addr = addr + data.POST + '\n'
            if data.CITY:
                addr = addr + data.CITY + '\n'
            if data.STAE:
                addr = addr + data.STAE + '\n'
            if data.CTRY:
                addr = addr + data.CTRY + '\n'

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

"""
Provides a gedcom importer
"""

from django.utils.translation import ugettext as _
from mysites.geneapro.utils.gedcom import Gedcom
from mysites.geneapro import models
from django.db import transaction
import mysites.geneapro.importers
import re

# If true, the given name read from gedcom is split (on spaces) into
# a given name and one or more middle names. This might not be appropriate
# for all languages
GIVEN_NAME_TO_MIDDLE_NAME = True

##################################
## GedcomImporter
##################################

class GedcomImporter (object):
   """
   Abstract Gedcom importer. This translates from the gedcom data model
   into our own, and can be used by any importer for which the software
   uses roughly the gedcom model.
   """

   @transaction.commit_manually
   def __init__ (self, data):
      """
      From the data contained in a gedcom-like file (see description of
      the format in gedcom.py), creates corresponding data in the database.
      data is an instance of GedcomData.
      """

      try:
         self._data = data
         self._researcher = self._create_researcher ()
         prj = self._create_project (self._researcher)

         self._default_surety = prj.scheme.parts.all ()
         self._default_surety = \
            self._default_surety [len (self._default_surety) / 2]

         self._births = dict ()   # Index on person id, contains Event

         self._principal = models.Event_Type_Role.objects.get (
            pk = models.Event_Type_Role.principal)
         self._birth__father = models.Event_Type_Role.objects.get (
            pk = models.Event_Type_Role.birth__father)
         self._birth__mother = models.Event_Type_Role.objects.get (
            pk = models.Event_Type_Role.birth__mother)
         self._marriage__husband = models.Event_Type_Role.objects.get (
            pk = models.Event_Type_Role.marriage__husband)
         self._marriage__wife = models.Event_Type_Role.objects.get (
            pk = models.Event_Type_Role.marriage__wife)

         self._event_types = dict ()
         self._char_types = dict ()
         self._place_part_types = dict ()
         self._get_all_event_types () 
         self._places = dict ()
         self._personas = dict ()

         self._source_medium = dict ()
         self._read_source_medium ()

         self._sources = dict ()
         self._create_all ("SOUR", self._create_source)

         self._create_all ("INDI", self._create_indi)
         self._create_all ("FAM",  self._create_family)

         transaction.commit ()
         #for q in connection.queries:
         #   print unicode (q["sql"]).encode ("ASCII", "replace")

      except:
         transaction.rollback ()
         raise

   def _get_all_event_types (self):
      """Create a local cache for Event_Type"""
      for evt in models.Event_Type.objects.exclude (gedcom__isnull=True):
         self._event_types [evt.gedcom] = evt

      types = models.Characteristic_Part_Type.objects.exclude \
         (gedcom__isnull=True)
      for c in types:
         self._char_types [c.gedcom] = c

      self._char_types ["MIDDLE_NAMES"] = models.Characteristic_Part_Type \
         .objects.get (id=40)

      for p in models.Place_Part_Type.objects.exclude (gedcom__isnull=True):
         self._place_part_types [p.gedcom] = p

   def _create_all (self, tag, callback):
      """Process all records with a specific TAG and import them in the
         database"""
      for key in sorted (self._data.keys()):
         value = self._data[key]
         if value.get ("type") == tag:
            callback (value, id=key)

   def _read_source_medium (self):
      for m in models.Source_Medium.objects.all ():
         self._source_medium [m.name] = m.id

   def _create_source (self, data, id=""):
      #print "SOURCE " + `data`
      # example: {'TITL': 'La Chapelle Chaussee, Mariages, 1876', 'OBJE': [{'TITL': 'Briot, Francois Marie, mariage, La Baussaine, p6', 'FILE': '/home/briot/genealogy/scans/briot_francois_marie/1876_p6_briot_becot.jpg', 'FORM': 'jpeg'}, {'TITL': 'Briot, Francois Marie, mariage, La Baussaine, p6 (2)', 'FILE': '/home/briot/genealogy/scans/briot_francois_marie/1876_p6_briot_becot_2.jpg', 'FORM': 'jpeg'}], 'type': 'SOUR', 'CHAN': {'DATE': {'value': '1 MAR 2010', 'TIME': '18:45:09'}}}

      repo = data.get ("REPO")
      medium_id = 0

      if repo and not isinstance (repo, str):
         caln = repo.get ("CALN")  # call number
         if caln and not isinstance (caln, str):
            medium = caln.get ("MEDI", "").lower ()
            medium_id = self._source_medium.get (medium_id)
            if not medium_id:
               print "Unknown medium type for source %s: %s" % (id, medium)
               medium_id = 0

      src = models.Source.objects.create (
         higher_source_id=None,
         subject_place_id=None,
         jurisdiction_place_id=None,
         researcher=self._researcher,
         subject_date=None,
         medium_id=medium_id,
         comments=data.get ("TITL"))

      obje = data.get ("OBJE")
      if obje:
         if not isinstance (obje, list):
            obje = [obje]
         for o in obje:
            obj = self._create_obje (o, src)

      # ??? Missing import of NOTE and CHAN

      if id:
         self._sources ['@%s@' % id] = src

      return src

   def _create_obje (self, data, source):
      """Create an object (representation) in the database"""
      if data is None:
         return None

      if isinstance (data, str):
         print "Ignore OBJE reference: %s" % (data)
         return

      form_to_mime = {"jpeg":"image/jpeg",
                      "image/png":"image/png"}
      mime = form_to_mime.get (data.get ("FORM"))
      if mime is None:
         print "Unknown mime type for object: " + data.get ("FORM")
         return

      repr = models.Representation.objects.create (
         source=source,
         mime_type=mime,
         file=data.get ("FILE"),
         comments=data.get ("TITL"))

   def _create_family (self, data, id):
      """Create the equivalent of a FAMILY in the database"""
      husb = data.get ("HUSB")
      if husb: 
         husb = self._personas [husb [1:-1]]

      wife = data.get ("WIFE")
      if wife: 
         wife = self._personas [wife [1:-1]]

      marriage = data.get ("MARR")
      if marriage:
         if not isinstance (marriage, list):
            marriage = [marriage]
         for mar in marriage:
            date = mar.get ("DATE")
            if not isinstance (date, list): 
               date = [date]
            for d in date:
               evt = models.Event.objects.create (
                    type=self._event_types ["MARR"],
                    place=None,
                    name="Marriage",
                    date=d)

               for src in self._create_sources_ref (mar):
                  models.P2E_Assertion.objects.create (
                       surety = self._default_surety,
                       researcher = self._researcher,
                       person = husb,
                       source = src,
                       event = evt,
                       role_id= models.Event_Type_Role.marriage__husband,
                       value = "event")
                  models.P2E_Assertion.objects.create (
                       surety = self._default_surety,
                       researcher = self._researcher,
                       person = wife,
                       source = src,
                       event = evt,
                       role_id = models.Event_Type_Role.marriage__wife,
                       value = "event")

      children = data.get ("CHIL")
      if children:
         if not isinstance (children, list):
            children = [children]

         # Mark the parents of the child
         for c in children:
            sources = self._create_sources_ref (c)  # ??? Is this useful

            c = self._personas [c[1:-1]]
            try:
               evt = self._births [c.id]
            except:
               self._births [c.id] = models.Event.objects.create (
                  type=self._event_types ["BIRT"],
                  place=None,
                  name="Birth of " + c.name)

               for s in sources:
                  models.P2E_Assertion.objects.create (
                     surety = self._default_surety,
                     researcher = self._researcher,
                     source = s,
                     person = c,
                     event = self._births [c.id],
                     role = self._principal)

            for s in sources:
               if husb:
                  models.P2E_Assertion.objects.create (
                     surety = self._default_surety,
                     researcher = self._researcher,
                     person = husb,
                     source = s,
                     event = self._births [c.id],
                     role = self._birth__father)
               if wife:
                  models.P2E_Assertion.objects.create (
                     surety = self._default_surety,
                     researcher = self._researcher,
                     person = wife,
                     source = s,
                     event = self._births [c.id],
                     role = self._birth__mother)

   def _create_place (self, data, id=""):
      """If data contains a subnode PLAC, parse and returns it"""

      if not isinstance (data, dict):
         # Can't find a PLAC subnode if we only have a string
         return None

      data = data.get ("PLAC", None)

      if data is None:
         return None

      if isinstance (data, str):
         name = data
         long_name = name
      else:
         name = data.get ('value', "")

         # Check if the place already exists, since GEDCOM will duplicate
         # places unfortunately.
         # We need to take into account all the place parts, which is done
         # by simulating a long name including all the optional parts.

         long_name = name
         for info in sorted (data.keys ()):
            if info != "value":
               if info == "MAP":
                  long_name = long_name + " " + info + "=" \
                    + data[info].get ("LATI") + data[info].get("LONG")
               else:
                  long_name = long_name + " " + info + "=" + data[info]

      p = self._places.get (long_name)

      if not p:
         p = models.Place.objects.create (
             name = name,
             date = None,
             parent_place = None)
         self._places [long_name] = p  # For reuse

         # ??? Unhandled attributes of PLAC: FORM, SOURCE and NOTE
         # FORM would in fact tell us how to split the name to get its various
         # components, which we could use to initialize the place parts

         # Take into account all parts (the GEDCOM standard only defines a
         # few of these for a PLAC, but software such a gramps add quite a
         # number of fields
      
         if isinstance (data, dict):
            for info in data.keys ():
               if info != "value":
                  part = self._place_part_types.get (info, None)
                  if not part:
                     print "Unknown place part: " + info
                  else:
                     if info == "MAP":
                        value = data[info].get ("LATI") + \
                           " " + data[info].get ("LONG")
                     else:
                        value = data [info]
               
                     pp = models.Place_Part.objects.create (
                        place = p,
                        type = part,
                        name = value)

      return p

   def _create_characteristic (self, key, value, indi):
      """Create a Characteristic for the person indi.
         Return True if a characteristic could be created, false otherwise.
         (key,data) come from the GEDCOM structure, and could be:
               {"SEX": "Male"}
               {"NAME": {"value":"Smith", "GIVN":"Joe", "SURN":"Smith"}}
         As defined in the GEDCOM standard, and except for the NAME which
         is special, all other attributes follow the following grammar:
             n TITL nobility_type_title
             +1 <EVENT_DETAIL>
         where EVENT_DETAIL can define any of the following: TYPE, DATE,
         PLAC, ADDR, AGE, AGNC, CAUS, SOUR, NOTE, MULT
      """

      if key == "NAME":
         # Special handling for name: its value was used to create the
         # person itself, and now we are only looking into its subelements
         # for the components of the name
         t = None
      else:
         t = self._char_types.get (key, None)
         if not t:
            # This is not a GEDCOM attribute. We will test later on if this
            # is an event, and report the error to the user when appropriate
            return False
  
      if not isinstance (value, list):
         value = [value]

      for val in value:
         if isinstance (val, str):
            c = models.Characteristic.objects.create (place=None)
            str_value = val
         else:
            place = self._create_place (val)
            c = models.Characteristic.objects.create (
               place=place, date=val.get ("DATE"))
            str_value = val.get ("value")

         # Associate the characteristic with the persona

         for s in self._create_sources_ref (val):
            models.P2C_Assertion.objects.create (
                surety = self._default_surety,
                researcher = self._researcher,
                person = indi,
                source = s,
                characteristic = c,
                value = "charac")

         # The main characteristic part is the value found on the same GEDCOM
         # line as the characteristic itself.

         if t:
            models.Characteristic_Part.objects.create (
               characteristic=c, type=t, name=str_value)

         # We might have other characteristic part, most notably for names.

         if isinstance (val, dict):
            for k, v in val.iteritems ():
               t = self._char_types.get (k, None)
               if t:
                  if k == "GIVN" and GIVEN_NAME_TO_MIDDLE_NAME:
                     n = v.replace (',',' ').split(' ', 2)
                     models.Characteristic_Part.objects.create (
                        characteristic=c,
                        type=t,
                        name=n[0])
                     if len (n) == 2:
                        models.Characteristic_Part.objects.create (
                           characteristic=c,
                           type=self._char_types ["MIDDLE_NAMES"],
                           name=n[1])

                  else:
                     models.Characteristic_Part.objects.create (
                        characteristic=c,
                        type=t,
                        name=v)

               elif k == "SOUR":
                  pass  # handled in the _create_sources_ref loop above

               elif k not in ("TYPE", "ADDR", "AGE", "AGNC", "CAUS",
                              "NOTE", "MULT", "value"):
                  print "Unknown characteristic: " + k
 
      return True

   def _create_event (self, indi, event_type, data):
      """Create a new event, and return it"""

      if event_type.gedcom == "BIRT":
         name = "Birth of " + indi.name
         evt = self._births.get (indi.id, None)
      else:
         evt = None
         name = ""

      if not evt:
         place = self._create_place (data)
         evt = models.Event.objects.create (
             type=event_type,
             place=place,
             name=name,
             date=data.get ("DATE"))

         if event_type.gedcom == "BIRT":
            self._births [indi.id] = evt

      return evt

   def _create_sources_ref (self, data):
      """Create a list of instances of Source for the record described by
         DATA. For instance, if Data is an event, these are all the sources in
         which the event was references.
         If there are no reference, this returns a list with a single element,
         None. As a result, you can always iterate over the result to insert
         rows in the database."""

      if isinstance (data, dict):
         sources = data.get ("SOUR")
         if sources:
            if not isinstance (sources, list):
               sources = [sources]

            all_sources = []

            for s in sources:
               if isinstance (s, str):
                  all_sources.append (self._sources [s])
               else:
                  src = self._create_source (s)
                  all_sources.append (src)
            return all_sources

      return [None]

   def _create_indi (self, data, id):
      """Create the equivalent of an INDI in the database"""

      # The name to use is the first one in the list of names
      name = data["NAME"]
      if isinstance (name, list): 
         name = name[0]
      if isinstance (name, dict): 
         name = name["value"]

      indi = models.Persona.objects.create (name=name, description="")

      # Now create the events and characteristics
      for key, value in data.iteritems ():
         if key in ("FAMC", "FAMS"):
            # Ignored, this will be set when parsing the families
            continue

         if not self._create_characteristic (key, value, indi):
            t = self._event_types.get (key)
            if t:
               if not isinstance (value, list):
                  value = [value]
               for v in value:   # For all events of the same type KEY
                  if not isinstance (v, str):
                     evt = self._create_event (indi=indi, event_type=t, data=v)
                     sources = self._create_sources_ref (v)

                     if t.gedcom == "BIRT" and id == "I0447":
                        print "Found birth of Joseph Marie Briot"
                        print evt
                        print data
                        print "sources=" + `sources`

                     for s in sources:
                        models.P2E_Assertion.objects.create (
                           surety = self._default_surety,
                           researcher = self._researcher,
                           person = indi,
                           event = evt,
                           source = s,
                           role = self._principal,
                           value = "")

            elif key == "SOUR":
               pass # already handled (?) in the create_sources_ref above

            elif key not in ("type",
                             "CHAN", "ASSO", "OBJE", "FACT",
                             "NOTE"):
               print "Unknown event type:" + key

      self._personas [id] = indi
      return indi

   def _create_project (self, researcher):
      """Register the project in the database"""

      p = models.Project.objects.create (
          name= "Gedcom import",
          description= "Import from " + self._data ["HEAD"]["FILE"],
          scheme= models.Surety_Scheme.objects.get (id=1))
      models.Researcher_Project.objects.create (
          researcher=researcher,
          project=p,
          role="Generated GEDCOM file")
      return p

   @staticmethod
   def _addr_to_string (data):
      """
      Convert an ADDR field to a single string. Our model does use different
      fields for current addresses
      """
      addr = data.get ("value") + "\n" + \
         data.get ("ADR1","") + "\n" + data.get ("ADR2","") + "\n" + \
         data.get ("POST","") + " " + data.get ("CITY","") + "\n" + \
         data.get ("STAE","") + "\n" + data.get ("CTRY","")

      # Gramps sets this when the address is not provided
      addr = addr.replace ("Not Provided", "")

      # Cleanup empty lines
      addr = re.sub ("^\n+", "", re.sub ("\n+", "\n", addr))

      return addr

   def _create_researcher (self):
      """
      Create the Researcher that created the data contained in the gedcom
      file
      """
      subm = self._data.deref (self._data["HEAD"]["SUBM"])
      return models.Researcher.objects.create (
          name= subm["NAME"],
          comment= GedcomImporter._addr_to_string (subm.get ("ADDR")) + "\n"\
                   + subm.get ("PHON",""))

##################################
## GedcomFileImporter
##################################

class GedcomFileImporter (mysites.geneapro.importers.Importer):
   """Register a new importer in geneapro: imports GEDCOM files"""

   class Meta:
      """see inherited documentation"""
      displayName = _("GEDCOM")
      description = _("Imports a standard GEDCOM file, which most genealogy" \
                      + " software can export to")

   class ErrorProxy:
      """Report an error that occurred during an import"""
      def __init__ (self, wrapped):
         self._wrapped = wrapped
      def write (self, msg):
         """wraps a function into a class as a proxy"""
         self._wrapped (msg)

   def __init__ (self):
      self._parser = None  # The gedcom parser
      mysites.geneapro.importers.Importer.__init__ (self)

   def parse (self, stream):
      """Parse and import a gedcom file"""
      parser = Gedcom (stream,
                       error=GedcomFileImporter.ErrorProxy (self.error))
      if parser.get_records ():
         GedcomImporter (parser.get_records ())
       

"""
Provides a gedcom importer
"""

from django.utils.translation import ugettext as _
from mysites.geneapro.utils.gedcom import Gedcom
from mysites.geneapro import models
from django.db import transaction
import mysites.geneapro.importers
import re

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

      for p in models.Place_Part_Type.objects.exclude (gedcom__isnull=True):
         self._place_part_types [p.gedcom] = p

   def _create_all (self, tag, callback):
      """Process all records with a specific TAG and import them in the
         database"""
      for key in sorted (self._data.keys()):
         value = self._data[key]
         if value.get ("type") == tag:
            self._personas [key] = callback (value)

   def _create_family (self, data):
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
               models.P2E_Assertion.objects.create (
                    surety = self._default_surety,
                    researcher = self._researcher,
                    person = husb,
                    event = evt,
                    role_id= models.Event_Type_Role.marriage__husband,
                    value = "event")
               models.P2E_Assertion.objects.create (
                    surety = self._default_surety,
                    researcher = self._researcher,
                    person = wife,
                    event = evt,
                    role_id = models.Event_Type_Role.marriage__wife,
                    value = "event")

      children = data.get ("CHIL")
      if children:
         if not isinstance (children, list):
            children = [children]

         # Mark the parents of the child
         for c in children:
            c = self._personas [c[1:-1]]
            try:
               evt = self._births [c.id]
            except:
               self._births [c.id] = models.Event.objects.create (
                  type=self._event_types ["BIRT"],
                  place=None,
                  name="Birth of " + c.name)
               models.P2E_Assertion.objects.create (
                  surety = self._default_surety,
                  researcher = self._researcher,
                  person = c,
                  event = self._births [c.id],
                  role = self._principal)

            if husb:
               models.P2E_Assertion.objects.create (
                  surety = self._default_surety,
                  researcher = self._researcher,
                  person = husb,
                  event = self._births [c.id],
                  role = self._birth__father)
            if wife:
               models.P2E_Assertion.objects.create (
                  surety = self._default_surety,
                  researcher = self._researcher,
                  person = wife,
                  event = self._births [c.id],
                  role = self._birth__mother)

   def _create_place (self, data):
      """Create (or reuse) a place entry in the database"""

      if data == None:
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

   def _create_indi (self, data):
      """Create the equivalent of an INDI in the database"""

      # The name to use is the first one in the list of names
      name = data["NAME"]
      if isinstance (name, list): 
         name = name[0]
      if isinstance (name, dict): 
         name = name["value"]

      indi = models.Persona.objects.create (name=name, description="")

      # Now create the events
      for key, value in data.iteritems ():
         if key in ("FAMC", "FAMS"):
            # Ignored, this will be set when parsing the families
            continue

         try:
            t = self._char_types [key]
            if not isinstance (value, list):
               value = [value]
            for v in value:
               if isinstance (v, str):
                  c = models.Characteristic.objects.create (place=None)
                  str_value = v

               else:
                  c = models.Characteristic.objects.create (
                         place=None, date=v.get ("DATE"))
                  str_value = v.get ("value")

               models.Characteristic_Part.objects.create (
                      characteristic=c,
                      type=t,
                      name=str_value)
               models.P2C_Assertion.objects.create (
                      surety = self._default_surety,
                      researcher = self._researcher,
                      person = indi,
                      characteristic = c,
                      value = "charac")

         except KeyError:
            try:
               t = self._event_types [key]
               if not isinstance (value, list):
                  value = [value]
               for v in value:
                  if not isinstance (v, str):
                     evt = None

                     if key == "BIRT":
                        name = "Birth of " + indi.name
                        evt = self._births.get (indi.id, None)
                     else:
                        name = ""

                     if not evt:
                        place = self._create_place (v.get ("PLAC"))
                        evt = models.Event.objects.create (
                           type=t,
                           place=place,
                           name=name,
                           date=v.get ("DATE"))

                     if key == "BIRT":
                        self._births [indi.id] = evt

                     models.P2E_Assertion.objects.create (
                        surety = self._default_surety,
                        researcher = self._researcher,
                        person = indi,
                        event = evt,
                        role = self._principal,
                        value = "")

            except KeyError:
               if key not in ("NAME", "type", "SOUR",
                              "CHAN", "ASSO", "OBJE", "FACT",
                              "NOTE"):
                  print "Unknown event type:" + key

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
   """Register a new imported in geneapro: imports GEDCOM files"""

   class Meta:
      """see inherited documentation"""
      displayName = _("GEDCOM")
      description = _("Imports a standard GEDCOM file, which most genealogy" \
                      + " can export to")

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
       

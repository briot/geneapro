from django.utils.translation import ugettext as _
from mysites.geneapro.utils.gedcom import Gedcom
from mysites.geneapro.models import *
from django.db import transaction, connection
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

          self._get_all_event_types () 
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
       self._event_types = dict ()
       for evt in Event_Type.objects.exclude (gedcom__isnull=True):
          self._event_types [evt.gedcom] = evt

       self._char_types = dict ()
       for c in Characteristic_Part_Type.objects.exclude (gedcom__isnull=True):
          self._char_types [c.gedcom] = c

    def _create_all (self, tag, callback):
       for key in sorted (self._data.keys()):
           value = self._data[key]
           if value.get ("type") == tag:
              self._personas [key] = callback (value)

    def _create_family (self, data):
       husb = data.get ("HUSB")
       if husb: husb = self._personas [husb [1:-1]]

       wife = data.get ("WIFE")
       if wife: wife = self._personas [wife [1:-1]]

       marriage = data.get ("MARR")
       if marriage:
          if not isinstance (marriage, list): marriage = [marriage]
          for mar in marriage:
             date = mar.get ("DATE")
             if not isinstance (date, list): date = [date]
             for d in date:
                evt = Event.objects.create (
                     type=self._event_types ["MARR"],
                     place=None,
                     name="Marriage",
                     date=d)
                a = Assertion.objects.create (
                     surety = self._default_surety,
                     researcher = self._researcher,
                     subject1 = husb,
                     subject2 = wife,
                     value = "marriage")

       children = data.get ("CHIL")
       if children:
          if not isinstance (children, list):
             children = [children]

          # Mark the parents of the child
          for c in children:
             c = self._personas [c[1:-1]]
             if husb:
                a = Assertion.objects.create (
                   surety = self._default_surety,
                   researcher = self._researcher,
                   subject1 = husb,
                   subject2 = c,
                   value = "father of")
             if wife:
                a = Assertion.objects.create (
                   surety = self._default_surety,
                   researcher = self._researcher,
                   subject1 = wife,
                   subject2 = c,
                   value = "mother of")
          

    def _create_indi (self, data):
       # The name to use is the first one in the list of names
       name = data["NAME"]
       if isinstance (name, list): name = name[0]
       if isinstance (name, dict): name = name["value"]

       indi = Persona.objects.create (name=name, description="")

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
                    c = Characteristic.objects.create (place=None)
                    str_value = v

                 else:
                    c = Characteristic.objects.create (
                           place=None, date=v.get ("DATE"))
                    str_value = v.get ("value")

                 p = Characteristic_Part.objects.create (
                        characteristic=c,
                        type=t,
                        name=str_value)
                 a = Assertion.objects.create (
                        surety = self._default_surety,
                        researcher = self._researcher,
                        subject1 = indi,
                        subject2 = c,
                        value = "has")

           except KeyError:
              try:
                 t = self._event_types [key]
                 if not isinstance (value, list):
                    value = [value]
                 for v in value:
                    if not isinstance (v, str):
                       evt = Event.objects.create (
                          type=t,
                          place=None,
                          name="",
                          date=v.get ("DATE"))
                       a = Assertion.objects.create (
                          surety = self._default_surety,
                          researcher = self._researcher,
                          subject1 = indi,
                          subject2 = evt,
                          value = "has")

              except KeyError:
                 if key not in ("NAME", "type", "SOUR",
                                "CHAN", "ASSO", "OBJE", "FACT",
                                "NOTE"):
                     print "Unknown event type:" + key

       return indi

    def _create_project (self, researcher):
       p = Project.objects.create (
           name= "Gedcom import",
           description= "Import from " + self._data ["HEAD"]["FILE"],
           scheme= Surety_Scheme.objects.get (id=1))
       r = Researcher_Project.objects.create (
           researcher=researcher,
           project=p,
           role="Generated GEDCOM file")
       return p

    def _addr_to_string (self, data):
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
       return Researcher.objects.create (
           name= subm["NAME"],
           comment= self._addr_to_string (subm.get ("ADDR")) + "\n"\
                    + subm.get ("PHON",""))

##################################
## GedcomFileImporter
##################################

class GedcomFileImporter (mysites.geneapro.importers.Importer):
    class Meta:
        displayName = _("GEDCOM")
        description = _("Imports a standard GEDCOM file, which most genealogy can export to")

    class ErrorReport:
       def __init__ (self, wrapped):
          self._wrapped = wrapped
       def write (self, msg):
          self._wrapped (msg)

    def __init__ (self):
       self._parser = None  # The gedcom parser

    def parse (self, file):
       parser = Gedcom (file,
                        error=GedcomFileImporter.ErrorReport (self.error))
       if parser.getRecords ():
          GedcomImporter (parser.getRecords ())
       

"""
Provides new commands to ./manage.py
"""

import sys
from mysites.geneapro.importers.gedcomimport import GedcomFileImporter
from django.utils import termcolors
from django.core.management.base import LabelCommand

STYLE = termcolors.make_style (fg='green', opts=('bold',))

class Command (LabelCommand):
   """A new command that imports a GEDCOM file"""

   help = 'Import a GEDCOM file into the database'
   label = 'filename'
   args = ''
   requires_model_validation = True

   def handle_label (self, label, **options):
      """Process the import command"""
      sys.stdout.write (STYLE  ('Importing %s' % label) + '\n')
      GedcomFileImporter ().parse (label)
      sys.stdout.write (STYLE  ('Done importing\n'))

"""
Provides new commands to ./manage.py
"""

import sys
from mysites.geneapro.importers.gedcomimport import GedcomFileImporter
from django.utils import termcolors
from django.core.management.base import LabelCommand
import time

STYLE = termcolors.make_style (fg='green', opts=('bold',))


class Command(LabelCommand):
   """A new command that imports a GEDCOM file"""

   help = 'Import a GEDCOM file into the database'
   label = 'filename'
   args = ''
   requires_model_validation = True

   def handle_label(self, filename, **options):
      """Process the import command.
         This function is called for each file specified on the command line
      """
      sys.stdout.write(STYLE('Importing %s' % filename) + '\n')
      start = time.time()
      GedcomFileImporter().parse (filename)

      end = time.time()
      sys.stdout.write(
          STYLE('Done importing (%0.3f s)\n' % (end - start,)))

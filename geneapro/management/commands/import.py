import sys
from mysites.geneapro.importers.gedcomimport import GedcomFileImporter
from django.utils import termcolors
from django.core.management.base import LabelCommand

style = termcolors.make_style (fg='green', opts=('bold',))

class Command (LabelCommand):
   help = 'Import a GEDCOM file into the database'
   label = 'filename'
   args = ''
   requires_model_validation = True

   def handle_label (self, label, **options):
       sys.stdout.write (style  ('Importing %s' % label) + '\n')
       GedcomFileImporter ().parse (file (label))
       sys.stdout.write (style  ('Done importing\n'))

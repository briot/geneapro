"""
Provides new commands to ./manage.py
"""

import sys
import time
from geneaprove.importers.gedcomimport import GedcomFileImporter
from django.utils import termcolors
from django.core.management.base import LabelCommand

STYLE = termcolors.make_style(fg='green', opts=('bold',))


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
        sys.stdout.write(STYLE(f'Importing {filename}\n'))
        start = time.time()
        success, errors = GedcomFileImporter().parse(filename)
        if errors:
            print(errors)

        end = time.time()
        sys.stdout.write(
            STYLE(f'Done importing ({(end - start):0.3f} s)\n'))

        print("\n")
        print("Run 'ANALYZE;' in the database to optimize it")

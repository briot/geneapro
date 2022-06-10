"""
This file provides a GEDCOM syntactical parser.
It parses a GEDCOM file, and creates a tree in memory corresponding
to the GEDCOM file, without doing any interpretation of this tree.

Example of use:
    ged = Gedcom().parse("myfile.ged")

The resulting data structure is a GedcomFile, which provides subprograms
to access the various fields.

This package provides minimal error handling: it checks that tags occur as
many times as needed in the standard, and not more. Otherwise an error is
raised. This check is based on the Gedcom 5.5.1 grammar

Performance:
   parses Royal92-Famous European Royalty Gedcom.ged
      0.198s

   Catalog of life database (1_275_735 species, 2.1 million individuals)
   http://famousfamilytrees.blogspot.se/2008/07/species-family-trees.html
      42.78s

"""

import logging
import sys
import time
from typing import Optional, BinaryIO, Union
from .file import File
from .lexical import Lexical
from .grammar import FILE
from .records import GedcomRecord


logger = logging.getLogger('geneaprove.gedcom')


def parse_gedcom(
        filename: Union[BinaryIO, str],
        print_warning=lambda m: print(m),
        ) -> Optional[GedcomRecord]:
    """Parse the specified GEDCOM file, check its syntax, and return a
       GedcomFile instance.
       Raise Invalid_Gedcom in case of error.
       :param filename:
           Either the name of a file, or an instance of a class
           compatible with file.
    """
    start = time.time()
    result = FILE.parse(Lexical(File(filename), print_warning=print_warning))
    logger.info(f'Parsed in {(time.time() - start)}s')
    return result


if __name__ == '__main__':
    parse_gedcom(sys.argv[1])

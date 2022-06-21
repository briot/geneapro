"""
unittest-based framework for testing imports
"""

import unittest
import os
import os.path
from .. import gedcomimport
from ...utils.gedcom.exceptions import Invalid_Gedcom


class GedcomImportTestCase(unittest.TestCase):
    def setUp(self):
        """see inherited documentation"""
        self.dir = os.path.normpath(os.path.dirname(__file__))
        self.maxDiff = None   # Want to see full exceptions backtrace

    def _process_file(self, filename):
        """import a file and test the expected output"""

        try:
            success, msg = gedcomimport.GedcomFileImporter().parse(filename)
            error = f'{"OK" if success else "FAILED"}\n{msg}\n'
        except Invalid_Gedcom as e:
            error = e.msg + "\n" + msg

        expected_name = os.path.splitext(filename)[0] + ".out"
        try:
            # Do not guess the encoding
            expected = open(expected_name, encoding='latin-1').read()
        except IOError:
            expected = "OK\n"
        out = error.replace(self.dir, "<dir>")
        self.assertEqual(expected, out, msg=f"in {filename}")

    def _process_dir(self, dir):
        for f in sorted(os.listdir(dir)):
            if os.path.splitext(f)[1] == ".ged":
                self._process_file(os.path.join(dir, f))

    def test_gedcom_importer(self):
        """Test gedcom importer errors"""
        self._process_dir(self.dir)

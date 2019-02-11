"""
unittest-based framework for testing imports
"""

import unittest
import os
import os.path
from .. import gedcomimport


class GedcomImportTestCase(unittest.TestCase):
    def setUp(self):
        """see inherited documentation"""
        self.dir = os.path.normpath(os.path.dirname(__file__))
        self.maxDiff = None   # Want to see full exceptions backtrace

    def _process_file(self, filename):
        """import a file and test the expected output"""

        try:
            success, msg = gedcomimport.GedcomFileImporter().parse(filename)
            error = "%s\n%s\n" % ("OK" if success else "FAILED", msg)
        except gedcom.Invalid_Gedcom as e:
            error = e.msg + "\n" + msg

        expected_name = os.path.splitext(filename)[0] + ".out"
        try:
            # Do not guess the encoding
            expected = open(expected_name, encoding='latin-1').read()
        except IOError:
            expected = "OK\n"
        out = error.replace(self.dir, "<dir>")
        self.assertEqual(expected, out, msg="in %s" % filename)

    def _process_dir(self, dir):
        for f in sorted(os.listdir(dir)):
            if os.path.splitext(f)[1] == ".ged":
                self._process_file(os.path.join(dir, f))

    def test_gedcom_importer(self):
        """Test gedcom importer errors"""
        self._process_dir(self.dir)

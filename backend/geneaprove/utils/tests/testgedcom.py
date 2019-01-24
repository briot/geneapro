"""
unittest-based framework for testing units in GeneaProve.utils
"""

import unittest
import os
import os.path
from .. import gedcom


class GedcomTestCase(unittest.TestCase):

    """Tests for gedcom.py"""

    def setUp(self):
        """see inherited documentation"""
        self.dir = os.path.normpath(os.path.dirname(__file__))

    def _process_file(self, filename):
        """parse a file and test the expected output"""

        error = ""
        try:
            # Universal newline
            gedcom.parse_gedcom(filename)
            error = error + "OK\n"
        except gedcom.Invalid_Gedcom as e:
            error = error + e.msg + "\n"

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

    def test_gedcom_error(self):
        """Test gedcom validation errors"""
        self._process_dir(self.dir)
        self._process_dir(os.path.join(self.dir, "stress_tests"))

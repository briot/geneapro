"""
unittest-based framework for testing units in GeneaProve.utils
"""

import unittest
import os
import os.path
from ..gedcom import parse_gedcom
from ..gedcom.exceptions import Invalid_Gedcom


class GedcomTestCase(unittest.TestCase):

    """Tests for gedcom.py"""

    def setUp(self):
        """see inherited documentation"""
        self.dir = os.path.normpath(os.path.dirname(__file__))

    def _process_file(self, filename):
        """parse a file and test the expected output"""

        error = []

        def pw(msg):
            error.append(msg)

        try:
            # Universal newline
            parse_gedcom(filename, print_warning=pw)
            error.append('OK')
        except Invalid_Gedcom as e:
            error.append(e.msg)

        expected_name = os.path.splitext(filename)[0] + ".out"
        try:
            # Do not guess the encoding
            expected = open(expected_name, encoding='latin-1').read()
        except IOError:
            expected = "OK\n"
        out = '\n'.join(error).replace(self.dir, "<dir>")
        self.assertEqual(expected, out + '\n', msg=f"in {filename}")

    def _process_dir(self, dir):
        for f in sorted(os.listdir(dir)):
            if os.path.splitext(f)[1] == ".ged":
                self._process_file(os.path.join(dir, f))

    def test_gedcom_error(self):
        """Test gedcom validation errors"""
        self._process_dir(self.dir)
        self._process_dir(os.path.join(self.dir, "stress_tests"))

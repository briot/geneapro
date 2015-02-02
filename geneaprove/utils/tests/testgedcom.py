"""
unittest-based framework for testing units in GeneaProve.utils
"""

import unittest
import os, os.path
from .. import gedcom

class GedcomTestCase (unittest.TestCase):
   """Tests for gedcom.py"""

   def setUp (self):
      """see inherited documentation"""
      self.dir = os.path.normpath (os.path.dirname (__file__))
      self.parsers = gedcom.Gedcom ()

   def _process_file (self, filename):
      """parse a file and test the expected output"""

      error = ""
      try:
         # Universal newline
         self.parsers.parse (filename)
         error = error + "OK\n"
      except gedcom.Invalid_Gedcom, e:
         error = error + e.msg + "\n"

      expected_name = os.path.splitext (filename)[0] + ".out"
      try:
         expected = file (expected_name).read ()
      except IOError:
         expected = "OK\n"
      out = error.replace (self.dir, "<dir>")
      self.assertEqual (expected, out)

   def _process_dir (self, dir):
      for f in sorted (os.listdir (dir)):
         if os.path.splitext (f)[1] == ".ged":
            self._process_file (os.path.join (dir, f))

   def test_gedcom_error (self):
      """Test gedcom validation errors"""
      self._process_dir (self.dir)
      self._process_dir (os.path.join (self.dir, "stress_tests"))


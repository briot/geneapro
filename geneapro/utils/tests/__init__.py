import unittest
import os, os.path
from .. import gedcom

class _MemoryFile (object):
	def __init__ (self):
		self.output = ""
	def write (self, msg):
		self.output = self.output + msg

class GedcomTestCase (unittest.TestCase):
    def setUp (self):
        self.dir = os.path.normpath (os.path.dirname (__file__))

    def _openFile (self, filename):
        return file (os.path.join (self.dir, filename))

    def _processFile (self, filename):
        error = _MemoryFile ()
        ged = gedcom.Gedcom (self._openFile (filename), error=error)
        expected_name = os.path.splitext (filename)[0] + ".out"
        try:
            expected = self._openFile (expected_name).read ()
        except IOError:
            expected = ""
        out = error.output.replace (self.dir, "<dir>")
        self.assertEqual (expected, out)

    def testGedcomError (self):
        files = os.listdir (self.dir)
        files.sort()
        for f in files:
           if os.path.splitext (f)[1] == ".ged":
              self._processFile (f)

import unittest
import os, os.path
from .. import gedcom, date

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

Jan_1_2008        = 2454467
Jan_1_2008_Eleven = 2454466
Oct_22_2008       = 2454762
Oct_11_2008       = 2454751
Jan_1_1400        = 2232408
Jan_1_1583        = 2299239
Jan_1_1581        = 2298143
Jan_1_1583_Ju     = 2299249
Oct_2_1802        = 2379501
Aug_28_1803       = 2379831
Dec_20_2007       = 2454455
Jan_1_1996        = 2450084
Dec_1_2008        = 2454802
Jan_1_1700_Ju     = 2341983
Jan_15_Undefined  = 260104
May_1_Undefined   = 260211

class DateTestCase (unittest.TestCase):
    def _assertDate (self, inputDate, day, expected):
        d = date.DateRange (inputDate)
        error = ""

        if not d.date:
           error = "Could not parse date"
        elif type (d.date) == tuple:
           if type (day) != tuple:
              error = "expected a simple date for result"
           elif d.date[0].date != day[0]:
              error = str (d.date[0].date) + " != " + str (day[0])
           elif d.date[1].date != day[1]:
              error = str (d.date[1].date) + " != " + str (day[1])
        elif type (day) == tuple:
           erro = "expected a range for result"
        elif d.date.date != day:
           error = str (d.date.date) + " != " + str (day)

        if expected and str (d) != expected:
           error =  str (d) + "\n  != " + expected

        self.assertFalse (error, "Error for: " + inputDate + "\n     " + error)

    def _assertRoman (self, str, val):
        self.assertEqual (val, date.from_roman_literal (str))
        self.assertEqual (str, date.to_roman_literal (val))

    def testRoman (self):
        self._assertRoman ("I", 1)
        self._assertRoman ("II", 2)
        self._assertRoman ("III", 3)
        self._assertRoman ("IV", 4)
        self._assertRoman ("V", 5)
        self._assertRoman ("VI", 6)
        self._assertRoman ("VII", 7)
        self._assertRoman ("VIII", 8)
        self._assertRoman ("IX", 9)
        self._assertRoman ("X", 10)
        self._assertRoman ("XI", 11)
        self._assertRoman ("XIV", 14)
        self._assertRoman ("MCDXLIV", 1444)

    def testDate (self):
        self._assertDate ("2008-01-01", Jan_1_2008, "2008-01-01")
        self._assertDate ("2008-01-01 1:01am",Jan_1_2008,"2008-01-01 01:01:00")
        self._assertDate ("2008-01-01 11:01:12", Jan_1_2008, "2008-01-01 11:01:12")
        self._assertDate ("2008-01-01 00:00:00", Jan_1_2008, "2008-01-01 00:00:00")
        self._assertDate ("2008-01-01 23:59:59", Jan_1_2008, "2008-01-01 23:59:59")
        self._assertDate ("20080101?", Jan_1_2008, "2008-01-01 ?")
        self._assertDate ("22/10/2008?", Oct_22_2008, "2008-10-22 ?")
        self._assertDate ("10/22/2008", Oct_22_2008, "2008-10-22")
        self._assertDate ("10/11/2008", Oct_11_2008, "2008-10-11")
        self._assertDate ("1 jan 2008?", Jan_1_2008, "2008-01-01 ?")
        self._assertDate ("01 jan 2008", Jan_1_2008, "2008-01-01")
        self._assertDate ("jan 1, 2008", Jan_1_2008, "2008-01-01")
        self._assertDate ("jan 1 2008", Jan_1_2008, "2008-01-01")
        self._assertDate ("1 january 2008", Jan_1_2008, "2008-01-01")
        self._assertDate ("EST JAN 2008", Jan_1_2008, "2008-01-01 ?")
        self._assertDate ("2008-01-01 est", Jan_1_2008, "2008-01-01 ?")
        self._assertDate ("2008", Jan_1_2008, "2008")
        self._assertDate ("2008 ?  ", Jan_1_2008, "2008 ?")
        self._assertDate ("ca 2008", Jan_1_2008, "ca 2008")
        self._assertDate ("~2008", Jan_1_2008, "ca 2008")
        self._assertDate ("<2008", Jan_1_2008, "/2008")
        self._assertDate (">1 jan 2008", Jan_1_2008, "2008-01-01/")
        self._assertDate ("2008-01", Jan_1_2008, "2008-01")
        self._assertDate ("05-01", May_1_Undefined, "????-05-01")
        self._assertDate ("15-01", Jan_15_Undefined, "????-01-15")
        self._assertDate ("01-15", Jan_15_Undefined, "????-01-15")
        self._assertDate ("1400-01-01", Jan_1_1400, "1400-01-01 (Julian)")
        self._assertDate ("1583-01-01", Jan_1_1583, "1583-01-01")
        self._assertDate ("1583-01-01 - 3 years", Jan_1_1581, "1580-01-01")
        self._assertDate ("1583-01-01 JU   ", Jan_1_1583_Ju, "1583-01-01 (Julian)")
        self._assertDate ("1583-01-01 OS   ", Jan_1_1583_Ju, "1583-01-01 (Julian)")
        self._assertDate ("1583-01-01 (JU)   ", Jan_1_1583_Ju, "1583-01-01 (Julian)")
        self._assertDate ("1583-01-01 GR", Jan_1_1583, "1583-01-01")
        self._assertDate ("1 vendemiaire I F", 2375840, "1 vendemiaire I")
        self._assertDate ("2 vendemiaire I F", 2375841, "2 vendemiaire I")
        self._assertDate ("1 brumaire I F", 2375870, "1 brumaire I")
        self._assertDate ("1 brumaire II F", 2376235, "1 brumaire II")
        self._assertDate ("1 brumaire XI F", 2379522, "1 brumaire XI")
        self._assertDate ("10 vendemiaire XI F", Oct_2_1802, "10 vendemiaire XI")
        self._assertDate ("10 vendemiaire XI", Oct_2_1802, "10 vendemiaire XI")
        self._assertDate ("10 fructidor 11 (French Republican)", Aug_28_1803, "10 fructidor XI")
        self._assertDate ("10 fructidor 11", Aug_28_1803, "10 fructidor XI")
        self._assertDate ("before 10 fructidor 11 (French Republican)", Aug_28_1803,
         "/10 fructidor XI")
        self._assertDate ("2008-01-01 - 12 days", Dec_20_2007, "2007-12-20")
        self._assertDate ("2008-01-01 - 12days", Dec_20_2007, "2007-12-20")
        self._assertDate ("2008-01-01 - 12years", Jan_1_1996, "1996-01-01")
        self._assertDate ("2009-01-01 - 12months", Jan_1_2008, "2008-01-01")
        self._assertDate ("2009-01-31 - 2months", Dec_1_2008, "2008-12-01")
        self._assertDate ("1 jan 2009 - 12  months", Jan_1_2008, "2008-01-01")
        self._assertDate ("  from before about 1700 JU to after 10 vendemiaire XI FR  ",
         (Jan_1_1700_Ju, Oct_2_1802),
         "from ca /1700 (Julian) to 10 vendemiaire XI/")
        self._assertDate ("2008-11-20 - 1 year + 1 month", Dec_20_2007,
         "2007-12-20")

        self._assertDate ("entre 1700 ju et 10 vendemiaire XI",
         (Jan_1_1700_Ju, Oct_2_1802),
         "between 1700 (Julian) and 10 vendemiaire XI")
        self._assertDate ("between 1700 JU et 10 vendemiaire XI",
         (Jan_1_1700_Ju, Oct_2_1802),
         "between 1700 (Julian) and 10 vendemiaire XI")



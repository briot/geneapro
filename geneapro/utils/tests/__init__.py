"""
unittest-based framework for testing units in geneapro.utils
"""

import unittest
import os, os.path
from .. import gedcom, date

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

JAN_1_2008        = 2454467
JAN_1_2008_ELEVEN = 2454466
OCT_22_2008       = 2454762
OCT_11_2008       = 2454751
JAN_1_1400        = 2232408
JAN_1_1583        = 2299239
JAN_1_1581        = 2298143
JAN_1_1581_JU     = 2298153
JAN_1_1583_JU     = 2299249
OCT_2_1802        = 2379501
AUG_28_1803       = 2379831
DEC_20_2007       = 2454455
JAN_1_1996        = 2450084
DEC_1_2008        = 2454802
JAN_1_1700_JU     = 2341983
JAN_15_UNDEFINED  = 260104
MAY_1_UNDEFINED   = 260211

class DateTestCase (unittest.TestCase):
   """tests for date.py"""

   def _assert_date (self, inputdate, day, expected):
      """Ensure that a date was correctly parsed"""
      d = date.DateRange (inputdate)
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
         error = "expected a range for result"
      elif d.date.date != day:
         error = str (d.date.date) + " != " + str (day)

      if expected and str (d) != expected:
         error =  str (d) + "\n  != " + expected

      self.assertFalse (error, "Error for: " + inputdate + "\n     " + error)

   def _assert_roman (self, text, val):
      """Ensure a number was correctly converted to and from roman literal"""
      self.assertEqual (val, date.from_roman_literal (text))
      self.assertEqual (text, date.to_roman_literal (val))

   def test_roman (self):
      """Various tests for roman literal convertion"""
      self._assert_roman ("I", 1)
      self._assert_roman ("II", 2)
      self._assert_roman ("III", 3)
      self._assert_roman ("IV", 4)
      self._assert_roman ("V", 5)
      self._assert_roman ("VI", 6)
      self._assert_roman ("VII", 7)
      self._assert_roman ("VIII", 8)
      self._assert_roman ("IX", 9)
      self._assert_roman ("X", 10)
      self._assert_roman ("XI", 11)
      self._assert_roman ("XIV", 14)
      self._assert_roman ("MCDXLIV", 1444)

   def test_date (self):
      """Various tests for date parsing"""
      self._assert_date ("2008-01-01", JAN_1_2008, "2008-01-01")
      self._assert_date ("2008-01-01 1:01am", JAN_1_2008, "2008-01-01 01:01:00")
      self._assert_date ("2008-01-01 11:01:12", JAN_1_2008, 
                        "2008-01-01 11:01:12")
      self._assert_date ("2008-01-01 00:00:00", JAN_1_2008, 
                        "2008-01-01 00:00:00")
      self._assert_date ("2008-01-01 23:59:59", JAN_1_2008, 
                        "2008-01-01 23:59:59")
      self._assert_date ("20080101?", JAN_1_2008, "2008-01-01 ?")
      self._assert_date ("22/10/2008?", OCT_22_2008, "2008-10-22 ?")
      self._assert_date ("10/22/2008", OCT_22_2008, "2008-10-22")
      self._assert_date ("10/11/2008", OCT_11_2008, "2008-10-11")
      self._assert_date ("1 jan 2008?", JAN_1_2008, "2008-01-01 ?")
      self._assert_date ("01 jan 2008", JAN_1_2008, "2008-01-01")
      self._assert_date ("jan 1, 2008", JAN_1_2008, "2008-01-01")
      self._assert_date ("jan 1 2008", JAN_1_2008, "2008-01-01")
      self._assert_date ("1 january 2008", JAN_1_2008, "2008-01-01")
      self._assert_date ("EST JAN 2008", JAN_1_2008, "2008-01-01 ?")
      self._assert_date ("2008-01-01 est", JAN_1_2008, "2008-01-01 ?")
      self._assert_date ("2008", JAN_1_2008, "2008")
      self._assert_date ("2008 ?  ", JAN_1_2008, "2008 ?")
      self._assert_date ("ca 2008", JAN_1_2008, "ca 2008")
      self._assert_date ("~2008", JAN_1_2008, "ca 2008")
      self._assert_date ("<2008", JAN_1_2008, "/2008")
      self._assert_date (">1 jan 2008", JAN_1_2008, "2008-01-01/")
      self._assert_date ("2008-01", JAN_1_2008, "2008-01")
      self._assert_date ("05-01", MAY_1_UNDEFINED, "????-05-01")
      self._assert_date ("15-01", JAN_15_UNDEFINED, "????-01-15")
      self._assert_date ("01-15", JAN_15_UNDEFINED, "????-01-15")
      self._assert_date ("1400-01-01", JAN_1_1400, "1400-01-01 (Julian)")
      self._assert_date ("1583-01-01", JAN_1_1583, "1583-01-01")
      self._assert_date ("1583-01-01 JU   ", JAN_1_1583_JU,
                        "1583-01-01 (Julian)")
      self._assert_date ("1583-01-01 OS   ", JAN_1_1583_JU, 
                        "1583-01-01 (Julian)")
      self._assert_date ("1583-01-01 (JU)   ", JAN_1_1583_JU, 
                        "1583-01-01 (Julian)")
      self._assert_date ("1583-01-01 GR", JAN_1_1583, "1583-01-01")
      self._assert_date ("1 vendemiaire I F", 2375840, "1 vendemiaire I")
      self._assert_date ("2 vendemiaire I F", 2375841, "2 vendemiaire I")
      self._assert_date ("1 brumaire I F", 2375870, "1 brumaire I")
      self._assert_date ("1 brumaire II F", 2376235, "1 brumaire II")
      self._assert_date ("1 brumaire XI F", 2379522, "1 brumaire XI")
      self._assert_date ("10 vendemiaire XI F", OCT_2_1802, "10 vendemiaire XI")
      self._assert_date ("10 vendemiaire XI", OCT_2_1802, "10 vendemiaire XI")
      self._assert_date ("10 fructidor 11 (French Republican)", 
                        AUG_28_1803, "10 fructidor XI")
      self._assert_date ("10 fructidor 11", AUG_28_1803, "10 fructidor XI")
      self._assert_date ("before 10 fructidor 11 (French Republican)", 
                        AUG_28_1803, "/10 fructidor XI")
      self._assert_date ("2008-01-01 - 12 days", DEC_20_2007, "2007-12-20")
      self._assert_date ("2008-01-01 - 12days", DEC_20_2007, "2007-12-20")
      self._assert_date ("2008-01-01 - 12years", JAN_1_1996, "1996-01-01")
      self._assert_date ("2009-01-01 - 12months", JAN_1_2008, "2008-01-01")
      self._assert_date ("2009-01-31 - 2months", DEC_1_2008, "2008-12-01")
      self._assert_date ("1 jan 2009 - 12  months", JAN_1_2008, "2008-01-01")
      self._assert_date (
        "  from before about 1700 JU to after 10 vendemiaire XI FR  ",
        (JAN_1_1700_JU, OCT_2_1802),
        "from ca /1700 (Julian) to 10 vendemiaire XI/")
      self._assert_date ("2008-11-20 - 1 year + 1 month", DEC_20_2007,
       "2007-12-20")

      self._assert_date ("entre 1700 ju et 10 vendemiaire XI",
       (JAN_1_1700_JU, OCT_2_1802),
       "between 1700 (Julian) and 10 vendemiaire XI")
      self._assert_date ("between 1700 JU et 10 vendemiaire XI",
       (JAN_1_1700_JU, OCT_2_1802),
       "between 1700 (Julian) and 10 vendemiaire XI")
      self._assert_date ("1583-01-01 - 3 years", JAN_1_1581_JU,
                        "1580-01-01 (Julian)")

      self.assertFalse (date.Date ("1896-11-20") < date.Date ("1894-06-20"))
      self.assertTrue (date.Date ("1896-11-20") > date.Date ("1894-06-20"))
      self.assertEqual (cmp (date.Date ("1896-11-20"),
                             date.Date ("1894-06-20")),
                        1)




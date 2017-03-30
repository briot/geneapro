"""
unittest-based framework for testing units in GeneaProve.utils
"""

import unittest
import os
import os.path
from .. import date

JAN_1_2008 = 2454467
JAN_1_2008_ELEVEN = 2454466
OCT_22_2008 = 2454762
OCT_11_2008 = 2454751
JAN_1_1400 = 2232408
JAN_1_1583 = 2299239
JAN_1_1581 = 2298143
JAN_1_1581_JU = 2298153
JAN_1_1583_JU = 2299249
OCT_2_1802 = 2379501
AUG_28_1803 = 2379831
DEC_20_2007 = 2454455
JAN_1_1996 = 2450084
DEC_1_2008 = 2454802
NOV_11_2008 = DEC_1_2008 - 1
JAN_1_1700_JU = 2341983
JAN_15_UNDEFINED = 260104
MAY_1_UNDEFINED = 260211


class DateTestCase (unittest.TestCase):

    """tests for date.py"""

    def _assert_delta(self, expected, fromDate, toDate):
        delta = toDate - fromDate
        self.assertTrue(expected.years == delta.years
                        and expected.months == delta.months
                        and expected.days == delta.days,
                        "Expected '%s', got '%s' for '%s - %s'" %
                        (expected, delta, toDate, fromDate))

    def _assert_date(self, inputdate, day, expected):
        """Ensure that a date was correctly parsed"""
        d = date.DateRange(inputdate)
        error = ""

        def cmp_end(d, exp):
            if isinstance(d, date._Date) or d.ends[1] is None:
                if type(exp) == tuple:
                    return "expected a range, got %s" % d
                elif isinstance(d, date._Date):
                    if d.date != exp:
                        return "%s != %s" % (d.date, exp)
                elif d.ends[0].date != exp:
                    return "%s != %s" % (d.ends[0].date, exp)
            else:
                if type(exp) != tuple:
                    return "expected a simple date, got %s" % d
                return cmp_end(d.ends[0], exp[0]) \
                    or cmp_end(d.ends[1], exp[1])
            return ""

        if not d.ends[0] and not d.ends[1]:
            error = "Could not parse date"
        elif expected and d.display(original=False) != expected:
            error =  "[" + d.display(original=False) \
                + "]\n  != [" + expected + "]"
        elif day is not None:
            error = cmp_end(d, day)

        self.assertFalse(error, "Error for: " + inputdate + "\n     " + error)

    def _assert_roman(self, text, val):
        """Ensure a number was correctly converted to and from roman literal"""
        self.assertEqual(val, date.from_roman_literal(text))
        self.assertEqual(text, date.to_roman_literal(val))

    def test_roman(self):
        """Various tests for roman literal convertion"""
        self._assert_roman("I", 1)
        self._assert_roman("II", 2)
        self._assert_roman("III", 3)
        self._assert_roman("IV", 4)
        self._assert_roman("V", 5)
        self._assert_roman("VI", 6)
        self._assert_roman("VII", 7)
        self._assert_roman("VIII", 8)
        self._assert_roman("IX", 9)
        self._assert_roman("X", 10)
        self._assert_roman("XI", 11)
        self._assert_roman("XIV", 14)
        self._assert_roman("MCDXLIV", 1444)

    def test_date(self):
        """Various tests for date parsing"""
        self._assert_date("2008-01-01", JAN_1_2008, "2008-01-01")
        self._assert_date(
            "2008-01-01 1:01am", JAN_1_2008, "2008-01-01 01:01:00")
        self._assert_date("2008-01-01 11:01:12", JAN_1_2008,
                          "2008-01-01 11:01:12")
        self._assert_date("2008-01-01 00:00:00", JAN_1_2008,
                          "2008-01-01 00:00:00")
        self._assert_date("2008-01-01 23:59:59", JAN_1_2008,
                          "2008-01-01 23:59:59")
        self._assert_date("20080101?", JAN_1_2008, "2008-01-01 ?")
        self._assert_date("22/10/2008?", OCT_22_2008, "2008-10-22 ?")
        self._assert_date("10/22/2008", OCT_22_2008, "2008-10-22")
        self._assert_date("10/11/2008", OCT_11_2008, "2008-10-11")
        self._assert_date("1 jan 2008?", JAN_1_2008, "2008-01-01 ?")
        self._assert_date("01 jan 2008", JAN_1_2008, "2008-01-01")
        self._assert_date("jan 1, 2008", JAN_1_2008, "2008-01-01")
        self._assert_date("jan 1 2008", JAN_1_2008, "2008-01-01")
        self._assert_date("1 january 2008", JAN_1_2008, "2008-01-01")
        self._assert_date("EST JAN 2008", JAN_1_2008, "2008-01-01 ?")
        self._assert_date("2008-01-01 est", JAN_1_2008, "2008-01-01 ?")
        self._assert_date("2008", JAN_1_2008, "2008")
        self._assert_date("2008 ?  ", JAN_1_2008, "2008 ?")
        self._assert_date("ca 2008", JAN_1_2008, "~2008")
        self._assert_date("~2008", JAN_1_2008, "~2008")
        self._assert_date("~2008", JAN_1_2008, "~2008")
        self._assert_date("<2008", JAN_1_2008, "/2008")
        self._assert_date(">1 jan 2008", JAN_1_2008, "2008-01-01/")
        self._assert_date("2008-01", JAN_1_2008, "2008-01")
        self._assert_date("05-01", MAY_1_UNDEFINED, "????-05-01")
        self._assert_date("15-01", JAN_15_UNDEFINED, "????-01-15")
        self._assert_date("01-15", JAN_15_UNDEFINED, "????-01-15")
        self._assert_date("1400-01-01", JAN_1_1400, "1400-01-01 (Julian)")
        self._assert_date("@#DJULIAN@ 1400", JAN_1_1400, "1400 (Julian)")
        self._assert_date("1583-01-01", JAN_1_1583, "1583-01-01")
        self._assert_date("1583-01-01 JU   ", JAN_1_1583_JU,
                          "1583-01-01 (Julian)")
        self._assert_date("1583-01-01 OS   ", JAN_1_1583_JU,
                          "1583-01-01 (Julian)")
        self._assert_date("1583-01-01 (JU)   ", JAN_1_1583_JU,
                          "1583-01-01 (Julian)")
        self._assert_date("1583-01-01 GR", JAN_1_1583, "1583-01-01")
        self._assert_date("1 vendemiaire I F", 2375840, "1 vendemiaire I")
        self._assert_date("2 vendemiaire I F", 2375841, "2 vendemiaire I")
        self._assert_date("1 brumaire I F", 2375870, "1 brumaire I")
        self._assert_date("1 brumaire II F", 2376235, "1 brumaire II")
        self._assert_date("1 brumaire XI F", 2379522, "1 brumaire XI")
        self._assert_date(
            "10 vendemiaire XI F", OCT_2_1802, "10 vendemiaire XI")
        self._assert_date("10 vendemiaire XI", OCT_2_1802, "10 vendemiaire XI")
        self._assert_date("10 fructidor 11 (French Republican)",
                          AUG_28_1803, "10 fructidor XI")
        self._assert_date("10 fructidor 11", AUG_28_1803, "10 fructidor XI")
        self._assert_date("before 10 fructidor 11 (French Republican)",
                          AUG_28_1803, "/10 fructidor XI")
        self._assert_date("2008-01-01 - 12 days", DEC_20_2007, "2007-12-20")
        self._assert_date("2008-01-01 - 12days", DEC_20_2007, "2007-12-20")
        self._assert_date("2008-01-01 - 12years", JAN_1_1996, "1996-01-01")
        self._assert_date("2009-01-01 - 12months", JAN_1_2008, "2008-01-01")
        self._assert_date("2009-01-31 - 2months", NOV_11_2008, "2008-11-30")
        self._assert_date("1 jan 2009 - 12  months", JAN_1_2008, "2008-01-01")
        self._assert_date(
            "  from before about 1700 JU to after 10 vendemiaire XI FR  ",
            (JAN_1_1700_JU, OCT_2_1802),
            "from ~/1700 (Julian) to 10 vendemiaire XI/")
        self._assert_date("2008-11-20 - 1 year + 1 month", DEC_20_2007,
                          "2007-12-20")

        # Partially unknown dates

        self._assert_date("1920-08-??", 2422538, "1920-08-01 ?")

        self._assert_date("entre 1700 ju et 10 vendemiaire XI",
                          (JAN_1_1700_JU, OCT_2_1802),
                          "between 1700 (Julian) and 10 vendemiaire XI")
        self._assert_date("between 1700 JU et 10 vendemiaire XI",
                          (JAN_1_1700_JU, OCT_2_1802),
                          "between 1700 (Julian) and 10 vendemiaire XI")
        self._assert_date("1583-01-01 - 3 years", JAN_1_1581_JU,
                          "1580-01-01 (Julian)")

        self.assertFalse(date.DateRange("1896-11-20")
                         < date.DateRange("1894-06-20"))
        self.assertTrue(date.DateRange("1896-11-20")
                        > date.DateRange("1894-06-20"))
        self.assertTrue(date.DateRange("1896-11-20") > date.DateRange("1894-06-20"))

        # An example from the GEDC manual. A period (an event occurs during
        # an extended period of time) whose start and end are ranges (event
        # happened on a single data somewhere in the range).

        self._assert_date(
            "from bet 21 JUN 1876 and abt 2 MAR 1893 TO BEF SEP 1840",
            ((2406427, 2412525), 2393350),
            "from between 1876-06-21 and ~1893-03-02 to /1840-09-01")

        # Gedcom also says that one end of the periods is optional

        self._assert_date("from 21 JUN 1876", None, "from 1876-06-21")
        self._assert_date("to 1815", None, "to 1815")

    def test_delta(self):
        # Test time delta (+1m means move to the next month, and if the date
        # doesn't exist there move to the last day of that month). Baselines
        # for these tests are from
        #     http://www.timeanddate.com/
        #
        # Difference between 30/04/2010 and 01/03/2011:  10m 1d
        # Difference between 30/04/2003 and 01/03/2004:  10m 1d
        # Difference between 30/04/2003 and 29/02/2004:  9m 30d
        # Difference between 30/04/2003 and 28/02/2004:  9m 29d

        self._assert_date("2010-04-30 +10m1d", None, "2011-03-01")
        self._assert_date("2003-04-30 +10m1d", None, "2004-03-01")
        self._assert_date("2003-04-30 +9m",    None, "2004-01-30")
        self._assert_date("2003-04-30 +9m30d", None, "2004-02-29")
        self._assert_date("2003-04-30 +9m29d", None, "2004-02-28")

        # timeanddate.com says it should be 2010-04-28, but that doesn't match
        # the addition in this case.
        self._assert_date("2011-03-01 -10m1d", None, "2010-04-30")
        self._assert_date("2004-03-01 -10m1d", None, "2003-04-30")
        self._assert_date("2004-02-29 -9m",    None, "2003-05-29")
        self._assert_date("2004-02-29 -9m30d", None, "2003-04-29")
        self._assert_date("2004-02-28 -9m29d", None, "2003-04-29")

        d1 = date.DateRange("2010-04-30") + date.TimeDelta(months=10, days=1)
        d2 = date.DateRange("2011-03-01")
        self.assertEqual(d2, d1, "Invalid date: %s != %s" % (d2, d1))

        d1 = date.DateRange("2010-04-30")
        d2 = date.DateRange("2011-03-01") - date.TimeDelta(months=10, days=1)
        self.assertEqual(d2, d1, "Invalid date: %s != %s" % (d2, d1))

        self._assert_delta(
            date.TimeDelta(months=10, days=1),
            date.DateRange("2010-04-30"),
            date.DateRange("2011-03-01"))
        self._assert_delta(
            date.TimeDelta(months=9, days=30),
            date.DateRange("2003-04-30"),
            date.DateRange("2004-02-29"))

        # Difference as a number of days is much less ambiguous

        self._assert_delta(date.TimeDelta(years=1),
                           date.DateRange("2011-01-01"),
                           date.DateRange("2012-01-01"))
        self._assert_delta(date.TimeDelta(months=11),
                           date.DateRange("2010-04-26"),
                           date.DateRange("2011-03-26"))
        self.assertEqual(305, date.DateRange("2011-03-01").days_since
                         (date.DateRange("2010-04-30")))
        self.assertEqual(0,
                         date.DateRange("2011-03-01").years_since
                         (date.DateRange("2010-04-30")))
        self.assertEqual(1,
                         date.DateRange("2011-05-01").years_since
                         (date.DateRange("2010-04-30")))

        self.assertEqual(
            date.DateRange("1700-01-01").day_of_week(), "Friday")
        self.assertEqual(
            30575, date.DateRange("1783-09-18").days_since(
                date.DateRange("1700-01-01")))
        self.assertEqual(
            date.DateRange("1783-09-18").day_of_week(), "Thursday")
        self.assertEqual(
            date.DateRange("1982-04-24").day_of_week(), "Saturday")
        self.assertEqual(  # leap year
            date.DateRange("2000-01-01").day_of_week(), "Saturday")
        self.assertEqual(  # in the future
            date.DateRange("2054-06-19").day_of_week(), "Friday")

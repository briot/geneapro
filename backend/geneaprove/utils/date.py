"""
This module provides handling of dates and times.
These can be specified in multiple calendars (Gregorian, Julian, ...), and
be only partial (any of the information can be missing).

Such dates will in general be displayed for the user exactly as he entered
them, but the software needs to be able to parse them so that it can sort
events, generate timelines, or generate shorter version of the date for
display in diagrams.

??? Translation is not correctly handled in this package. Output is always
    done in english currently
??? Output format should be configurable more easily. We currently only
    use one global variable for this
??? Would be nice to have support for other calendars
"""

try:
    # Check that we can correctly import and use the translation module.
    # If not, we still want to use this module standalone
    from django.utils.translation import ugettext as _
    _("foo")
except ImportError:
    def _(txt):
        return txt

import datetime
import re
import time

__all__ = ["from_roman_literal", "to_roman_literal", "DateRange",
           "Calendar", "CalendarGregorian", "CalendarFrench",
           "CalendarJulian"]

# The following strings indicate how to specify date ranges in your language.
# These are regexp, and should not include parenthesis groups

RE_FROM = _("from|de")          # for span ranges: "from"
RE_TO = _("to|a")             # for span ranges: "to"
RE_BETWEEN = _("bet|between|entre")    # for between ranges: "between"
RE_AND = _("and|et")           # for between ranges: "and"
RE_DAYS = _("d|days?|jours?")   # When adding delta
RE_MONTHS = _("m|months?|mois?")  # When adding delta
RE_YEARS = _("y|years?|ans?")    # When adding delta
RE_BEFORE = _("before|bef|avant")
RE_AFTER = _("after|aft|apres")
RE_ABOUT = _("about|abt\\.?|circa|ca|environ|env")
RE_EST = _(r"estimated|est\.?|cal")  # "cal" is used for "calculated" in gramps
DEFAULT_DDMM_FORMAT = _("mm/dd/yyyy")  # or "mm/dd/yyy" depending on locale

# Month names should be all lower cases
MONTH_NAMES = {_("jan"): 1,
               _("january"): 1,
               _("feb"): 2,
               _("februrary"): 2,
               _("mar"): 3,
               _("march"): 3,
               _("apr"): 4,
               _("april"): 4,
               _("may"): 5,
               _("jun"): 6,
               _("june"): 6,
               _("jul"): 7,
               _("july"): 7,
               _("aug"): 8,
               _("august"): 8,
               _("sep"): 9,
               _("september"): 9,
               _("oct"): 10,
               _("october"): 10,
               _("nov"): 11,
               _("november"): 11,
               _("dec"): 12,
               _("december"): 12}

WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday",
            "Thursday", "Friday", "Saturday"]

FRENCH_MONTHS = [
    ("vendemiaire", "vend"),
    ("brumaire", "brum"),
    ("frimaire", "frim"),
    ("nivose", "nivo"),
    ("pluviose", "pluv"),
    ("ventose", "vent"),
    ("germinal", "germ"),
    ("floreal", "flor"),
    ("prairial", "prai"),
    ("messidor", "mess"),
    ("thermidor", "ther"),
    ("fructidor", "fruc"),
    ("",)]

# No translation below

IGNORECASE = re.IGNORECASE    # pylint: disable=no-member

FROM_TEXT = "(" + RE_FROM + r")\s+(.+)"
FROM_RE = re.compile(r"^\s*" + FROM_TEXT, IGNORECASE)

TO_TEXT = "(" + RE_TO + r")\s+(.+)"
TO_RE = re.compile(r"^\s*" + TO_TEXT, IGNORECASE)

PERIOD_RE = re.compile(
    "^" + FROM_TEXT + r"\s+" + TO_TEXT + r"\s*$", IGNORECASE)
BETWEEN_RE = re.compile(r"^\s*(" + RE_BETWEEN + r")\s+(.+)\s+(" +
                        RE_AND + r")\s+(.*)\s*$", IGNORECASE)
TIME_RE = re.compile(r"\s*(\d?\d):(\d?\d)(:(\d?\d))?(am|pm)?")

DELTA_YEARS = r"(\d+)\s*(?:" + RE_YEARS + ")"
DELTA_MONTHS = r"(\d+)\s*(?:" + RE_MONTHS + ")"
DELTA_DAYS = r"(\d+)\s*(?:" + RE_DAYS + ")"
DELTA_RE = ("(?:" + DELTA_YEARS + ")?" +
            r"\s*(?:" + DELTA_MONTHS + ")?" +
            r"\s*(?:" + DELTA_DAYS + ")?")
ADD_RE = re.compile(r"\s*([-+])?\s*" + DELTA_RE + r"\s*$", IGNORECASE)
# Recognizes a delta:  $1=>sign $2=>years  $3=>months,  $4=>days

YEAR_RE = r"(\d{1,4}|(?:an\s+)?[MDCXVI]+)"

OPTDAY = r"(\d\d?|\?+)"  # day (one or two digits), or any number of "?"

YYYYMMDD_RE = re.compile(
    r"^\s*" + YEAR_RE + "[-/]" + OPTDAY + "[-/]" + OPTDAY + "$", IGNORECASE)
ISO_RE = re.compile(r"^\s*" + YEAR_RE + r"(\d{2})(\d{2})$", IGNORECASE)
DDMMYYYY_RE = re.compile(r"^\s*(\d\d)[/-](\d\d)[/-]" + YEAR_RE + "$",
                         IGNORECASE)
SPELLED_OUT_RE = re.compile(
    r"^\s*(?:(\d\d?)\s+)?([a-z]+),?\s*" + YEAR_RE + "$",
    IGNORECASE)
SPELLED_OUT2_RE = re.compile(
    r"^\s*(\w+)\s+(\d\d?),?\s*" + YEAR_RE + "$",
    IGNORECASE)
YYYYMM_RE = re.compile(r"^\s*" + YEAR_RE + r"([-/](\d\d?))?$", IGNORECASE)
DDMM_RE = re.compile(r"^\s*(\d{2})[-/](\d{2})$")

BEFORE_RE = re.compile("(<|" + RE_BEFORE + r"|[^\d]/(\\d))", IGNORECASE)
AFTER_RE = re.compile("(>|" + RE_AFTER + r"|(\\d)/[^\d])", IGNORECASE)
ABOUT_RE = re.compile(r"^\s*(\b(?:" + RE_ABOUT + r")|~)\s*", IGNORECASE)
EST_RE = re.compile(r"\s*((?:" + RE_EST + r")\s*|\?\s*$)", IGNORECASE)

SPAN_FROM = 1
SPAN_BETWEEN = 2

DATE_BEFORE = 1
DATE_ON = 2
DATE_AFTER = 3

PRECISION_ABOUT = 1
PRECISION_ESTIMATED = 2
PRECISION_EXACT = 3

ROMAN_LITERALS = dict(I=1, V=5, X=10, L=50, C=100, D=500, M=1000)


def from_roman_literal(text):
    """Convert a roman literal into an int"""

    total = 0
    subtotal = 0
    prev_char = 0

    for p in text:
        if p == prev_char:
            subtotal = subtotal + ROMAN_LITERALS[p]
        elif prev_char and ROMAN_LITERALS[prev_char] < ROMAN_LITERALS[p]:
            total = total + ROMAN_LITERALS[p] - subtotal
            subtotal = 0
            prev_char = 0
        else:
            total = total + subtotal
            subtotal = ROMAN_LITERALS[p]
            prev_char = p

    return total + subtotal


def to_roman_literal(val):
    """Convert an int to its roman literal representation"""

    def proc(digit, ten, five, unit):
        """Convert a single digit to its roman literal representation"""
        if digit == 0:
            return ""
        elif digit < 4:
            return unit * digit
        elif digit == 4:
            return unit + five
        elif digit < 9:
            return five + unit * (digit - 5)
        else:
            return unit + ten

    return proc(val // 1000, ten="MMMMMMMMMM", five="MMMMM", unit="M") \
        + proc((val % 1000) // 100, ten="M", five="D", unit="C") \
        + proc((val % 100) // 10, ten="C", five="L", unit="X") \
        + proc(val % 10, ten="X", five="V", unit="I")


def __get_year(text):
    """Convert a year string (possibly in roman literals) into an int"""
    if text.isdigit():
        return int(text)
    else:
        # In the french calendar, the date is often spelled with
        #  "25 fructidor an X", where "an" means "year"
        text = re.sub(r"an\s*", "", text)
        return from_roman_literal(text)


def as_int(d):
    """Converts d to an integer, or returns the empty string if not
       an integer
    """
    try:
        return int(d)
    except ValueError:
        return 0


def get_ymd(txt, months):
    """Extracts year, month and day from txt. Returns a tuple with
       (year, month, day, year_specified, month_specified, day_specified)
       The last three fields indicate whether the field was specified or
       txt or whether a default value was used.
       _months_ is a dict of month names for the current calendar. It can
       contain an entry matching the empty string which is used as the default
       when the month is not found.
    """

    m = YYYYMMDD_RE.search(txt) or ISO_RE.search(txt)
    if m:
        day_known = m.group(3) and m.group(3)[0].isdigit()
        return (__get_year(m.group(1)),
                as_int(m.group(2)),
                as_int(m.group(3)),
                True, True, day_known)

    m = DDMMYYYY_RE.search(txt)
    if m:
        if DEFAULT_DDMM_FORMAT == "dd/mm/yyyy":
            month = int(m.group(2))
            day = int(m.group(1))
        else:
            month = int(m.group(1))
            day = int(m.group(2))

        if month > 12:
            month, day = day, month

        return (__get_year(m.group(3)), month, day, True, True, True)

    m = SPELLED_OUT_RE.search(txt)
    if m:
        year_known = True
        month_known = True
        day_known = True

        try:
            month = months[m.group(2).lower()]
        except KeyError:
            month = 1
            month_known = False

        try:
            day = int(m.group(1))
        except TypeError:
            day = 1
            day_known = False

        try:
            year = __get_year(m.group(3))
        except KeyError:
            year = -4000
            year_known = False

        return (year, month, day, year_known, month_known, day_known)

    m = SPELLED_OUT2_RE.search(txt)
    if m:
        try:
            month = months[m.group(1).lower()]
        except KeyError:
            month = months.get("")
        if month:
            return (__get_year(m.group(3)), month, int(m.group(2)),
                    True, True, True)

    m = DDMM_RE.search(txt)
    if m:
        if DEFAULT_DDMM_FORMAT == "dd/mm/yyyy":
            month = int(m.group(2))
            day = int(m.group(1))
        else:
            month = int(m.group(1))
            day = int(m.group(2))

        if month > 12:
            month, day = day, month
        return (-4000, month, day, False, True, True)

    m = YYYYMM_RE.search(txt)
    if m:
        if m.group(3):
            return (__get_year(m.group(1)), int(m.group(3)), 1,
                    True, True, False)
        else:
            return (__get_year(m.group(1)), 1, 1, True, False, False)

    return (-4000, 1, 1, False, False, False)

########################
# Calendar
########################


class Calendar(object):

    """Abstract base class for all types of calendars we support"""

    def __init__(self, suffixes):
        self.__re = re.compile(
            '\\s*\\(?(' + suffixes + ')\\)?\\s*', IGNORECASE)
        self._month_names = MONTH_NAMES

    def is_a(self, text):
        """If str is expressed in the calendar, returns the string that remains
           after removing the calendar indication. Return None if the date does
           not match the calendar
           Default implementation is to check for a suffix that matches that of
           the calendar. However, calendar implementations are encouraged to
           check month names or other recognizable characteristics"""

        m = self.__re.search(text)
        if m:
            return text[:m.start(0)] + text[m.end(0):]
        return None

    def __str__(self):
        """Convert to a string"""
        return ""

    def parse(self, txt):
        """Parse a simple date expressed in this calendar. str contains
           information about day, month and year only, although some of this
           info might be missing. Classes are encouraged to support as many
           formats as possible for completeness.
           None should be returned if the date could not be parsed.
           This returns a tuple containing
           (julian_day_number, year_specified, month_specified, day_specified,
            calendar)
        """
        year, month, day, yk, mk, dk = get_ymd(txt, self._month_names)
        if not yk:
            year = None

        if not dk:
            day = None

        if not mk:
            month = None

        return self.from_components(year, month, day)

    def from_components(self, year=None, month=None, day=None):
        """Given an expanded (possibly partial) date, return the same result
           as parse.
           This returns a tuple containing
           (julian_day_number, year_specified, month_specified, day_specified,
            calendar)
        """
        raise NotImplementedError

    def components(self, julian_day):
        """Return a tuple (year, month, day) for the given day"""
        raise NotImplementedError

    def date_unicode(self, julian_day, year_known=True,
                     month_known=True, day_known=True, year_only=False):
        """Return a string representing the julian day in the self calendar.
           If year_only is true, only the year is returned"""
        (year, month, day) = self.components(julian_day)

        if year_only:
            if year_known:
                return "%(year)d" % {"year": year}
            else:
                return ""

        if year_known:
            if month_known and not day_known:
                formt = "%(year)d-%(month)02d"
            elif month_known and day_known:
                formt = "%(year)d-%(month)02d-%(day)02d"
            elif day_known:
                formt = "%(year)d-??-%(day)02d"
            else:
                formt = "%(year)d"
        else:
            formt = "????-%(month)02d-%(day)02d"

        return formt % {"year": year, "month": month, "day": day}


class CalendarGregorian(Calendar):

    """The gregorian calendar, first created in 1582 but adopted sometimes
       much later in some countries
    """

    def __init__(self):
        Calendar.__init__(self, "\\b(GR|G|Gregorian)\\b")

    def from_components(self, year=None, month=None, day=None):
        """See inherited documentation"""
        y = year or -4000
        m = month or 1
        d = day or 1

        # If date is before the invention of gregorian calendar, assume we have
        # a julian date

        if year and (y, m, d) < (1582, 2, 24):
            return CalendarJulian().from_components(year, month, day)

        else:
            # Julian day for Feb 29th, -4800 in gregorian cal.
            feb_29_4800 = 32045
            a = (14 - m) // 12
            y2 = y + 4800 - a
            m2 = m + 12 * a - 3
            d += (153 * m2 + 2) // 5 + 365 * y2 + y2 // 4 - y2 // 100 + \
                y2 // 400 - feb_29_4800
            return (d, year is not None, month is not None,
                    day is not None, self)

    @staticmethod
    def today():
        """Return today's date"""
        t = time.localtime()
        return CalendarGregorian().from_components(
            t.tm_year, t.tm_mon, t.tm_mday)

    def components(self, julian_day):
        """See inherited documentation"""
        # Algorithm from wikipedia "julian day"
        days_per_four_years = 1461  # julian days per four year period
        j = julian_day + 32044
        g = j // 146097
        dg = j % 146097
        c = (dg // 36524 + 1) * 3 // 4
        dc = dg - c * 36524
        b = dc // days_per_four_years
        db = dc % days_per_four_years
        a = (db // 365 + 1) * 3 // 4
        da = db - a * 365
        y = g * 400 + c * 100 + b * 4 + a
        m = (da * 5 + 308) // 153 - 2
        d = da - (m + 4) * 153 // 5 + 122

        return (y - 4800 + (m + 2) // 12, (m + 2) % 12 + 1, d + 1)


class CalendarFrench(Calendar):

    """The french revolutionary calendar, which was only used during a few
       years during the french revolution.
    """

    def __init__(self):
        # The @#DFRENCH R@ notation comes from gramps
        Calendar.__init__(self, "\\b(F|FR|French Republican)\\b|@#DFRENCH R@")
        self._month_names = dict()
        for index, f in enumerate(FRENCH_MONTHS):
            for m in f:
                self._month_names[m] = index + 1

        self.__months_re = re.compile(
            "|".join([k for k in self._month_names.keys() if k != ""]),
            IGNORECASE)

    def __str__(self):
        # Do not return the name of the calendar when we spell out the month
        # name in date_str(), since there is no ambiguity in this case
        # return "French Republican"
        return ""

    def is_a(self, text):
        """See inherited documentation"""
        result = Calendar.is_a(self, text)
        if result:
            return result

        m = self.__months_re.search(text)
        if m:
            return text

        return None

    def from_components(self, year=None, month=None, day=None):
        """See inherited documentation"""
        if year and year >= 1:
            y = year or -4000
            m = month or 1
            d = day or 1
            sep_21_1792 = 2375839
            return (sep_21_1792 + (y - 1) * 365 + y // 4 + m * 30 - 30 + d,
                    year is not None, month is not None, day is not None, self)
        else:
            return (0, False, False, False, self)

    def components(self, julian_day):
        """See inherited documentation"""
        # From http://www.scottlee.net
        days_per_four_years = 1461  # julian days per four year period
        epoch = 2375474
        days_per_month = 30
        tmp = (julian_day - epoch) * 4 - 1
        y = tmp // days_per_four_years
        day_of_year = (tmp % days_per_four_years) // 4
        m = day_of_year // days_per_month + 1
        d = day_of_year % days_per_month + 1

        return (y, m, d)

    def date_unicode(self, julian_day, year_known=True, month_known=True,
                     day_known=True, year_only=False):
        """See inherited documentation"""
        (y, m, d) = self.components(julian_day)
        output = ""

        if year_only:
            return to_roman_literal(y)

        if day_known:
            output = str(d) + " "

        if month_known:
            if m == 13:
                output = output + _("jours feries ")
            else:
                output = output + FRENCH_MONTHS[m - 1][0] + " "

        if year_known:
            output = output + to_roman_literal(y)

        return output


class CalendarJulian(Calendar):

    """The julian calendar (in use before the gregorian calendar)"""

    def __init__(self):
        # OS stands for "Old style"
        Calendar.__init__(self, "\\b(JU|J|Julian|OS)\\b|@#DJULIAN@")
        self._month_names = MONTH_NAMES

    def __str__(self):
        return u"Julian"

    def from_components(self, year=None, month=None, day=None):
        """See inherited doc"""
        # Conversion formulat from Wikipedia "Julian Day"
        y = year or -4000
        m = month or 1
        d = day or 1

        feb_29_4800 = 32083  # Julian day number for Feb 29th, -4800
        a = (14 - m) // 12
        y2 = y + 4800 - a
        m2 = m + 12 * a - 3
        return ((d + (153 * m2 + 2) // 5 + 365 * y2 + y2 // 4) - feb_29_4800,
                year is not None, month is not None, day is not None, self)

    def components(self, julian_day):
        """See inherited doc"""
        days_per_four_years = 1461  # julian days per four year period
        j = julian_day + 32083
        b = j // days_per_four_years
        db = j % days_per_four_years
        a = (db // 365 + 1) * 3 // 4
        da = db - a * 365
        y = b * 4 + a
        m = (da * 5 + 308) // 153 - 2
        return (y - 4800 + (m + 2) // 12, (m + 2) % 12 + 1,
                da - (m + 4) * 153 // 5 + 122)


# The list of predefined calendars
KNOWN_CALENDARS = [CalendarJulian(), CalendarFrench(), CalendarGregorian()]

#####################
# Time Delta
#####################


class TimeDelta(object):

    """A difference between two dates.
       You can add a number of years or months to a date. This directly
       adds on the components of the dates (which are then normalized).
       However, when you do a difference between two days, it is always
       returned as a number of days to keep precision (since a year does
       not have a fixed duration).
    """

    def __init__(self, years=0, months=0, days=0, weeks=0):
        self.days = days + weeks * 7
        self.months = months
        self.years = years

    def __str__(self):
        result = []
        if self.years != 0:
            result.append("%dy" % self.years)
        if self.months != 0:
            result.append("%dm" % self.months)
        if self.days != 0:
            result.append("%dd" % self.days)
        return " ".join(result)

    def __neg__(self):
        return TimeDelta(
            years=-self.years, months=-self.months, days=-self.days)

    def parse(self, txt):
        """Parse a text description of the delta. This extracts the relevant
           information from TXT, and returns the original TXT minus this
           info.
        """

        self.days = 0
        self.months = 0
        self.years = 0
        mult = 1

        while True:
            match = ADD_RE.search(txt)
            if not match or len(match.group(0).strip()) == 0:
                break

            if match.group(1) == "-":
                mult = -1
            else:
                mult = 1

            if match.group(2):
                self.years += mult * int(match.group(2))
            if match.group(3):
                self.months += mult * int(match.group(3))
            if match.group(4):
                self.days += mult * int(match.group(4))

            txt = txt[:match.start(0)] + txt[match.end(0):]

        return txt


#####################
# _Date
#####################

class _Date(object):

    """Internal representation for a specific point in time (not a range of
       dates).
       The date might be imprecise ("about 1700") or incomplete ("1802-02",
       no day).
       This class is for internal use. Users should use the Date class, which
       can be used to represent either a date or a range of dates, and provides
       the operations on such dates.
    """

    def __init__(self, text="", calendar=None):
        """Unless specified, the calendar will be auto-detected."""
        self.text = text.strip() or ""
        self.calendar = calendar
        self.type = DATE_ON
        self.precision = PRECISION_EXACT
        self.seconds = None
        self.date = None
        self.month_known = False
        self.year_known = False
        self.day_known = False
        if text:
            self.__parse()

    def __parse(self):
        """Parse self.text into a meaningful date"""
        txt = self.text

        for cal in KNOWN_CALENDARS:
            remain = cal.is_a(self.text)
            if remain:
                self.calendar = cal
                txt = remain
                break

        if not self.calendar:
            self.calendar = CalendarGregorian()

        self.type = DATE_ON
        match = BEFORE_RE.search(txt)
        if match:
            self.type = DATE_BEFORE
            txt = (match.group(2) or "") + txt[match.end(1):]
        else:
            match = AFTER_RE.search(txt)
            if match:
                self.type = DATE_AFTER
                txt = (match.group(2) or "") + txt[match.end(1):]

        self.precision = PRECISION_EXACT
        match = ABOUT_RE.search(txt)
        if match:
            self.precision = PRECISION_ABOUT
            txt = txt[:match.start(0)] + txt[match.end(0):]
        else:
            match = EST_RE.search(txt)
            if match:
                self.precision = PRECISION_ESTIMATED
                txt = txt[:match.start(0)] + txt[match.end(0):]

        # Do we have a time indicated ?
        match = TIME_RE.search(txt)
        if match:
            if match.group(4):
                secs = int(match.group(4))
            else:
                secs = 0

            if match.group(5) == "pm":
                hour = int(match.group(1)) + 12
            else:
                hour = int(match.group(1))

            self.seconds = datetime.time(hour=hour,
                                         minute=int(match.group(2)),
                                         second=secs)
            txt = txt[:match.start(0)]
        else:
            self.seconds = None

        delta = TimeDelta()
        txt = delta.parse(txt)

        txt = txt.strip()
        day = self.calendar.parse(txt)

        if day:
            (self.date, self.year_known, self.month_known, self.day_known,
             self.calendar) = day
        else:
            self.date = None

        if delta.years or delta.months or delta.days:
            r = self + delta
            self.date = r.date
            self.calendar = r.calendar

    def __repr__(self):
        return self.__str__()

    def __str__(self):
        """Display the date, using either the parsed date, or if it could not be
           parsed the date as was entered by the user. The calendar used is the
           one parsed from the initial string"""
        return self.display(calendar=None)

    def sort_date(self):
        """Return a single date that can be used when sorting Dates"""
        if self.year_known:
            return CalendarGregorian().date_unicode(self.date)
        else:
            return None  # Can't do any sorting

    def year(self, calendar=None):
        """Return the year component of self, in the associated calendar"""
        cal = calendar or self.calendar
        return cal.components(self.date)[0]

    def __eq__(self, date):
        return self.date == date.date

    @staticmethod
    def today():
        """Return today's date"""
        date = CalendarGregorian().today()
        result = _Date("")
        (result.date, result.year_known, result.month_known, result.day_known,
         result.calendar) = date
        return result

    def display(self, calendar=None, year_only=False, original=False):
        """Return a string representing string. By default, this uses the
           calendar parsed when the date was created, but it is possible to
           force the display in other date formats.
           If the date could not be parsed, it is returned exactly as written
           by the user.
           If ORIGINAL is true, the date is output exactly as the user entered
           it.
        """

        if original and self.text:
            return str(self.text)

        else:
            cal = calendar or self.calendar
            result = u""

            if self.precision == PRECISION_ABOUT:
                result += "~"

            if self.type == DATE_BEFORE:
                result += "/"

            result = result + cal.date_unicode(
                self.date, self.year_known, self.month_known, self.day_known,
                year_only=year_only)

            if not year_only and self.seconds is not None:
                result += " " + str(self.seconds)

            if self.type == DATE_AFTER:
                result += "/"

            if self.precision == PRECISION_ESTIMATED:
                result += " ?"

            cal = str(cal)
            if cal:
                result += " (" + cal + ")"

            return result

    def __add__(self, delta):
        """Add a delta to a date"""
        result = _Date()

        (y, m, d) = self.calendar.components(self.date)

        if self.year_known:
            y += delta.years
        if self.month_known and delta.months:
            m += delta.months
            julian = self.calendar.from_components(y, m, d)[0]
            (_, m2, d2) = self.calendar.components(julian)

            if m2 != (m - 1) % 12 + 1:
                if delta.months > 0:
                    # Ended up on the next month, so back up a number of days
                    d -= d2
                else:
                    # Ended up on the previous month, so add a few days
                    # For instance,  2011-05-31 - 1m =>  2011-04-31, which
                    # doesn't exist, so we want to use 2011-04-30 (we really
                    # want the last day of the month though, which is a bit
                    # more difficult for february)
                    d -= 1

        r = self.calendar.from_components(y, m, d)
        if self.day_known and delta.days:
            r = (r[0] + delta.days,) + r[1:]

        result.date, result.year_known, result.month_known, \
            result.day_known, result.calendar = r
        result.type = self.type
        result.text = ""
        result.precision = self.precision
        return result

    def __sub__(self, date):
        """Return a year-month-day difference between two dates.
           The result is meant to be human readable, and matches the
           computation done when entering dates. But it is less precise
           than the number of days, as returned by days_since().
        """

        if isinstance(date, TimeDelta):
            return self + (-date)

        else:
            (y1, m1, d1) = self.calendar.components(self.date)
            (y2, m2, d2) = self.calendar.components(date.date)

            m = (y1 - y2) * 12 + m1 - m2  # Total months difference
            if d1 != d2:
                m -= 1
            years = m // 12
            months = m % 12

            d = date + TimeDelta(years=years, months=months)
            days = self.date - d.date

            return TimeDelta(years=years, months=months, days=days)

    def day_of_week(self):
        """Return the day of week (as a string) for self.
           This returns an empty string if the date is not fully known
        """
        # See http://en.wikipedia.org/wiki/Calculating_the_day_of_the_week
        # We know that Jan 1st, 1700 was a Friday

        if self.year_known \
           and self.month_known \
           and self.day_known:

            JAN_01_1700 = 2341973  # Julian day

            return WEEKDAYS[(self.date - JAN_01_1700 + 5) % 7]

        return ""


##################
# DateRange
##################

class DateRange(object):
    """
    This class represents a date or a range of date, as read from the
    user. Such dates might be incomplete or unprecise. The text entered
    by the user is meant to be kept forever, this class provides an
    interpretation of the text more suitable for machin use
    """

    def __init__(self, text):
        """
        Represents a potentially partial and potentially unprecise date
        or date range, in a specific calendar. calendar should be an instance
        of a derived class of Calendar. If unspecified, the Date class
        will attempt to autodetect it.
        """

        text = self._text = text.strip()  # Date as the user entered it

        groups = PERIOD_RE.search(text)
        if groups:
            # First date could be "between A and B"
            e1 = DateRange(groups.group(2))
            if e1._to is None:
                e1 = e1._from

            e2 = DateRange(groups.group(4))
            if e2._to is None:
                e2 = e2._from

            self._from = e1
            self._to = e2
            self._span = SPAN_FROM
            return

        groups = FROM_RE.search(text)
        if groups:
            e1 = DateRange(groups.group(2))
            if e1._to is None:
                e1 = e1._from

            self._from = e1
            self._to = None
            self._span = SPAN_FROM
            return

        groups = TO_RE.search(text)
        if groups:
            e1 = DateRange(groups.group(2))
            if e1._to is None:
                e1 = e1._from

            self._from = None
            self._to = e1
            self._span = SPAN_FROM
            return

        groups = BETWEEN_RE.search(text)
        if groups:
            self._from = _Date(groups.group(2))
            self._to = _Date(groups.group(4))
            self._span = SPAN_BETWEEN
            return

        self._from = _Date(text)
        self._to = None
        self._span = -1

    @staticmethod
    def today():
        """Return today's date"""
        today = _Date.today()
        result = DateRange.__new__(DateRange)
        result._text = str(today)
        result._from = today
        result._to = None
        result._span = -1
        return result

    def sort_date(self):
        """Return a single date that can be used when sorting DateRanges.
           For a range of dates, we have chosen (randomly) to return the
           first date in the range."""
        if self._from:
            return self._from.sort_date()
        else:
            return None

    def __sub__(self, date):
        """Return a TimeDelta between the two dates"""
        # ??? Should return a minimum and maximum difference, in the case of
        # ranges.

        if isinstance(date, TimeDelta):
            d1 = self._from - date
            if self._to:
                d2 = self._to - date
            else:
                d2 = None

            result = DateRange.__new__(DateRange)
            result._text = "%s - %s" % (self, date)
            result._from = d1
            result._to = d2
            result._span = -1
            return result

        else:
            assert isinstance(date, DateRange)
            if self._from is None or date._from is None:
                return None
            return self._from - date._from

    def __add__(self, delta):
        """Add a delta to a date range"""
        assert isinstance(delta, TimeDelta)
        d1 = self._from + delta
        if self._to:
            d2 = self._to + delta
        else:
            d2 = None

        result = DateRange.__new__(DateRange)
        result._text = "%s + %s" % (self, delta)
        result._from = d1
        result._to = d2
        result._span = -1
        return result

    def year(self, calendar=None):
        """Return the year to be used for the range, when sorting"""
        if self._from and self._from.year_known:
            return self._from.year(calendar)
        else:
            return None

    def __eq__(self, date):
        return self._from == date._from and self._to == date._to

    def __lt__(self, date):
        """Compare two DateRange"""
        return date is not None and self._from.date < date._from.date

    def __gt__(self, date):
        """Compare two DateRange"""
        return date is not None and self._from.date > date._from.date

    def __str__(self):
        """Convert to a string"""
        return self.display()

    def display(self, calendar=None, year_only=False, original=False):
        """
        Convert to a string
        :param bool year_only: only display the date.
        """

        if original and self._text:
            return str(self._text)

        if self._from is None:
            d2 = self._to.display(
                calendar=calendar, year_only=year_only, original=original)
            if self._to is not None:
                return u"to %s" % d2
            else:
                return str(self._text)
        else:
            d1 = self._from.display(
                calendar=calendar, year_only=year_only, original=original)

            if self._to is not None:
                d2 = self._to.display(
                    calendar=calendar, year_only=year_only, original=original)

                if self._span == SPAN_FROM:
                    return u"from %s to %s" % (d1, d2)
                else:
                    return u"between %s and %s" % (d1, d2)
            else:
                if self._span == SPAN_FROM:
                    return u"from %s" % d1
                else:
                    return d1

    def days_since(self, date):
        """"Return the number of days between two dates"""
        return self._from.date - date._from.date

    def years_since(self, date):
        """Return the number of years between two DateRange.
           Only full years are counted
        """
        if self._from is not None \
                and self._from.year_known \
                and date._from is not None \
                and date._from.year_known:
            return (self._from - date._from).years
        else:
            return None

    def day_of_week(self):
        """Return the day of week for the start date"""
        return self._from.day_of_week()


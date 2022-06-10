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
    def _(txt: str) -> str:    # type: ignore
        return txt

import enum
import datetime
import functools
import re
import time
from typing import Any, Tuple, Dict, Optional, Union, overload

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
    ("",),
]

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


class Span(enum.IntEnum):
    NONE = -1
    FROM = 1
    BETWEEN = 2


class When(enum.IntEnum):
    BEFORE = 1
    ON = 2
    AFTER = 3


class Precision(enum.IntEnum):
    ABOUT = 1
    ESTIMATED = 2
    EXACT = 3


ROMAN_LITERALS = dict(I=1, V=5, X=10, L=50, C=100, D=500, M=1000)


def from_roman_literal(text: str) -> int:
    """Convert a roman literal into an int"""

    total = 0
    subtotal = 0
    prev_char: Optional[str] = None

    for p in text:
        if p == prev_char:
            subtotal += ROMAN_LITERALS[p]
        elif (
                prev_char is not None
                and ROMAN_LITERALS[prev_char] < ROMAN_LITERALS[p]
             ):
            total += ROMAN_LITERALS[p] - subtotal
            subtotal = 0
            prev_char = None
        else:
            total += subtotal
            subtotal = ROMAN_LITERALS[p]
            prev_char = p

    return total + subtotal


def to_roman_literal(val: int) -> str:
    """Convert an int to its roman literal representation"""

    def proc(digit: int, ten: str, five: str, unit: str) -> str:
        """Convert a single digit to its roman literal representation"""
        if digit == 0:
            return ""
        if digit < 4:
            return unit * digit
        if digit == 4:
            return unit + five
        if digit < 9:
            return five + unit * (digit - 5)
        return unit + ten

    return proc(val // 1000, ten="MMMMMMMMMM", five="MMMMM", unit="M") \
        + proc((val % 1000) // 100, ten="M", five="D", unit="C") \
        + proc((val % 100) // 10, ten="C", five="L", unit="X") \
        + proc(val % 10, ten="X", five="V", unit="I")


def __get_year(text: str) -> int:
    """Convert a year string (possibly in roman literals) into an int"""
    if text.isdigit():
        return int(text)
    else:
        # In the french calendar, the date is often spelled with
        #  "25 fructidor an X", where "an" means "year"
        text = re.sub(r"an\s*", "", text)
        return from_roman_literal(text)


def as_int(d: Any) -> int:
    """Converts d to an integer, or returns the empty string if not
       an integer
    """
    try:
        return int(d)
    except ValueError:
        return 0


def get_ymd(
        txt: str,
        months: Dict[str, int],
        ) -> Tuple[int, int, int, bool, bool, bool]:
    """
    Extracts year, month and day from txt. Returns a tuple with
    (year, month, day, year_specified, month_specified, day_specified)
    The last three fields indicate whether the field was specified or
    txt or whether a default value was used.
    `months` is a dict of month names for the current calendar. It can
    contain an entry matching the empty string which is used as the default
    when the month is not found.
    """

    def parse_year(s: str) -> Tuple[int, bool]:
        try:
            return __get_year(s), True
        except Exception:
            return -4000, False

    def parse_month(s: str) -> Tuple[int, bool]:
        try:
            return months[s.lower()], True
        except KeyError:
            return 1, False

    def parse_int(s: str) -> Tuple[int, bool]:
        try:
            return int(s), True
        except TypeError:
            return 1, False

    m = YYYYMMDD_RE.search(txt) or ISO_RE.search(txt)
    if m:
        day_known = m.group(3)[0].isdigit() if m.group(3) else False
        year, year_known = parse_year(m.group(1))
        month, month_known = parse_int(m.group(2))
        return (year,       month,       as_int(m.group(3)),
                year_known, month_known, day_known)

    m = DDMMYYYY_RE.search(txt)
    if m:
        if DEFAULT_DDMM_FORMAT == "dd/mm/yyyy":
            month, month_known = parse_int(m.group(2))
            day, day_known = parse_int(m.group(1))
        else:
            month, month_known = parse_int(m.group(1))
            day, day_known = parse_int(m.group(2))

        if month > 12:
            month, day = day, month
            month_known, day_known = day_known, month_known

        year, year_known = parse_year(m.group(3))
        return (year, month, day, year_known, month_known, day_known)

    m = SPELLED_OUT_RE.search(txt)
    if m:
        day, day_known = parse_int(m.group(1))
        month, month_known = parse_month(m.group(2))
        year, year_known = parse_year(m.group(3))
        return (year, month, day, year_known, month_known, day_known)

    m = SPELLED_OUT2_RE.search(txt)
    if m:
        year, year_known = parse_year(m.group(3))
        month, month_known = parse_month(m.group(1))
        day, day_known = parse_int(m.group(2))
        if month:
            return (year, month, day, year_known, month_known, day_known)

    m = DDMM_RE.search(txt)
    if m:
        if DEFAULT_DDMM_FORMAT == "dd/mm/yyyy":
            month, month_known = parse_int(m.group(2))
            day, day_known = parse_int(m.group(1))
        else:
            month, month_known = parse_int(m.group(1))
            day, day_known = parse_int(m.group(2))

        if month > 12:
            month, day = day, month
            month_known, day_known = day_known, month_known
        return (-4000, month, day, False, month_known, day_known)

    m = YYYYMM_RE.search(txt)
    if m:
        year, year_known = parse_year(m.group(1))
        month, month_known = parse_int(m.group(3))
        return (year, month, 1, year_known, month_known, False)

    return (-4000, 1, 1, False, False, False)


########################
# Calendar
########################

class Calendar:
    """Abstract base class for all types of calendars we support"""

    def __init__(self, suffixes: str):
        self.__re = re.compile(
            '\\s*\\(?(' + suffixes + ')\\)?\\s*', IGNORECASE)
        self._month_names = MONTH_NAMES

    def is_a(self, text: str) -> Optional[str]:
        """
        If str is expressed in the calendar, returns the string that remains
        after removing the calendar indication. Return None if the date does
        not match the calendar
        Default implementation is to check for a suffix that matches that of
        the calendar. However, calendar implementations are encouraged to
        check month names or other recognizable characteristics
        """

        m = self.__re.search(text)
        if m:
            return text[:m.start(0)] + text[m.end(0):]
        return None

    def __str__(self) -> str:
        """Convert to a string"""
        return ""

    def parse(self, txt: str) -> Tuple[int, bool, bool, bool, "Calendar"]:
        """
        Parse a simple date expressed in this calendar. str contains
        information about day, month and year only, although some of this
        info might be missing. Classes are encouraged to support as many
        formats as possible for completeness.
        None should be returned if the date could not be parsed.
        This returns a tuple containing
        (julian_day_number, year_specified, month_specified, day_specified,
         calendar)
        """
        year: Optional[int]
        month: Optional[int]
        day: Optional[int]

        year, month, day, yk, mk, dk = get_ymd(txt, self._month_names)
        if not yk:
            year = None

        if not dk:
            day = None

        if not mk:
            month = None

        return self.from_components(year, month, day)

    def from_components(
            self,
            year: int = None,
            month: int = None,
            day: int = None,
            ) -> Tuple[int, bool, bool, bool, "Calendar"]:
        """
        Given an expanded (possibly partial) date, return the same result
        as parse.
        """
        raise NotImplementedError

    def components(self, julian_day: int) -> Tuple[int, int, int]:
        """Return a tuple (year, month, day) for the given day"""
        raise NotImplementedError

    def date_unicode(
            self,
            julian_day: int,
            year_known=True,
            month_known=True,
            day_known=True,
            year_only=False,
            ) -> str:
        """
        Return a string representing the julian day in the self calendar.
        If year_only is true, only the year is returned
        """
        (year, month, day) = self.components(julian_day)

        if year_only:
            if year_known:
                return f"{year:04d}"
            return ""

        if year_known:
            if month_known and not day_known:
                return f"{year:04d}-{month:02d}"
            if month_known and day_known:
                return f"{year:04d}-{month:02d}-{day:02}"
            if day_known:
                return f"{year:04d}-??-{day:02d}"
            return f"{year:04d}"
        else:
            return f"????-{month:02d}-{day:02d}"


class CalendarGregorian(Calendar):

    """The gregorian calendar, first created in 1582 but adopted sometimes
       much later in some countries
    """

    def __init__(self) -> None:
        Calendar.__init__(self, "\\b(GR|G|Gregorian)\\b")

    def from_components(
            self,
            year: int = None,
            month: int = None,
            day: int = None,
            ) -> Tuple[int, bool, bool, bool, Calendar]:
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
    def today() -> Tuple[int, bool, bool, bool, "Calendar"]:
        """Return today's date"""
        t = time.localtime()
        return CalendarGregorian().from_components(
            t.tm_year, t.tm_mon, t.tm_mday)

    def components(self, julian_day: int) -> Tuple[int, int, int]:
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

    def __init__(self) -> None:
        # The @#DFRENCH R@ notation comes from gramps
        Calendar.__init__(self, "\\b(F|FR|French Republican)\\b|@#DFRENCH R@")
        self._month_names = dict()
        for index, f in enumerate(FRENCH_MONTHS):
            for m in f:
                self._month_names[m] = index + 1

        self.__months_re = re.compile(
            "|".join([k for k in self._month_names.keys() if k != ""]),
            IGNORECASE)

    def __str__(self) -> str:
        # Do not return the name of the calendar when we spell out the month
        # name in date_str(), since there is no ambiguity in this case
        # return "French Republican"
        return ""

    def is_a(self, text: str) -> Optional[str]:
        """See inherited documentation"""
        result = Calendar.is_a(self, text)
        if result:
            return result

        m = self.__months_re.search(text)
        if m:
            return text

        return None

    def from_components(
            self,
            year: int = None,
            month: int = None,
            day: int = None,
            ) -> Tuple[int, bool, bool, bool, Calendar]:
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

    def components(self, julian_day: int) -> Tuple[int, int, int]:
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

    def date_unicode(
            self,
            julian_day: int,
            year_known=True,
            month_known=True,
            day_known=True,
            year_only=False,
            ) -> str:
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

    def __init__(self) -> None:
        # OS stands for "Old style"
        Calendar.__init__(self, "\\b(JU|J|Julian|OS)\\b|@#DJULIAN@")
        self._month_names = MONTH_NAMES

    def __str__(self) -> str:
        return "Julian"

    def from_components(
            self,
            year: int = None,
            month: int = None,
            day: int = None,
            ) -> Tuple[int, bool, bool, bool, Calendar]:
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

    def components(self, julian_day: int) -> Tuple[int, int, int]:
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

class TimeDelta:
    """
    A difference between two dates.
    You can add a number of years or months to a date. This directly
    adds on the components of the dates (which are then normalized).
    However, when you do a difference between two days, it is always
    returned as a number of days to keep precision (since a year does
    not have a fixed duration).
    """

    def __init__(
            self,
            years: int = 0,
            months: int = 0,
            days: int = 0,
            weeks: int = 0,
            ):
        self.days = days + weeks * 7
        self.months = months
        self.years = years

    def __str__(self) -> str:
        result = []
        if self.years != 0:
            result.append(f"{self.years}y")
        if self.months != 0:
            result.append(f"{self.months}m")
        if self.days != 0:
            result.append(f"{self.days}d")
        return " ".join(result)

    def __neg__(self) -> "TimeDelta":
        return TimeDelta(
            years=-self.years, months=-self.months, days=-self.days
        )

    def parse(self, txt: str) -> str:
        """
        Parse a text description of the delta. This extracts the relevant
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

@functools.total_ordering
class _Date:
    """Internal representation for a specific point in time (not a range of
       dates).
       The date might be imprecise ("about 1700") or incomplete ("1802-02",
       no day).
       This class is for internal use. Users should use the Date class, which
       can be used to represent either a date or a range of dates, and provides
       the operations on such dates.
    """

    def __init__(self, text="", calendar: Calendar = None):
        """Unless specified, the calendar will be auto-detected."""
        self.text = text.strip() or ""
        self.calendar = calendar
        self.type = When.ON
        self.precision = Precision.EXACT
        self.seconds: Optional[datetime.time] = None
        self.date: Optional[int] = None    # Julian day
        self.month_known = False
        self.year_known = False
        self.day_known = False
        if text:
            self.__parse()

    def __parse(self) -> None:
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

        self.type = When.ON
        match = BEFORE_RE.search(txt)
        if match:
            self.type = When.BEFORE
            txt = (match.group(2) or "") + txt[match.end(1):]
        else:
            match = AFTER_RE.search(txt)
            if match:
                self.type = When.AFTER
                txt = (match.group(2) or "") + txt[match.end(1):]

        self.precision = Precision.EXACT
        match = ABOUT_RE.search(txt)
        if match:
            self.precision = Precision.ABOUT
            txt = txt[:match.start(0)] + txt[match.end(0):]
        else:
            match = EST_RE.search(txt)
            if match:
                self.precision = Precision.ESTIMATED
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

            self.seconds = datetime.time(
                hour=hour,
                minute=int(match.group(2)),
                second=secs,
            )
            txt = txt[:match.start(0)]
        else:
            self.seconds = None

        delta = TimeDelta()

        (self.date, self.year_known, self.month_known, self.day_known,
         self.calendar) = self.calendar.parse(delta.parse(txt).strip())

        if delta.years or delta.months or delta.days:
            r = self + delta
            self.date = r.date
            self.calendar = r.calendar

    def __repr__(self) -> str:
        return self.__str__()

    def __str__(self) -> str:
        """
        Display the date, using either the parsed date, or if it could not be
        parsed the date as was entered by the user. The calendar used is the
        one parsed from the initial string.
        """
        return self.display(calendar=None)

    def __lt__(self, right: "_Date") -> bool:
        """
        Compare two dates
        """
        return self.julian_day < right.julian_day

    @property
    def julian_day(self) -> int:
        return (0 if self.date is None else self.date)

    def sort_date(self) -> Optional[str]:
        """Return a single date that can be used when sorting Dates"""
        if self.year_known and self.date is not None:
            return CalendarGregorian().date_unicode(self.date)
        else:
            return None  # Can't do any sorting

    def year(self, calendar: Calendar = None) -> int:
        """Return the year component of self, in the associated calendar"""
        cal = calendar or self.calendar
        if cal is None or self.date is None:
            return 0
        return cal.components(self.date)[0]

    def __eq__(self, date: Any) -> bool:
        if isinstance(date, _Date):
            return self.date == date.date
        return False

    @staticmethod
    def today() -> "_Date":
        """Return today's date"""
        date = CalendarGregorian().today()
        result = _Date("")
        (
            result.date,
            result.year_known,
            result.month_known,
            result.day_known,
            result.calendar,
        ) = date
        return result

    def display(
            self,
            calendar: Calendar = None,
            year_only=False,
            original=False,
            ) -> str:
        """
        Return a string representing string. By default, this uses the
        calendar parsed when the date was created, but it is possible to
        force the display in other date formats.
        If the date could not be parsed, it is returned exactly as written
        by the user.
        If ORIGINAL is true, the date is output exactly as the user entered it
        """

        if original and self.text:
            return str(self.text)

        else:
            cal = calendar or self.calendar
            if cal is None or self.date is None:
                return ""

            result = ""

            if self.precision == Precision.ABOUT:
                result += "~"

            if self.type == When.BEFORE:
                result += "/"

            result += cal.date_unicode(
                self.date, self.year_known,
                self.month_known, self.day_known,
                year_only=year_only)

            if not year_only and self.seconds is not None:
                result += " " + str(self.seconds)

            if self.type == When.AFTER:
                result += "/"

            if self.precision == Precision.ESTIMATED:
                result += " ?"

            cal_str = str(cal)
            if cal_str:
                result += f" ({cal})"

            return result

    def __add__(self, delta: TimeDelta) -> "_Date":
        """Add a delta to a date"""
        result = _Date()

        if self.date is None or self.calendar is None:
            return result

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

    @overload
    def __sub__(self, date: "_Date") -> TimeDelta:
        ...

    @overload
    def __sub__(self, date: TimeDelta) -> "_Date":
        ...

    def __sub__(
            self,
            date: Union["_Date", TimeDelta],
            ) -> Union["_Date", "TimeDelta"]:
        """
        Return a year-month-day difference between two dates.
        The result is meant to be human readable, and matches the
        computation done when entering dates. But it is less precise
        than the number of days, as returned by days_since().
        """

        if self.calendar is None or self.date is None:
            return _Date()

        if isinstance(date, TimeDelta):
            return self + (-date)

        if date.date is None:
            return _Date()

        (y1, m1, d1) = self.calendar.components(self.date)
        (y2, m2, d2) = self.calendar.components(date.date)

        m = (y1 - y2) * 12 + m1 - m2  # Total months difference
        if d1 != d2:
            m -= 1
        years = m // 12
        months = m % 12

        d = date + TimeDelta(years=years, months=months)
        if d.date is None:
            return _Date()

        days = self.date - d.date

        return TimeDelta(years=years, months=months, days=days)

    def day_of_week(self) -> str:
        """
        Return the day of week (as a string) for self.
        This returns an empty string if the date is not fully known
        """
        # See http://en.wikipedia.org/wiki/Calculating_the_day_of_the_week
        # We know that Jan 1st, 1700 was a Friday

        if (
                self.date is not None
                and self.year_known
                and self.month_known
                and self.day_known
           ):
            JAN_01_1700 = 2341973  # Julian day
            return WEEKDAYS[(self.date - JAN_01_1700 + 5) % 7]

        return ""


min_date = _Date("1")
max_date = _Date("9999")


##################
# DateRange
##################

@functools.total_ordering
class DateRange:
    """
    This class represents a date or a range of date, as read from the
    user. Such dates might be incomplete or unprecise. The text entered
    by the user is meant to be kept forever, this class provides an
    interpretation of the text more suitable for machin use
    """

    def __init__(self, text: str):
        """
        Represents a potentially partial and potentially unprecise date
        or date range, in a specific calendar. calendar should be an instance
        of a derived class of Calendar. If unspecified, the Date class
        will attempt to autodetect it.
        """

        self._from: Optional[Union[_Date, "DateRange"]]
        self._to: Optional[Union[_Date, "DateRange"]] = None
        self._span = Span.NONE

        text = self._text = text.strip()  # Date as the user entered it

        groups = PERIOD_RE.search(text)
        if groups:
            # First date could be "between A and B"
            self._from = DateRange(groups.group(2))
            self._to = DateRange(groups.group(4))
            self._span = Span.FROM
            return

        groups = FROM_RE.search(text)
        if groups:
            self._from = DateRange(groups.group(2))
            self._to = None
            self._span = Span.FROM
            return

        groups = TO_RE.search(text)
        if groups:
            self._from = None
            self._to = DateRange(groups.group(2))
            self._span = Span.FROM
            return

        groups = BETWEEN_RE.search(text)
        if groups:
            self._from = DateRange(groups.group(2))
            self._to = DateRange(groups.group(4))
            self._span = Span.BETWEEN
            return

        self._from = _Date(text)

    @staticmethod
    def today() -> "DateRange":
        """Return today's date"""
        today = _Date.today()
        result = DateRange.__new__(DateRange)
        result._text = str(today)
        result._from = today
        result._to = None
        result._span = Span.NONE
        return result

    def sort_date(self) -> Optional[str]:
        """
        Return a single date that can be used when sorting DateRanges.
        For a range of dates, we have chosen (randomly) to return the
        first date in the range.
        """
        return self._from.sort_date() if self._from else ""

    @property
    def earliest_date(self) -> _Date:
        if self._from is None:
            return min_date
        if isinstance(self._from, _Date):
            return self._from
        return self._from.earliest_date

    @property
    def earliest_julian_day(self) -> int:
        return self.earliest_date.julian_day

    @property
    def latest_date(self) -> _Date:
        if self._span == Span.NONE:
            return self.earliest_date
        if self._to is None:
            return max_date
        if isinstance(self._to, _Date):
            return self._to
        return self._to.latest_date

    @property
    def latest_julian_day(self) -> int:
        return self.latest_date.julian_day

    def overlap(self, right: "DateRange") -> bool:
        """
        Whether the two ranges overlap
        """
        if self._span == Span.NONE or right._span == Span.NONE:
            return False    # a date never overlaps anything

        sf = self.earliest_julian_day
        st = self.latest_julian_day
        rf = right.earliest_julian_day
        rt = right.latest_julian_day
        return sf < rt and rf < st

    def left_of(self, right: "DateRange") -> bool:
        """
        Whether self is to the left of right
        """
        st = self.latest_julian_day
        rf = right.earliest_julian_day
        return st <= rf

    @overload
    def __sub__(self, date: TimeDelta) -> "DateRange":
        ...

    @overload
    def __sub__(self, date: "DateRange") -> TimeDelta:
        ...

    def __sub__(
            self,
            date: Union[TimeDelta, "DateRange"],
            ) -> Union["DateRange", TimeDelta]:
        """Return a TimeDelta between the two dates"""

        if isinstance(date, TimeDelta):
            result = DateRange.__new__(DateRange)
            result._text = f"{self} - {date}"
            result._from = (
                self._from - date
                if self._from is not None
                else None
            )
            result._to = (
                self._to - date
                if self._to is not None
                else None
            )
            result._span = self._span
            return result

        if self.overlap(date):
            return TimeDelta()

        sf = self.earliest_date
        st = self.latest_date
        df = date.earliest_date
        dt = date.latest_date
        return st - df if st <= df else sf - dt

    def __add__(self, delta: TimeDelta) -> "DateRange":
        """Add a delta to a date range"""
        result = DateRange.__new__(DateRange)
        result._text = f"{self} + {delta}"
        result._from = None if self._from is None else self._from + delta
        result._to = None if self._to is None else self._to + delta
        result._span = Span.NONE
        return result

    def year(self, calendar: Calendar = None) -> Optional[int]:
        """Return the year to be used for the range, when sorting"""
        if self._from is None:
            return None
        if isinstance(self._from, _Date):
            if self._from.year_known:
                return self._from.year(calendar)
            return None
        return self._from.year(calendar)

    def __eq__(self, date: Any) -> bool:
        if isinstance(date, DateRange):
            return self._from == date._from and self._to == date._to
        return False

    def __lt__(self, date: Union["DateRange", _Date]) -> bool:
        """Compare two DateRange"""
        d1 = self.earliest_julian_day
        d2 = (
            date.earliest_julian_day
            if isinstance(date, DateRange)
            else date.julian_day
        )
        return d1 < d2

    def __str__(self) -> str:
        """Convert to a string"""
        return self.display()

    def display(
            self,
            calendar: Calendar = None,
            year_only=False,
            original=False,
            ) -> str:
        """
        Convert to a string
        :param bool year_only: only display the date.
        """

        if original and self._text:
            return str(self._text)

        if self._from is None:
            if self._to is None:
                return str(self._text)

            d2 = self._to.display(
                calendar=calendar, year_only=year_only, original=original)
            return f"to {d2}"

        d1 = self._from.display(
            calendar=calendar, year_only=year_only, original=original)

        if self._to is not None:
            d2 = self._to.display(
                calendar=calendar, year_only=year_only, original=original)
            if self._span == Span.FROM:
                return f"from {d1} to {d2}"
            if self._span == Span.BETWEEN:
                return f"between {d1} and {d2}"
        else:
            if self._span == Span.FROM:
                return f"from {d1}"
            if self._span == Span.NONE:
                return d1
        raise Exception(f"unexpected span {self._span}")

    def days_since(self, date: "DateRange") -> int:
        """"Return the number of days between two dates"""
        if self.overlap(date):
            return 0

        sf = self.earliest_julian_day
        st = self.latest_julian_day
        df = date.earliest_julian_day
        dt = date.latest_julian_day
        return st - df if st <= dt else sf - dt

    def years_since(self, date: "DateRange") -> Optional[int]:
        """Return the number of years between two DateRange.
           Only full years are counted
        """
        sf = self.earliest_date
        df = date.earliest_date

        if sf != min_date and df != min_date:
            return (sf - df).years
        return None

    def day_of_week(self) -> str:
        """Return the day of week for the start date"""
        return "" if self._from is None else self._from.day_of_week()

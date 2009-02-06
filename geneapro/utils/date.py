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

from django.utils.translation import ugettext as _
import datetime, re, time

__all__ = ["from_roman_literal", "to_roman_literal", "DateRange", "Date"]

## The following strings indicate how to specify date ranges in your language.
## These are regexp, and should not include parenthesis groups

re_from    = _("de")     # for span ranges: "from"
re_to      = _("a")      # for span ranges: "to"
re_between = _("entre")  # for between ranges: "between"
re_and     = _("et")     # for between ranges: "and"
re_days    = _("jours?") # When adding delta (your language only)
re_months  = _("mois?")  # When adding delta (your language only)
re_years   = _("ans?")   # When adding delta (your language only)
default_ddmm_format = _("mm/dd/yyyy")  # or "mm/dd/yyy" depending on locale

# Month names should be all lower cases
month_names = {_("jan"):1,
               _("january"):1,
               _("feb"):2,
               _("februrary"):2,
               _("mar"):3,
               _("march"):3,
               _("apr"):4,
               _("april"):4,
               _("may"):5,
               _("jun"):6,
               _("june"):6,
               _("jul"):7,
               _("july"):7,
               _("aug"):8,
               _("august"):8,
               _("sep"):9,
               _("september"):9,
               _("oct"):10,
               _("october"):10,
               _("nov"):11,
               _("november"):11,
               _("dec"):12,
               _("december"):12}

french_months = [
  ("vendemiaire", "vend"),
  ("brumaire", "brum"),
  ("frimaire", "frim"),
  ("nivose", "nivo"),
  ("pluviose", "pluv"),
  ("ventose",  "vent"),
  ("germinal", "germ"),
  ("floreal", "flor"),
  ("prairial", "prai"),
  ("messidor", "mess"),
  ("thermidor", "ther"),
  ("fructidor", "fruc"),
  ("",)]

## No translation below

from_re = re.compile ("^\s*(from|" + re_from + ")\s+(.+)\s+(to|" +
                      re_to + ")\s+(.*)\s*$", re.IGNORECASE)
between_re = re.compile ("^\s*(between|" + re_between + ")\s+(.+)\s+(and|" +
                         re_and + ")\s+(.*)\s*$", re.IGNORECASE)
time_re = re.compile ("\s*(\d?\d):(\d?\d)(:(\d?\d))?(am|pm)?")
add_re  = re.compile ("\s*([-+])\s*(\d+)\s*(days?|months?|years?|" +
                      re_days + "|" + re_months + "|" +
                      re_years + ")\s*$", re.IGNORECASE)
year_re = "(\d{1,4}|(?:an\s+)?[MDCXVI]+)"
yyyymmdd_re = re.compile ("^\s*" + year_re + "[-/](\d?\d)[-/](\d?\d)$",
                          re.IGNORECASE) 
iso_re = re.compile ("^\s*" + year_re + "(\d{2})(\d{2})$", re.IGNORECASE)
ddmmyyyy_re = re.compile ("^\s*(\d\d)[/-](\d\d)[/-]" + year_re + "$",
                          re.IGNORECASE)
spelled_out_re = re.compile ("^\s*(?:(\d\d?)\s+)?([a-z]+),?\s*" + year_re + "$",
                             re.IGNORECASE)
spelled_out2_re = re.compile ("^\s*(\w+)\s+(\d\d?),?\s*" + year_re + "$",
                             re.IGNORECASE)
yyyymm_re = re.compile ("^\s*" + year_re + "([-/](\d\d?))?$", re.IGNORECASE)
ddmm_re   = re.compile ("^\s*(\d{2})[-/](\d{2})$")

before_re = re.compile ("(<|before|bef|avant|[^\d]/(\\d))",
                        re.IGNORECASE)
after_re  = re.compile ("(>|after|aft|apres|(\\d)/[^\d])",
                        re.IGNORECASE)
about_re  = re.compile ("\s*(\\babout\\b|\\babt\\.?|\\bcirca\\b|\\bca\\b|\\benviron\\b|\\benv\\b|~)\s*",
                        re.IGNORECASE)

# "cal" is used for "calculated" in gramps
est_re    = re.compile ("\s*(estimated\s*|est\.?\s*|cal|\?\s*$)", re.IGNORECASE)
 
SPAN_FROM    = 1
SPAN_BETWEEN = 2

DATE_BEFORE = 1
DATE_ON     = 2
DATE_AFTER  = 3

PRECISION_ABOUT     = 1
PRECISION_ESTIMATED = 2
PRECISION_EXACT     = 3

roman_literals = dict (I=1, V=5, X=10, L=50, C=100, D=500, M=1000)

def from_roman_literal (str):
   """Convert a roman literal into an int"""
   total = 0
   subtotal = 0
   prev_char = 0

   for p in str:
      if p == prev_char:
         subtotal = subtotal + roman_literals[p]
      elif prev_char and roman_literals[prev_char] < roman_literals[p]:
         total = total + roman_literals[p] - subtotal
         subtotal = 0
         prev_char = 0
      else:
         total = total + subtotal
         subtotal = roman_literals[p]
         prev_char = p

   return total + subtotal

def to_roman_literal (val):
   def proc (digit, ten, five, unit):
      if digit == 0:   return ""
      elif digit < 4:  return unit * digit
      elif digit == 4: return unit + five
      elif digit < 9:  return five + unit * (digit - 5)
      else:            return unit + ten

   return proc (val / 1000, ten="MMMMMMMMMM", five="MMMMM", unit="M") \
     + proc ((val % 1000) / 100, ten="M", five="D", unit="C") \
     + proc ((val % 100) / 10, ten="C", five="L", unit="X") \
     + proc (val % 10, ten="X", five="V", unit="I")

def __get_year (str):
   """Convert a year string (possibly in roman literals) into an int"""
   if str.isdigit ():
      return int (str)
   else:
      # In the french calendar, the date is often spelled with
      #  "25 fructidor an X", where "an" means "year"
      str = re.sub ("an\s*", "", str)
      return from_roman_literal (str)

def get_ymd (txt, months):
   """Extracts year, month and day from txt. Returns a tuple with
      (year, month, day, year_specified, month_specified, day_specified)
      The last three fields indicate whether the field was specified or
      txt or whether a default value was used.
      _months_ is a dict of month names for the current calendar. It can
      contain an entry matching the empty string which is used as the default
      when the month is not found.
   """

   m = yyyymmdd_re.search (txt) or iso_re.search (txt)
   if m:
      return (__get_year (m.group (1)),
              int (m.group (2)),
              int (m.group (3)),
              True, True, True)

   m = ddmmyyyy_re.search (txt)
   if m:
      if default_ddmm_format == "dd/mm/yyyy":
         month = int (m.group (2))
         day   = int (m.group (1))
      else:
         month = int (m.group (1))
         day   = int (m.group (2))

      if month > 12:
         month, day = day, month

      return (__get_year (m.group (3)), month, day, True, True, True)
      
   m = spelled_out_re.search (txt)
   if m:
      try:
         month = months[m.group (2).lower()]
      except KeyError:
         month = months[""]
      try:
         day = int (m.group (1))
      except:
         day = 1
      return (__get_year (m.group (3)), month, day, True, True, True)

   m = spelled_out2_re.search (txt)
   if m:
      try:
         month = months[m.group (1).lower()]
      except KeyError:
         month = months.get ("")
      if month:
         return (__get_year (m.group (3)), month, int (m.group (2)),
                 True, True, True)

   m = ddmm_re.search (txt)
   if m:
      if default_ddmm_format == "dd/mm/yyyy":
         month = int (m.group (2))
         day   = int (m.group (1))
      else:
         month = int (m.group (1))
         day   = int (m.group (2))

      if month > 12:
         month, day = day, month
      return (-4000, month, day, False, True, True)

   m = yyyymm_re.search (txt)
   if m:
      if m.group (3):
         return (__get_year (m.group (1)), int (m.group (3)), 1,
                 True, True, False)
      else:
         return (__get_year (m.group (1)), 1, 1, True, False, False)
      
   return (-4000, 1, 1, False, False, False)

########################
## Calendar
########################

class Calendar (object):
   """Abstract base class for all types of calendars we support"""

   def __init__ (self, suffixes):
     self.__re = re.compile \
       ('\\s*\\(?(' + suffixes + ')\\)?\\s*', re.IGNORECASE)
     self._month_names = month_names

   def is_a (self, str):
     """If str is expressed in the calendar, returns the string that remains
        after removing the calendar indication. Return None if the date does
        not match the calendar
        Default implementation is to check for a suffix that matches that of
        the calendar. However, calendar implementations are encouraged to
        check month names or other recognizable characteristics"""

     m = self.__re.search (str)
     if m:
        return str [:m.start(0)] + str[m.end(0):]
     else:
        return None

   def __str__ (self):
     """Convert to a string"""
     return ""

   def parse (self, txt, add_year=0, add_month=0, add_day=0):
     """Parse a simple date expressed in this calendar. str contains
        information about day, month and year only, although some of this
        info might be missing. Classes are encouraged to support as many
        formats as possible for completeness.
        None should be returned if the date could not be parsed.
        This returns a tuple containing
           (julian_day_number, year_specified, month_specified, day_specified,
            calendar)
        The add_* parameters specify offsets to add to year, month and day.
        In general, the calendar will be self, except if it could not parse
        the date and we defaulted to another calendar.
     """
     year, month, day, y_known, m_known, d_known = \
        get_ymd (txt, self._month_names)
     if y_known:
        year += add_year
     else:
        year = None

     if m_known:
        month += add_month
     else:
        month = None

     if d_known:
        day  += add_day
     else:
        day = None

     return self.from_components (year, month, day)

   def from_components (self, year=None, month=None, day=None):
     """Given an expanded (possibly partial) date, return the same result
        as parse."""
     return None

   def components (self, julian_day):
     """Return a tuple (year, month, day) for the given day"""
     return (0, 0, 0)

   def date_str (self, julian_day, year_known=True,
                 month_known=True, day_known=True):
     """Return a string representing the julian day in the self calendar"""
     (year, month, day) = self.components (julian_day)

     if year_known:
        if month_known and not day_known:
           format = "%(year)d-%(month)02d"
        elif month_known and day_known:
           format = "%(year)d-%(month)02d-%(day)02d"
        elif day_known:
           format = "%(year)d-??-%(day)02d"
        else:
           format = "%(year)d"
     else:
        format = "????-%(month)02d-%(day)02d"

     return format % {"year":year, "month":month, "day":day}

class Calendar_Gregorian (Calendar):
   def __init__ (self):
     Calendar.__init__ (self, "\\b(GR|G|Gregorian)\\b")

   def from_components (self, year=None, month=None, day=None):
     y = year or -4000
     m = month or 1
     d = day or 1

     # If date is before the invention of gregorian calendar, assume we have
     # a julian date

     if year and (y,m,d) < (1582, 2, 24):
        return Calendar_Julian ().from_components (year, month, day)

     else:
        feb_29_4800 = 32045 # Julian day for Feb 29th, -4800 in gregorian cal.
        a = (14 - m) / 12
        y2 = y + 4800 - a
        m2 = m + 12 * a - 3
        d = d + (153 * m2 + 2) / 5 + 365 * y2 + y2 / 4 - y2 / 100 + y2 / 400\
          - feb_29_4800
        return (d, year != None, month != None, day != None, self) 

   @staticmethod
   def today ():
      """Return today's date"""
      t = time.localtime()
      return Calendar_Gregorian ().from_components (
          t.tm_year, t.tm_mon, t.tm_mday)

   def components (self, julian_day):
      # Algorithm from wikipedia "julian day"
      days_per_four_years = 1461 # julian days per four year period
      j = julian_day + 32044
      g = j / 146097
      dg = j % 146097
      c = (dg / 36524 + 1) * 3 / 4
      dc = dg - c * 36524
      b = dc / days_per_four_years
      db = dc % days_per_four_years
      a = (db / 365 + 1) * 3 / 4
      da = db - a * 365
      y = g * 400 + c * 100 + b * 4 + a
      m = (da * 5 + 308) / 153 - 2
      d = da - (m + 4) * 153 / 5 + 122

      return (y - 4800 + (m + 2) / 12, (m + 2) % 12 + 1, d + 1)

class Calendar_French (Calendar):
   def __init__ (self):
     # The @#DFRENCH R@ notation comes from gramps
     Calendar.__init__ (self, "\\b(F|FR|French Republican)\\b|@#DFRENCH R@")
     self._month_names = dict ()
     for index, f in enumerate (french_months):
        for m in f:
          self._month_names[m] = index + 1

     self.__months_re = re.compile\
         ("|".join ([m for m in self._month_names.keys() if m != ""]),
          re.IGNORECASE)

   def __str__ (self):
     # Do not return the name of the calendar when we spell out the month
     # name in date_str(), since there is no ambiguity in this case
     #return "French Republican"
     return ""

   def is_a (self, str):
     result = Calendar.is_a (self, str)
     if result: return result

     m = self.__months_re.search (str)
     if m: return str

     return None

   def from_components (self, year=None, month=None, day=None):
     if year and year >= 1:
        y = year or -4000
        m = month or 1
        d = day or 1
        sep_21_1792 = 2375839
        return (sep_21_1792 + (y  - 1) * 365 + y / 4 + m * 30 - 30 + d,
                year != None, month != None, day != None, self)
     else:
        return (0, False, False, False, self)

   def components (self, julian_day):
     # From http://www.scottlee.net
     days_per_four_years = 1461 # julian days per four year period
     epoch = 2375474
     days_per_month = 30
     tmp = (julian_day - epoch) * 4 - 1
     y = tmp / days_per_four_years
     day_of_year = (tmp % days_per_four_years) / 4
     m = day_of_year / days_per_month + 1
     d = day_of_year % days_per_month + 1

     return (y, m, d)

   def date_str (self, julian_day, year_known=True, month_known=True,
                 day_known=True):
     (y, m, d) = self.components (julian_day)
     output = ""

     if day_known:
        output = str (d) + " "

     if month_known:
        if m == 13:
           output = output + _("jours feries ")
        else:
           output = output + french_months [m - 1][0] + " "

     if year_known:
        output = output + to_roman_literal (y)

     return output

class Calendar_Julian (Calendar):
   def __init__ (self):
     # OS stands for "Old style"
     Calendar.__init__ (self, "\\b(JU|J|Julian|OS)\\b")
     self._month_names = month_names

   def __str__ (self):
     return "Julian"

   def from_components (self, year=None, month=None, day=None):
     # Conversion formulat from Wikipedia "Julian Day"
     y = year or -4000
     m = month or 1
     d = day or 1

     feb_29_4800 = 32083 # Julian day number for Feb 29th, -4800
     a = (14 - m) / 12
     y2 = y + 4800 - a
     m2 = m + 12 * a - 3
     return ((d + (153 * m2 + 2) / 5 + 365 * y2 + y2 / 4) - feb_29_4800,
             year != None, month != None, day != None, self)

   def components (self, julian_day):
     days_per_four_years = 1461 # julian days per four year period
     j = julian_day + 32083
     b = j / days_per_four_years
     db = j % days_per_four_years
     a = (db / 365 + 1) * 3 / 4
     da = db - a * 365
     y = b * 4 + a
     m = (da * 5 + 308) / 153 - 2
     return (y - 4800 + (m + 2) / 12, (m + 2) % 12 + 1,
             da - (m + 4) * 153 / 5 + 122)

# The list of predefined calendars
calendars = [Calendar_Julian(), Calendar_French(), Calendar_Gregorian()]

#####################
## Date
#####################

class Date (object):
   def __init__ (self, str):
      """Represents a point in time (not a range of dates). The date might be
         imprecise ("about 1700") or incomplete ("1802-02", no day)
      """
      self.text = str or ""
      self.calendar = None
      self.__parse ()

   def __parse (self):
      txt = self.text

      for c in calendars:
         remain = c.is_a (self.text)
         if remain:
           self.calendar = c
           txt = remain
           break

      if not self.calendar:
         self.calendar = Calendar_Gregorian ()

      self.type = DATE_ON
      m = before_re.search (txt)
      if m:
         self.type = DATE_BEFORE
         txt = (m.group (2) or "") + txt[m.end(1):]
      else:
         m = after_re.search (txt)
         if m:
            self.type = DATE_AFTER
            txt = (m.group (2) or "") + txt[m.end(1):]

      self.precision = PRECISION_EXACT
      m = about_re.search (txt)
      if m:
         self.precision = PRECISION_ABOUT
         txt = txt[:m.start(0)] + txt[m.end(0):]
      else:
         m = est_re.search (txt)
         if m:
            self.precision = PRECISION_ESTIMATED
            txt = txt[:m.start(0)] + txt[m.end(0):]

      # Do we have a time indicated ?
      m = time_re.search (txt)
      if m:
         if m.group (4):
           secs = int (m.group (4)) 
         else:
           secs = 0

         if m.group (5) == "pm":
           hour = int (m.group (1)) + 12
         else:
           hour = int (m.group (1))

         self.seconds = datetime.time (hour=hour,
                                       minute=int (m.group (2)),
                                       second=secs)
         txt = txt[:m.start(0)]
      else:
         self.seconds = None

      # Are we doing additions or substractions here ?
      add_days   = 0
      add_months = 0
      add_years  = 0

      while True:
         m = add_re.search (txt)
         if not m: break

         if re.match ("day?", m.group (3)) or re.match (re_days, m.group (3)):
            if m.group (1) == '+':
               add_days = add_days + int (m.group (2))
            else:            
               add_days = add_days - int (m.group (2))

         elif re.match ("months?", m.group (3)) \
              or re.match (re_months, m.group (3)):
            if m.group (1) == '+':
               add_months = add_months + int (m.group (2))
            else:            
               add_months = add_months - int (m.group (2))

         elif re.match ("years?", m.group (3)) \
              or re.match (re_years, m.group (3)):
            if m.group (1) == '+':
               add_years = add_years + int (m.group (2))
            else:            
               add_years = add_years - int (m.group (2))

         txt = txt[:m.start (0)] + txt [m.end (0):]

      txt = txt.strip ()
      d = self.calendar.parse (txt, add_years, add_months, add_days)
      if d:
         (self.date, self.year_known, self.month_known, self.day_known,
          self.calendar) = d
      else:
         self.date = None

   def __str__ (self):
     """Display the date, using either the parsed date, or if it could not be
        parsed the date as was entered by the user. The calendar used is the
        one parsed from the initial string"""
     return self.display (calendar=None)

   def sort_date (self):
      """Return a single date that can be used when sorting Dates"""
      if self.year_known:
         return Calendar_Gregorian().date_str (self.date)
      else:
         return None  # Can't do any sorting

   def year (self, calendar=None):
     """Return the year component of self"""
     cal = calendar or self.calendar
     return cal.components (self.date)[0]

   def month (self, calendar=None):
     """Return the year component of self"""
     cal = calendar or self.calendar
     return cal.components (self.date)[0]

   def day (self, calendar=None):
     """Return the year component of self"""
     cal = calendar or self.calendar
     return cal.components (self.date)[0]

   def __lt__ (self, d):
     return self.date < d.date

   def __gt__ (self, d):
     return self.date < d.date

   def __eq__ (self, d):
     return self.date == d.date

   def years_since (self, d):
     """Return the number of years between self and d.
        Only full years are counted
     """

     if not d or not d.year_known or not self.year_known:
        return None

     comps = self.calendar.components (self.date)
     dcomps = d.calendar.components (d.date)
     if comps[1] > dcomps [1]:
        return comps[0] - dcomps [0]
     elif comps[1] == dcomps [1] \
        and comps [2] > dcomps [2]:
        return comps [0] - dcomps [0]
     else:
        return comps [0] - dcomps [0] - 1

   @staticmethod
   def today ():
     """Return today's date"""
     d = Calendar_Gregorian().today ()
     result = Date ("")
     (result.date, result.year_known, result.month_known, result.day_known,
      result.calendar) = d
     return result

   def display (self, calendar=None):
     """Return a string representing string. By default, this uses the
        calendar parsed when the date was created, but it is possible to
        force the display in other date formats.
        If the date could not be parsed, it is returned exactly as written
        by the user.
     """

     if self.date:
        cal = calendar or self.calendar
        result = ""

        if self.precision == PRECISION_ABOUT:
           result = result + "ca "

        if self.type == DATE_BEFORE:
           result = result + "/"

        result = result + cal.date_str \
          (self.date, self.year_known, self.month_known, self.day_known)

        if self.seconds != None:
           result = result + " " + str (self.seconds)

        if self.type == DATE_AFTER:
           result = result + "/"

        if self.precision == PRECISION_ESTIMATED:
           result = result + " ?"

        cal = str (cal)
        if cal:
           result = result + " (" + cal + ")"

        return result
     else:
        return self.text

##################
## DateRange
##################

class DateRange (object):
   def __init__ (self, str, calendar=None):
      """Represents a potentially partial and potentially unprecise date
         or date range, in a specific calendar. calendar should be an instance
         of a derived class of Calendar. If unspecified, the Date class
         will attempt to autodetect it"""

      self.text = str
      self.__parse ()

   def sort_date (self):
      """Return a single date that can be used when sorting DateRanges"""
      if isinstance (self.date, tuple):
         return self.date[0].sort_date ()
      else:
         return self.date.sort_date ()

   def __str__ (self):
     """Convert to a string"""

     if type (self.date) == tuple:
        if self.date[2] == SPAN_FROM:
          return "from " + str (self.date[0]) + " to " + str (self.date[1])
        else:
          return "between " + str (self.date[0]) + " and " + str (self.date[1])
     else:
        return str (self.date)

   def __parse (self):
      gr = from_re.search (self.text)
      if gr:
         self.date = (Date (gr.group (2)),
                      Date (gr.group (4)),
                      SPAN_FROM)
      else:
         gr = between_re.search (self.text)
         if gr:
            self.date = (Date (gr.group (2)),
                         Date (gr.group (4)),
                         SPAN_BETWEEN)
         else:
            self.date = Date (self.text)

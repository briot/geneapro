#!/usr/bin/env python
"""
Provides an interactive date calculator
Inspired by http://www.geditcom.com/DateCalculator/index.html#about
"""

import sys
sys.path.insert(0, "geneapro/utils")
from date import DateRange, TimeDelta
import gtk

STACK_DEPTH = 20    # Number of lines in the GUI stack. Internally, the
                   # stack is illimited.
MAX_UNDO = 10      # Number of previous stacks that are saved


class EntryNoFrame(gtk.Entry):
    def __init__(self, editable, *args):
        super(EntryNoFrame, self).__init__(*args)
        self.set_has_frame(False)
        self.set_editable(editable)
        self.set_can_focus(editable)


class StackMachine(object):
    def __init__(self):
        self.contents = []   # contents for each level of the stack
                             #   (label, object)
                             # contents[0] is the "a" level,...
        self.last_stacks = [] # List of previous stacks
        self.__show_original = False # Whether to show process dates or dates
                                     # as entered by the user

    #################
    # Stack history #
    #################

    def save_stack(self):
        """Save the current stack for future reuse"""
        self.last_stacks = [self.contents] + self.last_stacks[0:MAX_UNDO]

    def prev_stack(self, *args):
        """Replace the current stack with the previous stack"""
        if len(self.last_stacks):
            self.contents = self.last_stacks[0]
            self.last_stacks = self.last_stacks[1:]
            self.update()

    ###########################
    # Operations on the stack #
    ###########################

    def enter(self, *args):
        """Add the currently edited widget onto the stack.
           This does nothing in non-gui mode.
        """
        pass

    def push(self, obj, label=""):
        """Inserts a new object on the stack"""
        self.save_stack()
        self.contents.insert(0, (label, obj))
        self.update()

    def drop(self, *args):
        """Removes the last element on the stack"""
        self.save_stack()
        self.contents = self.contents[1:]
        self.update()

    def dup(self, count=1, *args):
        """Duplicate the count first elements on the stack"""
        self.save_stack()
        self.contents = self.contents[0:count] + self.contents
        self.update()

    def set_label(self, label):
        """Set the label for the last element on the stack"""
        self.contents[0] = (label, self.contents[0][1])
        self.update()

    def swap(self, *args):
        """Swap the last two elements on the stack"""
        self.save_stack()
        self.contents[1], self.contents[0] = self.contents[0], self.contents[1]
        self.update()

    def first(self):
        """Return the lowest element on the stack"""
        return self.contents[0][1]

    def unary(self, func):
        """Apply an operator on the first element of the stack, and replace
           it with the result. FUNC must always return a result.
        """
        self.enter()
        if len(self.contents) >= 1:
            self.save_stack()
            first = self.contents[0][1]
            self.contents[0] = (None, func(first))
            self.update()

    def plus(self, *args):
        """Add the first two levels of the stack"""
        self.enter()
        if len(self.contents) >= 2:
            self.save_stack()
            d1 = self.contents[0][1]
            d2 = self.contents[1][1]
            self.contents = self.contents[2:]
            self.contents.insert(0, (None, d2 + d1))
            self.update()

    def minus(self, *args):
        """Substract the first two levels of the stack"""
        self.enter()
        if len(self.contents) >= 2:
            self.save_stack()
            d1 = self.contents[0][1]
            d2 = self.contents[1][1]
            self.contents = self.contents[2:]
            self.contents.insert(0, (None, d2 - d1))
            self.update()

    ########################
    # Displaying the stack #
    ########################

    def set_show_original(self, show_original):
        self.__show_original = show_original
        self.update()

    def img(self, idx):
        """Return the text to display for the given level of the stack"""
        if idx == 0 or idx > len(self.contents):
            return ""

        label, obj = self.contents[idx - 1]

        if isinstance(obj, DateRange):
            dpy = obj.display(original=self.__show_original)
        else:
            dpy = unicode(obj)

        if label:
            return "%s: %s" % (label, dpy)
        else:
            return dpy

    def update(self):
        """Update the display of self"""
        for idx, d in enumerate(self.contents):
            print "%s: %s" % (chr(ord('a') + idx), self.img(idx))


class GUIDateCalculator(StackMachine, gtk.Window):

    def __init__(self):
        StackMachine.__init__(self)
        gtk.Window.__init__(self)

        self.stack = []   # (entry, calendar) for the stack.
                          # stack[0] is the edition widget
                          # stack[1] is the "a" level, ...

        self.set_title("Date calculator")
        self.set_size_request(500, 700)

        self.connect("destroy", gtk.main_quit)

        vbox = gtk.VBox(spacing=0)
        self.add(vbox)

        stackdisplay = gtk.VBox(homogeneous=True)
        vbox.pack_start(stackdisplay, expand=False, fill=True)

        gr = gtk.SizeGroup(gtk.SIZE_GROUP_HORIZONTAL)

        for stackrow in range(STACK_DEPTH, -2, -1):
            hbox = gtk.HBox()
            stackdisplay.pack_start(hbox, expand=False, fill=False)

            if stackrow == -1:
                label = gtk.Label("")
            else:
                label = gtk.Label("%s: " % chr(ord('a') + stackrow))

            gr.add_widget(label)
            hbox.pack_start(label, expand=False)

            ent = EntryNoFrame(editable=stackrow==-1)
            hbox.pack_start(ent)

            cal = EntryNoFrame(editable=False)
            hbox.pack_start(cal, expand=False, fill=False)

            self.stack.insert(0, (ent, cal))

        self.stack[0][1].set_text("Auto")
        self.stack[0][0].grab_focus()
        self.stack[0][0].connect("activate", self.enter)

        table = gtk.Table(rows=2, columns=4, homogeneous=False)
        vbox.pack_start(table)

        months = gtk.Table(rows=4, columns=3, homogeneous=True)
        table.attach(months, 0, 1, 0, 1, xoptions=gtk.FILL, yoptions=gtk.FILL,
                     xpadding=5, ypadding=5)

        for idx, month in enumerate(("Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")):
            button = gtk.Button(month)
            button.set_can_focus(False)
            button.connect("clicked", self.insert, month)
            months.attach(button, idx % 3, idx % 3 + 1,
                                  idx / 3, idx / 3 + 1,
                                  xpadding=2, ypadding=2,
                                  xoptions=gtk.FILL, yoptions=gtk.FILL)

        calendars = gtk.Table(rows=4, columns=1, homogeneous=True)
        table.attach(calendars, 1, 2, 0, 1,
                     xoptions=gtk.FILL, yoptions=gtk.FILL,
                     xpadding=5, ypadding=5)

        for idx, cal in enumerate(("Greg", "Juln", "Fren")):
            button = gtk.Button(cal)
            button.set_can_focus(False)
            button.connect("clicked", self.set_calendar, cal)
            calendars.attach(button, 0, 1,
                             idx, idx + 1,
                             xpadding=2, ypadding=2,
                             xoptions=gtk.FILL, yoptions=gtk.FILL)

        operations = gtk.Table(rows=5, columns=2, homogeneous=True)
        table.attach(operations, 2, 3, 0, 1,
                     xoptions=gtk.FILL, yoptions=gtk.FILL,
                     xpadding=5, ypadding=5)

        button = gtk.Button("Enter")
        button.connect("clicked", self.enter_or_dup)
        operations.attach(button, 0, 2, 0, 1,
                          xpadding=2, ypadding=2,
                          xoptions=gtk.FILL, yoptions=gtk.FILL)

        for idx, op in enumerate(
            (("a+b", self.plus),
             ("b-a", self.minus),
             ("a<>b", self.swap),
             ("->day", self.day_of_week),
             ("drop", self.drop),
             ("Last Stack", self.prev_stack))):

            button = gtk.Button(op[0])
            button.set_can_focus(False)

            if op[1]:
                button.connect("clicked", op[1])

            operations.attach(button, idx % 2, idx % 2 + 1,
                              idx / 2 + 1, idx / 2 + 2,
                              xpadding=2, ypadding=2,
                              xoptions=gtk.FILL, yoptions=gtk.FILL)

        qualifiers = gtk.Table(rows=2, columns=5, homogeneous=True)
        table.attach(qualifiers, 0, 3, 1, 2,
                     xoptions=gtk.FILL, yoptions=gtk.FILL,
                     xpadding=5, ypadding=5)

        for idx, qual in enumerate(("From", "Bef", "Aft", "Bet",
                                    "And", "To", "Abt", "Est")):
            button = gtk.Button(qual)
            button.set_can_focus(False)
            button.connect("clicked", self.insert, qual)
            qualifiers.attach(button, idx % 5, idx % 5 + 1,
                              idx / 5, idx / 5 + 1,
                              xpadding=2, ypadding=2,
                              xoptions=gtk.FILL, yoptions=gtk.FILL)

        button = gtk.ToggleButton("Original dates")
        button.set_active(False)
        button.connect("toggled", self.toggle_show_original)
        table.attach(button, 3, 4, 0, 1, xoptions=gtk.FILL,
                     yoptions=0, xpadding=5, ypadding=5)

        self.show_all()

    def toggle_show_original(self, button):
        self.set_show_original(button.get_active())

    def update(self):
        """Update the display of self"""
        for idx, widgets in enumerate(self.stack):
            txt = self.img(idx)
            ent, cal = widgets
            ent.set_text(txt)
            cal.set_text("")

    def enter_or_dup(self, *args):
        if self.stack[0][0].get_text():
            self.enter()
        else:
            self.dup()

    def day_of_week(self, *args):
        def compute(obj):
            if isinstance(obj, DateRange):
                return obj.day_of_week()
            return obj
        self.unary(compute)

    def enter(self, *args):
        """Validate the current edit widget"""

        ent, cal = self.stack[0]
        if ent.get_text():
            txt = ent.get_text()

            obj = TimeDelta()
            txt2 = obj.parse(txt)

            if txt2 == txt:
                obj = DateRange(txt)

            self.push(obj)
            ent.grab_focus()

    def insert(self, button, text):
        """Insert some text in the current edit widget"""
        ent, cal = self.stack[0]
        pos = ent.get_position()
        txt = ent.get_text()
        ent.set_text("%s %s %s" % (txt[0:pos], text, txt[pos:]))
        ent.set_position(pos + len(text) + 2)

    def set_calendar(self, button, calendar):
        ent, cal = self.stack[0]
        cal.set_text(calendar)


win = GUIDateCalculator()
win.push(DateRange("Est JUL 1975"), "estimated")
win.push(DateRange("After JUL 1975"))
win.push(DateRange("~2011"))
win.push(DateRange("<JUL 1975"))
win.push(DateRange("10 vendemiaire XI"))
win.push(DateRange("2011-07-07 - 11 months"), "07jul-11m")
win.push(DateRange("NOV 20, 2011"))
win.push(DateRange("7 JUL 1975"))
win.push(DateRange("2011-10-07"))
win.push(DateRange("from 2011-01-01 to 2011-02-01"))

gtk.main()

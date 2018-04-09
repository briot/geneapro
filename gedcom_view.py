#!/usr/bin/env python

"""
A simple viewer for gedcom files.
This automatically indents lines
"""

import sys


indentation_size = 3

fg_white  = '\033[1;m'
fg_gray   = '\033[1;30m'
fg_red    = '\033[1;31m'
fg_green  = '\033[1;32m'
fg_yellow = '\033[1;33m'

if len(sys.argv) == 1:
    gedcom = sys.stdin
else:
    gedcom = open(sys.argv[1], "rb")

buffer = gedcom.read().replace('\r\n', '\n').replace('\r', '\n')

line_num=1
for line in buffer.splitlines():
    comps = line.split()

    level = comps[0]

    xref  = ""
    tag   = 1

    if comps[tag].startswith("@"):
        xref = fg_yellow + comps[1] + fg_white + " "
        tag   = 2

    value = tag + 1

    if value < len(comps) and comps[value].startswith("@"):
        comps[value] = fg_yellow + comps[value] + fg_white

    sys.stdout.write("%s %s%s %s%s %s\n" % (
        fg_gray + "%5d" % line_num + fg_white,
        int(level) * indentation_size * ' ',
        fg_green + level + fg_white,
        xref,
        fg_red + comps[tag] + fg_white,
        " ".join(comps[value:])))

    line_num += 1



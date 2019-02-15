#!/usr/bin/env python

"""
A simple viewer for gedcom files.
This automatically indents lines
"""

import sys


indentation_size = 3

fg_reset  = '\033[0;m'

def yellow(s):
    return '\033[1;33m' + s + fg_reset
def gray(s):
    return '\033[1;30m' + s + fg_reset
def red(s):
    return '\033[1;31m' + s + fg_reset
def green(s):
    return '\033[1;32m' + s + fg_reset


if len(sys.argv) == 1:
    gedcom = sys.stdin
else:
    gedcom = open(sys.argv[1], "r")

buffer = gedcom.read().replace('\r\n', '\n').replace('\r', '\n')

line_num=1
for line in buffer.splitlines():
    comps = line.split()

    level = comps[0]

    xref  = ""
    tag   = 1

    if comps[tag].startswith("@"):
        xref = yellow(comps[1]) + " "
        tag   = 2

    value = tag + 1

    if value < len(comps) and comps[value].startswith("@"):
        comps[value] = yellow(comps[value])

    sys.stdout.write("%s %s%s %s%s %s\n" % (
        gray("%5d" % line_num),
        int(level) * indentation_size * ' ',
        green(level),
        xref,
        red(comps[tag]),
        " ".join(comps[value:])))

    line_num += 1



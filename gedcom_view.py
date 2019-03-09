#!/usr/bin/env python
"""Print colorized, indented GEDCOM lines."""

import sys

indentation_size = 3


def colorize(s, color):
    """
    Colorize GEDCOM Line/Tag elements for sys.stdout.

    Arguments:
        s {str} -- Tag element.
        color {str} -- ASCII color Escape code.

    Returns:
        [str] -- Tag element enveloped by ASCII color escape codes.

    """
    fg_reset = '\033[0;m'
    colors = {
        'yellow': '\033[1;33m',
        'gray': '\033[1;30m',
        'red': '\033[1;31m',
        'green': '\033[1;32m'
        }
    return colors[color] + s + fg_reset


if len(sys.argv) == 1:
    gedcom = sys.stdin
else:
    with open(sys.argv[1], 'r', buffering=1) as gedcom_file:
        gedcom = gedcom_file.readlines()

for line_number, line in enumerate(gedcom):
    comps = line.split()

    level = comps[0]

    xref = ""
    tag = 1

    if comps[tag].startswith("@"):
        xref = comps[1] + " "
        tag = 2

    value = tag + 1

    if value < len(comps) and comps[value].startswith("@"):
        comps[value] = colorize(comps[value], 'yellow')

    indentation = (int(level) * indentation_size) * ' '
    formatting = "{}{}{} {}{} {}"
    format_data = (
        colorize("{0:>5}".format(line_number + 1), 'gray'),
        indentation + ' ',
        colorize(level, 'green'),
        colorize(xref, 'yellow'),
        colorize(comps[tag], 'red'),
        " ".join(comps[value:]))

    sys.stdout.write(formatting.format(*format_data) + '\n')

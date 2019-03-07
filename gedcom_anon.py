#!/usr/bin/env python

"""
Replaces all names in a gedcom with anonym names.
This is so that users can more easily send a full gedcom file
without risk for privacy
"""

import sys


gedcom = file(sys.argv[1])

index = 0

for line in gedcom.readlines():
    comps = line.split()
    level = comps[0]

    xref  = ""
    tag   = 1

    if comps[tag].startswith("@"):
        xref = comps[1]
        tag   = 2

    value = tag + 1

    if comps[tag] in ("NAME", "GIVN", "ADDR", "ADR1", "ADR2", "PHON",
                      "NPFX", "NICK", "SPFX", "SURN", "NSFX", "FILE"):
        value = f"anonym{comps[tag]}-{index}"
        index += 1
        sys.stdout.write(f"{level} {xref}{comps[tag]} {value}\n")

    else:
        sys.stdout.write(line)

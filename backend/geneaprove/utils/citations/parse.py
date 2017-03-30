#!/usr/bin/env python
"""
This file parses the output of
   wget http://jytangledweb.org/genealogy/evidencestyle/esm_templates.txt
"""

from string import Template
import re

f = file("esm_templates.txt")
contents = f.read().replace("\r", "").splitlines()

def process(line):
    """Extract the citation from the given line"""
    return contents[line].replace("[", "{") \
            .replace("]", "}") \
            .replace("'", "\\'") \
            .title()


out = file("evidence_style.py", "w")

out.write("from style import Citation_Style\n")
out.write("evidence_style = {\n")

line = 0
while line < len(contents):
    if contents[line].startswith("#"):
        line += 1
    else:
        descr = contents[line]
        line += 1

        biblio = process(line) # list or bibliographic style
        line += 1

        # Full or full footnote or endnote style. This is the style to use in
        # reports the first time a particular reference is cited.
        full = process(line)
        line += 1

        # Short footnote or endnote style for subsequent citations of a reference.
        short = process(line)
        line += 1

        (identifier, category, title) = descr.split("|")

        subst = dict(identifier=identifier,
                     category=category,
                     title=title,
                     biblio=biblio,
                     full=full,
                     short=short)

        out.write("\n")
        out.write(Template("   '$identifier': Citation_Style(\n").substitute(subst))
        out.write(Template("       category='$category',\n").substitute(subst))
        out.write(Template("       type='$title',\n").substitute(subst))
        out.write(Template("       biblio='$biblio',\n").substitute(subst))
        out.write(Template("       full='$full',\n").substitute(subst))
        out.write(Template("       short='$short'),\n").substitute(subst))

out.write("}\n")

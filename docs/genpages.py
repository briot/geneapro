#!/usr/bin/env python

"""Quick and dirty hack to generate web pages from a common framework.
   We do not use Jekyll or other facilities provides by github, so this
   is a quick replacement
"""

import os, re

framework = file ("templates/framework.thtml").read()

BLOCK_START_RE = re.compile("<% block (\w+) %>")
SETVAR_RE = re.compile("<% var (\w+) (\w+) %>")
IF_FILE_RE = re.compile("\s*<% if file (.+) %>")
IF_VAR_RE = re.compile("\s+<% ifvar (\w+) (\w+) %>")

def process_template(f):
    """Process the .thtml file 'f' and merge it into the framework"""

    blocks = dict()
    blockend = "@#@#@"
    vars = dict()
    blockname = ""

    # Process specific template, to declare all variables

    for line in file(os.path.join("templates", f)).readlines():
        m = BLOCK_START_RE.match(line)  # at beginning of string
        if m:
            blockname = m.group(1)
            blockend = "<% endblock " + blockname + " %>"
            current_block = ""

        elif SETVAR_RE.match(line):
            m = SETVAR_RE.match(line)
            vars[m.group(1)] = m.group(2)

        elif line.startswith(blockend):
            blocks[blockname] = current_block
            blockname = ""

        elif blockname:
            current_block += line

    # Process conditions in framework

    content = ""
    condition = True

    for line in framework.splitlines():
        if IF_FILE_RE.match(line):
            m = IF_FILE_RE.match(line)
            condition = m.group(1) == f

        elif IF_VAR_RE.match(line):
            m = IF_VAR_RE.match(line)
            var = m.group(1)
            value = m.group(2)
            condition = vars.get(var, "") == value

        elif line.lstrip().startswith("<% else %>"):
            condition = not condition

        elif line.lstrip().startswith("<% endif %>"):
            condition = True

        elif condition:
            content += line
            content += "\n"

    # substitute blocks

    for key, value in blocks.iteritems():
        content = re.sub("<%% %s %%>" % key, value, content)

    # Remove blocks that were not found
    content = re.sub("<% (\w+) %>", "", content)

    file (os.path.splitext(f)[0] + ".html", "w").write (content)


for html in [f for f in os.listdir("templates") if f.endswith(".thtml")]:
    if html != "framework.thtml":
        process_template(html)


#!/usr/bin/env python

import os
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysites.settings")
from django.core.management import execute_from_command_line

# If there is no database, create an empty one

if not os.path.isfile("geneaprove.db"):
    print "======================="
    print "Creating a new database"
    print "======================="
    execute_from_command_line(["manage.py", "syncdb", "--noinput"])
    execute_from_command_line(["manage.py", "loaddata", "geneaprove/initial_data.json"])

execute_from_command_line([sys.argv[0], "runserver", "8000"])

#!/usr/bin/env python

import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "mysites.settings")
    from django.core.management import execute_from_command_line
    from django.conf import settings
    
    # If there is no database, create an empty one
    
    db = settings.DATABASES['default']['NAME']
    if not os.path.isfile(db):
        print(f"=======================")
        print(f"Creating a new database {db}")
        print(f"=======================")
        try:
            os.makedirs(os.path.dirname(db))
        except OSError:
            pass

        # Apply all migrations to get the most up-to-date database.
        # Migrations are created with:
        #    ./manage.py makemigrations geneaprove
        # (possibly after changing the schema in geneaprove/models/)
        execute_from_command_line(["manage.py", "migrate"])
        #execute_from_command_line(
        #    ["manage.py", "migrate", "geneaprove", "zero"])

        f = os.path.join('geneaprove/initial_data.json')
        execute_from_command_line(["manage.py", "loaddata", f])
    
    execute_from_command_line([sys.argv[0], "runserver", "8000"])

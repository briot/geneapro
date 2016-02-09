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
        print "======================="
        print "Creating a new database %s" % db
        print "======================="
        os.makedirs(os.path.dirname(db))
        execute_from_command_line(["manage.py", "syncdb", "--noinput"])

        f = os.path.join(settings.STATIC_ROOT, 'geneaprove/initial_data.json')
        execute_from_command_line(["manage.py", "loaddata", f])
    
    execute_from_command_line([sys.argv[0], "runserver", "8000"])

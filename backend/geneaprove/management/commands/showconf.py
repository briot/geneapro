"""
Provides new commands to ./manage.py
"""

import appdirs
import os
import sys
from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    """Show the configuration"""

    help = 'Show configuration details'
    label = ''
    args = ''

    def handle(self, **options):
        sys.stdout.write(
            "path=%s\n" % (
                settings.DATABASES['default']['NAME'],))
        sys.stdout.write(
            "dir=%s\n" % (
                os.path.dirname(settings.DATABASES['default']['NAME']),))

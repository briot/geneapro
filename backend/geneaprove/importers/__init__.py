"""
This module provides importers from various formats into our
own data model.
Importing is done with two layers:
   - One layer parses the actual physical file and generates events for the
     upper layer
   - The upper layer convers from one data model to ours. Most software use
     the Gedcom data model internally (with some variations), even though
     they might not save as gedcom by default.
The advantage here is to avoid code duplication for all those cases where we
need to convert from a Gedcom model to our own model.
"""

from django.utils.translation import ugettext as _
import logging

logger = logging.getLogger('geneaprove.importers')


class ImporterMetaClass(type):

    """Meta class for importers, which ensures that all importers declared
       in the source are automatically registered"""
    def __new__(mcs, name, bases, attrs):
        super_new = type.__new__
        parents = [b for b in bases if isinstance(b, ImporterMetaClass)]
        if not parents:
            # Don't do anything for Importer itself, only for its subclasses
            return super_new(mcs, name, bases, attrs)

        # module = attrs.pop('__module__')
        new_class = super_new(mcs, name, bases, attrs)
        # meta = attrs.pop('Meta', None)

        # displayName = getattr(meta, 'displayName', name)
        # descr = getattr(meta, 'description', "")
        # abstract = getattr(meta, "abstract", False)
        # if not abstract:
        #     # ??? Should register the new importer somehow
        #     pass

        return new_class


class Importer(object):

    """
    Import from an instance of file (so that we can also import from memory
    using python's adapters). Such importers are automatically registered so
    that the user can select them in a list and import from them.
    A subclass Meta can be defined in the class to provide various attributes:
    displayName (a string): name that appears in the menu
    description (a string): description of the importer
    abstract (a boolean): if True, do not register this class
    """

    __metaclass__ = ImporterMetaClass

    def parse(self, filename):
        """Import data from _filename_ into our data model"""
        pass

    def error(self, message):
        # pylint: disable=no-self-use
        """Report an error to the user"""
        logger.error(message)

from django.db import models
import django.utils.timezone
from .base import GeneaProveModel


class Persona(GeneaProveModel):
    """
    Contains the core identification for individuals. Such individuals
    are grouped into group to represent a real individual. A persona
    really represents some data about an individual found in one source
    (when we are sure all attributes apply to the same person)
    """

    name = models.TextField(db_column='name')
    # The name as found in the source document.
    # The name will be displayed exactly as such in the GUI. Any name property
    # (which distinguishes given name, surname,...) is extra, detailed
    # information that only shows on the Persona page.
    
    description = models.TextField(null=True)
    # Additional data to distinguish the person among other homonyms

    last_change = models.DateTimeField(default=django.utils.timezone.now)
    # The last change date will be computed as the date of the most recent
    # assertion that applies to the person.

    def __str__(self):
        return 'Persona<%d,%d>' % (self.id, self.name)

    class Meta:
        """Meta data for the model"""
        db_table = "persona"


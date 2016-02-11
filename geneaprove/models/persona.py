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

    name = models.TextField()
    description = models.TextField(null=True)
    last_change = models.DateTimeField(default=django.utils.timezone.now)

    def __unicode__(self):
        return self.name

    class Meta:
        """Meta data for the model"""
        db_table = "persona"

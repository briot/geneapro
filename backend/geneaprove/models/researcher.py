from django.db import models
from .base import GeneaProveModel


class Researcher(GeneaProveModel):
    """
    A researcher is a person who gathers data or made assertions
    """

    name = models.CharField(max_length=100)
    comment = models.TextField(
        null=True,
        help_text="Contact information for this researcher, like email"
           + " or postal addresses,...")

    def __str__(self):
        return self.name

    class Meta:
        """Meta data for the model"""
        db_table = "researcher"

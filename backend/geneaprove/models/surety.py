from django.db import models
from .base import GeneaProveModel


class Surety_Scheme(GeneaProveModel):
    """
    A surety scheme describes how certain a researcher is of the data that
    was gathered. Different projects and researchers might be using different
    surety schemes. Some people want to use the notion of primary and
    secondary sources, others prefer original or derivative material. Yet
    others might prefer percentages...
    The possible values in a scheme are described through a Surety_Scheme_Part
    """

    name = models.CharField(max_length=100)
    description = models.TextField(null=True)

    def __str__(self):
        return self.name

    class Meta:
        """Meta data for the model"""
        db_table = "surety_scheme"


class Surety_Scheme_Part(GeneaProveModel):
    """
    An element of a Surety_Scheme
    """

    scheme = models.ForeignKey(Surety_Scheme, related_name="parts", on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)
    sequence_number = models.IntegerField(default=1)

    def __str__(self):
        return self.name

    class Meta:
        """Meta data for the model"""
        ordering = ('sequence_number', 'name')
        db_table = "surety_scheme_part"

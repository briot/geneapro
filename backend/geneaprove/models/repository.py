from django.db import models

from .base import GeneaProveModel
from .place import Place


class Repository_Type (GeneaProveModel):
    """
    The various kinds of repositories
    """

    name = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name

    class Meta:
        """Meta data for the model"""
        ordering = ("name", )
        db_table = "repository_type"


class Repository(GeneaProveModel):
    """
    Contains information about the place where data was found. Most
    fields from the gentech model were grouped into the info field.
    A repository might also be a person you interviewed one or more times
    """

    place = models.ForeignKey(Place, null=True, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    type = models.ForeignKey(Repository_Type, null=True, on_delete=models.CASCADE)
    info = models.TextField(null=True)
    addr = models.TextField(null=True)

    class Meta:
        """Meta data for the model"""
        db_table = "repository"

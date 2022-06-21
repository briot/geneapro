from django.db import models
import django.utils.timezone
from .base import GeneaProveModel
from typing import Optional


class Persona(GeneaProveModel):
    """
    Contains the core identification for individuals. Such individuals
    are grouped to represent a real individual. A persona
    really represents some data about an individual found in one source
    (when we are sure all attributes apply to the same person)
    """
    id: int

    description = models.TextField(null=True)
    # Additional data to distinguish the person among other homonyms

    last_change = models.DateTimeField(default=django.utils.timezone.now)
    # The last change date will be computed as the date of the most recent
    # assertion that applies to the person.

    birthISODate: Optional[str] = None     # precomputed via extended_personas
    deathISODate: Optional[str] = None     # precomputed via extended_personas
    marriageISODate: Optional[str] = None  # precomputed via extended_personas
    sex: Optional[str] = None              # precomputed via extended_personas
    generation: Optional[int] = None       # precomputed via PedigreeData

    main_id: int
    main = models.ForeignKey(
        "self", null=True, on_delete=models.CASCADE,
        db_index=True, related_name="personas")
    # personas are grouped (via a P2P "same as") to build persons. This field
    # is a cache: all personas that make up the same person will point to the
    # same main_id. Every time a "same as" link is created, we will have to
    # recompute this field.
    # This is left to null for one persona per full person. All personas point
    # to a persona with a null main_id.

    def __repr__(self):
        return f'Persona({self.id})'

    def __str__(self):
        return f'<Persona id={self.id}>'

    class Meta:
        """Meta data for the model"""
        db_table = "persona"

    def to_json(self):
        result = {
            'id': self.id,
        }
        if self.description:
            result['description'] = self.description
        if self.birthISODate is not None:
            result['birthISODate'] = self.birthISODate
        if self.deathISODate is not None:
            result['deathISODate'] = self.deathISODate
        if self.marriageISODate is not None:
            result['marriageISODate'] = self.marriageISODate
        if self.sex is not None:
            result['sex'] = self.sex
        if self.generation is not None:
            result['generation'] = self.generation

        return result

from django.db import models
import django.utils.timezone
from .base import GeneaProveModel


class Persona(GeneaProveModel):
    """
    Contains the core identification for individuals. Such individuals
    are grouped to represent a real individual. A persona
    really represents some data about an individual found in one source
    (when we are sure all attributes apply to the same person)
    """

    display_name = models.TextField(db_column="name")
    # The name as found in the source document.
    # The name will be displayed exactly as such in the GUI. Any name property
    # (which distinguishes given name, surname,...) is extra, detailed
    # information that only shows on the Persona page.

    description = models.TextField(null=True)
    # Additional data to distinguish the person among other homonyms

    last_change = models.DateTimeField(default=django.utils.timezone.now)
    # The last change date will be computed as the date of the most recent
    # assertion that applies to the person.

    birthISODate = None    # string, precomputed via extended_personas
    deathISODate = None    # string, precomputed via extended_personas
    marriageISODate = None # string, precomputed via extended_personas
    sex = None             # string, precomputed via extended_personas
    generation = None      # int, precomputed via PedigreeData

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
        return f'Persona({self.id},{self.display_name})'

    def __str__(self):
        return f'<Persona id={self.id} name={self.display_name}>'

    class Meta:
        """Meta data for the model"""
        db_table = "persona"

    def to_json(self):
        result = {
            'id': self.id,
            'display_name': self.display_name,
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

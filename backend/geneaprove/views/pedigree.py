"""
Various views related to displaying the pedgree of a person graphically
"""

from django.db import transaction
from ..sql import PersonSet, Relationship
from .styles import Styles
from .to_json import JSONView
import logging

logger = logging.getLogger('geneaprove.pedigree')


class PedigreeData(JSONView):
    """Return the data for the Pedigree or Fanchart views."""

    @transaction.atomic
    def get_json(self, params, id):
        logger.debug('get pedigree data')

        id = int(id)
        theme_id = int(params.get("theme", -1))

        persons = PersonSet(styles=Styles(theme_id, decujus=id))
        persons.add_folks(
            person_id=id,
            relationship = Relationship.ANCESTORS,
            max_depth=int(params.get("gens", 5)),
            skip=int(params.get("gens_known", 0)))
        persons.add_folks(
            person_id=id,
            relationship = Relationship.DESCENDANTS,
            max_depth=int(params.get("descendant_gens", 1)),
            skip=int(params.get("desc_known", 0)))
        persons.fetch_p2e()

        if theme_id >= 0:
            persons.fetch_p2c()  # for custom styles

        result = persons.to_json()
        result['decujus'] = persons.get_from_id(id).main_id
        return result

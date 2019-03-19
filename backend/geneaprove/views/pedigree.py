"""
Various views related to displaying the pedgree of a person graphically
"""

from geneaprove import models
from django.db import transaction
from geneaprove.utils.date import DateRange
from geneaprove.views.styles import Styles
from geneaprove.views.queries import PersonSet
from geneaprove.views.related import JSONResult
from geneaprove.views.to_json import JSONView, to_json
import logging

logger = logging.getLogger('geneaprove.pedigree')


class PedigreeData(JSONView):
    """Return the data for the Pedigree or Fanchart views."""

    @transaction.atomic
    def get_json(self, params, id):
        logger.debug('get pedigree data')

        theme_id = int(params.get("theme", -1))

        persons = PersonSet(styles=Styles(theme_id, decujus=id))
        persons.add_ancestors(
            person_id=id,
            max_depth=int(params.get("gens", 5)),
            skip=int(params.get("gens_known", 0)))
        persons.add_descendants(
            person_id=id,
            max_depth=int(params.get("descendant_gens", 1)),
            skip=int(params.get("desc_known", 0)))
        persons.fetch_p2e()

        if theme_id >= 0:
            persons.fetch_p2c()  # for custom styles

        result = persons.to_json()
        result['decujus'] = persons.get_from_id(id).main_id
        return result

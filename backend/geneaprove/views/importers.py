from geneaprove.importers.gedcomimport import GedcomFileImporter
from .to_json import JSONView
from .queries import PersonSet
import logging

logger = logging.getLogger('geneaprove.importers')


class GedcomImport(JSONView):

    def post_json(self, params):
        files = params.files.getlist('file')
        errors = []
        success = True

        for f in files:
            suc, err = GedcomFileImporter().parse(f)
            if err:
                errors.append(err)
            success = success and suc

        PersonSet.recompute_main_ids()

        return {'error': "\n\n".join(errors), 'success': success}

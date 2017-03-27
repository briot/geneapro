from geneaprove.importers.gedcomimport import GedcomFileImporter
from geneaprove.views.graph import graph
from geneaprove.views.to_json import JSONView

class GedcomImport(JSONView):

    def post_json(self, params):
        files = params.FILES.getlist('file')
        errors = []
        success = True

        for f in files:
            suc, err= GedcomFileImporter().parse(f)
            if err:
                errors.append(err)
            success = success and suc

        graph.mark_as_invalid()   # Will need a refresh
        return {'error': "\n\n".join(errors), 'success': success}

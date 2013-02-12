
from django.shortcuts import redirect, render_to_response
from django.template import RequestContext
from geneaprove.views.pedigree import pedigree_view
from geneaprove.importers.gedcomimport import GedcomFileImporter
from geneaprove.views.graph import graph

def import_gedcom(request):
    try:
        data = request.FILES['file']
    except KeyError:
        return redirect('/')

    success, errors = GedcomFileImporter().parse(data)

    graph.mark_as_invalid()   # Will need a refresh

    return render_to_response(
        'geneaprove/importer.html',
        {'error': errors,
         'success': success},
        context_instance=RequestContext(request))

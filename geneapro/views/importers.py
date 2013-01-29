
from django.shortcuts import redirect, render_to_response
from django.template import RequestContext
from geneapro.views.pedigree import pedigree_view
from geneapro.importers.gedcomimport import GedcomFileImporter
from geneapro.views.graph import graph

def import_gedcom(request):
    try:
        data = request.FILES['file']
    except KeyError:
        return redirect('/')

    success, errors = GedcomFileImporter().parse(data)

    graph.mark_as_invalid()   # Will need a refresh

    return render_to_response(
        'geneapro/importer.html',
        {'error': errors,
         'success': success},
        context_instance=RequestContext(request))

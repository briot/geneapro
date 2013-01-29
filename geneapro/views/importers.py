
from django.shortcuts import redirect, render_to_response
from django.template import RequestContext
from geneapro.views.pedigree import pedigree_view
from geneapro.importers.gedcomimport import GedcomFileImporter

def import_gedcom(request):
    try:
        data = request.FILES['file']
    except KeyError:
        return redirect('/')

    success, errors = GedcomFileImporter().parse(data)
    return render_to_response(
        'geneapro/importer.html',
        {'error': errors,
         'success': success},
        context_instance=RequestContext(request))

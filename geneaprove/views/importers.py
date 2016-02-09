
from django.shortcuts import redirect
from django.http import HttpResponse
from geneaprove.importers.gedcomimport import GedcomFileImporter
from geneaprove.views.graph import graph
from geneaprove.views.to_json import to_json
import json


def import_gedcom(request):
    # params = json.loads(request.body)  # parse angularJS JSON parameters
    try:
        data = request.FILES['file']
        success, errors = GedcomFileImporter().parse(data)
        graph.mark_as_invalid()   # Will need a refresh
        resp = {'error': errors, 'success': success}
    except KeyError:
        resp = {'error': 'No file specified', 'success': False}

    return HttpResponse(to_json(resp), content_type='application/json')

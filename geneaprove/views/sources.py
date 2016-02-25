"""
Source-related views
"""

import os
from django.conf import settings
from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from geneaprove.views.to_json import to_json
from geneaprove import models
from geneaprove.views.queries import sql_in
from geneaprove.utils.date import DateRange
from geneaprove.views.graph import graph
from geneaprove.utils.citations import Citations


def get_source(id):
    """
    Get source information for a single source.
    This also gets information for related fields like repositories
    and researcher.
    :param int id: the id of the source to get, or -1 for a new source
    """

    if id == -1:
        s = models.Source()

        # ??? Should get the researcher from the logged person
        s.researcher = models.Researcher.objects.get(id=1)
        return s

    else:
        return models.Source.objects.select_related(
            'repositories', 'researcher').get(pk=id)


def citation_model(request, id):
    """
    Return the citation model for a given id
    """
    citation = Citations.get_citation(id)
    data = {
        'biblio': citation.biblio,
        'full': citation.full,
        'short': citation.short
    }
    return HttpResponse(to_json(data), content_type='application/json')


def citation_models(request):
    """
    Return the list of all known citation models
    """
    data = {
        'repository_types': models.Repository_Type.objects.all(),
        'source_types': Citations.source_types()
    }
    return HttpResponse(to_json(data), content_type='application/json')


def citation(request, id):
    """
    Return the citation parts for the given source id
    """
    id = int(id)
    source = get_source(id)
    data = {
        'parts':   source.get_citations_as_list()
    }
    return HttpResponse(to_json(data), content_type='application/json')


def view(request, id):
    """View a specific source"""

    id = int(id)
    source = get_source(id)
    data = {
        'source':  source,
        'asserts': source.get_asserts(),
        'repr':    source.get_representations(),
    }
    return HttpResponse(to_json(data), content_type='application/json')


def editCitation(request, source_id):
    """
    Perform some changes in the citation parts for a source, and returns a
    JSON similar to view():
        {source: ...,  parts: ... }
    """
    source_id = int(source_id)

    if source_id == -1:
        src = create_empty_source()
    else:
        src = models.Source.objects.get(id=source_id)

    if request.method == 'POST':
        new_type = request.POST.get('sourceMediaType')

        src.parts.all().delete()

        if src.medium != new_type:
            parts = Citations.get_citation(new_type).required_parts()
        else:
            parts = None

        for key, value in request.POST.iteritems():
            if key in ('csrfmiddlewaretoken', 'sourceId'):
                continue
            elif key == 'medium':
                # Only set the medium if different from the parent. Otherwise,
                # leave it null, so that changing the parent also changes the
                # lower level sources
                if src.higher_source is None or src.higher_source.medium != value:
                    src.medium = value
                else:
                    src.medium = None
            elif key == 'comments':
                src.comments = value
            elif key == 'abbrev':
                src.abbrev = value
            elif key == 'biblio':
                src.biblio = value
            elif key == 'title':
                src.title = value
            elif key == 'subject_date':
                src.subject_date = value
            elif key == 'subject_place':
                pass
                # src.subject_place = value
            elif key == 'jurisdiction_place':
                pass
                #src.jurisdiction_place = value
            elif key == 'higher_source_id':
                src.higher_source_id = int(value)
            elif key[0] == '_':
                raise Exception('Field not processed: %s' % key)
            elif value and (parts is None or key in parts):
                # A citation part
                try:
                    type = models.Citation_Part_Type.objects.get(name=key)
                except models.Citation_Part_Type.DoesNotExist:
                    type = models.Citation_Part_Type.objects.create(name=key)
                    type.save()

                p = models.Citation_Part(type=type, value=value)
                src.parts.add(p)

        medium = src.compute_medium()
        if medium:
            parts = {k: v[0]   # discard the from_higher information
                     for k, v in src.higher_source.get_citations().iteritems()}
            for k, v in request.POST:
                parts[k] = v

            c = Citations.get_citation(medium).cite(
                parts, unknown_as_text=False)
            src.biblio = c.biblio
            src.title = c.full
            src.abbrev = c.short

        src.save()

    return view(request, id=src.id)


def view_list(request):
    """View the list of all sources"""

    sources = models.Source.objects.order_by('abbrev', 'title')
    return HttpResponse(
        to_json(sources),
        content_type='application/json')


def representations(request, id):
    id = int(id)
    source = get_source(id)
    data = {
        'source':  source,
        'repr':    source.get_representations()
    }
    return HttpResponse(to_json(data), content_type='application/json')


def add_repr(request, id):
    """
    Adding a new representation to a source.
    """

    id = int(id)
    source = get_source(id)

    files = request.FILES['file']
    if not isinstance(files, list):
        files = [files]

    dir = os.path.join(settings.MEDIA_ROOT, 'S%s' % id)
    try:
        os.makedirs(dir)
    except OSError:
        pass

    for f in files:
        # Find a unique name
        name = os.path.join(dir, f.name)
        index = 1
        while os.path.isfile(name):
            name, ext = os.path.splitext(name)
            if index == 1:
                name = '%s_%s%s' % (name, index, ext)
            else:
                name = '%s_%s%s' % (name[0:name.rfind('_')], index, ext)
            index += 1

        w = open(name, "w")
        for c in f.chunks():
            w.write(c)
        w.close

        r = models.Representation.objects.create(
            source=source,
            mime_type=f.content_type,
            file=name)
        r.save()

    return HttpResponse(
        to_json(True),
        content_type='application/json')


def del_repr(request, source_id, repr_id):
    """
    Deleting a representation from a source
    """
    ondisk = request.GET.get('ondisk', False)

    error = ""
    repr = models.Representation.objects.get(id=int(repr_id))
    if ondisk:
        try:
            os.unlink(repr.file)
        except:
            error = "Could not delete %s" % (repr.file)

    repr.delete()

    return HttpResponse(
        to_json(dict(error=error)),
        content_type='application/json')

"""
Source-related views
"""

from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from geneaprove.views.to_json import to_json
from geneaprove import models
from geneaprove.views.queries import sql_in
from geneaprove.utils.date import DateRange
from geneaprove.views.graph import graph
from geneaprove.utils.citations import Citations


class Fact(object):

    """Describes a fact extracted from an assertion"""

    __slots__ = ("surety", "rationale", "disproved", "date",
                 "subject1_url", "subject2_url",
                 "subject1", "subject2",
                 "subject2_type",
                 "place", "parts")
    TYPE_PERSON = 0
    TYPE_EVENT = 1
    TYPE_CHARACTERISTIC = 2

    def __init__(self, surety, rationale, disproved, date, place,
                 subject1, subject2):
        """
        :param subject1:
            A tuple (type, info*)
        :param subject2:
            A tuple (type, info*)

        where info is one or more elements depending on the type.
            (TYPE_EVENT, event, role)
            (TYPE_CHARACTERISTIC, characteristic, parts)
            (TYPE_PERSON, persona)
        """

        self.surety = surety
        self.rationale = rationale
        self.date = date
        self.place = place
        self.disproved = disproved
        self.subject1 = subject1
        self.subject2 = subject2


def extended_sources(ids, schemes):
    """Return a dict of Source instances, with extra attributes
       :param schemes:
           Either None or a set. If specified, it will contain the set of
           surety schemes necessary to represent the assertions.
    """

    assert(isinstance(ids, list))
    assert schemes is None or isinstance(schemes, set)

    sources = dict()  # id -> Source

    for s in sql_in(models.Source.objects.select_related(
            "repositories", "researcher"),
            "id", ids):
        sources[s.id] = s
        s.asserts = []

    # Assertions deducted from this source

    p2e = models.P2E.objects.select_related()
    for c in sql_in(p2e, "source", ids):
        f = Fact(
            surety=c.surety,
            rationale=c.rationale,
            date=c.event.date and DateRange(c.event.date),
            place=c.event.place and c.event.place.name,
            disproved=c.disproved,
            subject1=(Fact.TYPE_PERSON, c.person),
            subject2=(Fact.TYPE_EVENT,
                      c.event,
                      c.role.name))
        sources[c.source_id].asserts.append(f)

        if schemes is not None:
            schemes.add(c.surety.scheme_id)

    p2c = models.P2C.objects.select_related()
    for c in sql_in(p2c, "source", ids):
        parts = []
        for p in models.Characteristic_Part.objects.filter(
                characteristic=c.characteristic).select_related():
            parts.append((p.type.name, p.name))

        f = Fact(
            surety=c.surety,
            rationale=c.rationale,
            date=c.characteristic.date and DateRange(c.characteristic.date),
            place=c.characteristic.place and c.characteristic.place.name,
            disproved=c.disproved,
            subject1=(Fact.TYPE_PERSON, c.person),
            subject2=(Fact.TYPE_CHARACTERISTIC,
                      c.characteristic,
                      parts))
        sources[c.source_id].asserts.append(f)

        if schemes is not None:
            schemes.add(c.surety.scheme_id)

    return sources


def prepare_citation_parts(src, parts):
    """
    :param parts: a dictionary (key,value) giving overriding values to some
       of the citation parts.
    :return: a dictionary (key,value) for the citation parts of src and its
       higher sources. It is modified in place.
    """
    result = {}
    while src:
        for part in src.parts.select_related('type__name').all():
            if part.value:
                result[part.type.name] = part.value
        src = src.higher_source

    for k, v in parts.iteritems():
        result[k] = v
    return result


def list_of_citations(medium, src=None):
    """
    :param medium: the id of the mediaType
    :param src: an instance of models.Source, or None
    :return: a list of all the parts of the source citation. This
       includes the parts that are set explicitly in the database, as well as
       the parts that are necessary for a complete citation of the full (as
       driven by the style templates).
       This also returns various attributes of the source itself, starting with
       '_'.
       The result is a list of tuples (part_name, value, from_higher) where
       from_parent is true when this citation part comes from a higher level
       source.
    """

    medium = medium or src.compute_medium()
    result = dict()
    for part in Citations.get_citation(medium).required_parts():
        result[part] = ('', False)

    if src is not None:
        for k, v in prepare_citation_parts(src.higher_source, {}).iteritems():
            result[k] = (v, True)

        for part in src.parts.select_related('type__name').all():
            result[part.type.name] = (part.value, False)

        result['_biblio'] = (src.biblio, False)
        result['_title'] = (src.title, False)
        result['_abbrev'] = (src.abbrev, False)
        result['_medium'] = (medium, False)
        result['_notes'] = (src.comments, False)
        # result['_lastAccess'] = (src.last_change, False)
        # result['_subjectPlace'] = (src.subject_place.name, False)
        # result['_jurisdictionPlace'] = (src.jurisdiction_place.name, False)

    return sorted((k, v[0], v[1]) for k, v in result.iteritems())


def citationParts(request, medium):
    """
    Return the list of citation parts needed for this medium.
    :param medium: either the id of the mediaType, or the id of a source.
    """
    if medium.isdigit():
        src = models.Source.objects.get(id=medium)
        result = list_of_citations(None, src)
    else:
        result = list_of_citations(medium)
    return HttpResponse(to_json(result), content_type="application/json")


def fullCitation(request):
    """
    Compute the full citation, given the parts. This does not edit the
    database.
    :return: a dictionary of 'full', 'short' and 'biblio'.
    """
    result = {}

    if request.method == 'POST':
        medium = request.POST.get('sourceMediaType')
        params = request.POST

        if request.POST.get('_higherSource'):
            higher = models.Source.objects.get(
                id=int(request.POST.get('_higherSource')))
            params = prepare_citation_parts(higher, request.POST)

        result = Citations.get_citation(medium).cite(params)
    return HttpResponse(to_json(result), content_type="application/json")


def view(request, id):
    """View a specific source"""

    id = int(id)

    graph.update_if_needed()
    if len(graph) == 0:
        return render_to_response(
            'geneaprove/firsttime.html',
            context_instance=RequestContext(request))

    schemes = set()  # The surety schemes that are needed
    sources = extended_sources([id], schemes=schemes)

    surety_schemes = dict()
    for s in schemes:
        surety_schemes[s] = models.Surety_Scheme.objects.get(id=s).parts.all()

    return render_to_response(
        'geneaprove/sources.html',
        {"s": sources[id],
         "parts": to_json(list_of_citations(None, sources[id])),
         "repository_types": models.Repository_Type.objects.all(),
         "source_types":   Citations.source_types(),
         "schemes": surety_schemes,
         },
        context_instance=RequestContext(request))


def editCitation(request, source_id):
    """
    Perform some changes in the citation parts for a source, and returns a
    JSON with the list of parts and their values.
    """
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
            elif key == 'sourceMediaType':
                # Only set the medium if different from the parent. Otherwise,
                # leave it null, so that changing the parent also changes the
                # lower level sources
                if src.higher_source is None or src.higher_source.medium != value:
                    src.medium = value
                else:
                    src.medium = None
            elif key == '_notes':
                src.comments = value
            elif key == '_abbrev':
                src.abbrev = value
            elif key == '_biblio':
                src.biblio = value
            elif key == '_title':
                src.title = value
            elif key == '_subjectDate':
                src.subject_date = value
            elif key == '_subjectPlace':
                pass
                # src.subject_place = value
            elif key == '_jurisdictionPlace':
                pass
                #src.jurisdiction_place = value
            elif key in ('_repoName', '_repoType', '_repoAddr'):
                # ??? Not handled yet
                pass
            elif key == '_higherSource':
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
            params = prepare_citation_parts(src.higher_source, request.POST)
            c = Citations.get_citation(medium).cite(
                params, unknown_as_text=False)
            src.biblio = c.biblio
            src.title = c.full
            src.abbrev = c.short

        src.save()

    return HttpResponse(
        to_json(list_of_citations(src.medium, src)),
        content_type="application/json")


def view_list(request):
    """View the list of all sources"""

    sources = models.Source.objects.order_by('abbrev', 'title')
    return HttpResponse(
        to_json(sources),
        content_type='application/json')

"""
Source-related views
"""

from django.shortcuts import render_to_response
from django.http import HttpResponse
from django.template import RequestContext
from geneaprove.views.json import to_json
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

        self.surety    = surety
        self.rationale = rationale
        self.date      = date
        self.place     = place
        self.disproved = disproved
        self.subject1  = subject1
        self.subject2  = subject2


def extended_sources(ids, schemes):
    """Return a dict of Source instances, with extra attributes
       :param schemes:
           Either None or a set. If specified, it will contain the set of
           surety schemes necessary to represent the assertions.
    """

    assert(isinstance(ids, list))
    assert schemes is None or isinstance(schemes, set)

    sources = dict() # id -> Source

    for s in sql_in(models.Source.objects.select_related(
                         "repositories", "researcher"),
                    "id", ids):
        sources[s.id] = s
        s.citations = []
        s.asserts = []

    # ??? Should include parent source's citations
    for c in sql_in(models.Citation_Part.objects.select_related("type"),
                    "source", ids):
        sources[c.source_id].citations.append(c)

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


def list_of_citations(src):
    """
    :param src: an instance of models.Source
    :return: a list of all the parts of the source citation. This
       includes the parts that are set explicitly in the database, as well as
       the parts that are necessary for a complete citation of the full (as
       driven by the style templates).
       This also returns various attribtes of the source itself, starting with
       '_'.
    """

    result = dict()

    for part in Citations.get_citation(src.medium).required_parts():
        result[part] = ''

    result['_title'] = src.title
    result['_abbrev'] = src.abbrev
    result['_medium'] = src.medium
    result['_notes'] = src.comments
    result['_subjectDate'] = src.subject_date
    # result['_subjectPlace'] = src.subject_place.name
    # result['_jurisdictionPlace'] = src.jurisdiction_place.name

    for part in src.parts.select_related('type__name').all():
        result[part.type.name] = part.value

    return sorted((k, v) for k, v in result.iteritems())


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

    return render_to_response (
        'geneaprove/sources.html',
        {"s": sources[id],
         "parts": to_json(list_of_citations(sources[id])),
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
            # Changing the medium: we should not preserve citation parts that
            # are no longer used for the new type. The GUI has temporary saved
            # them and can restore them if the user immediately choses to go
            # back to the previous value.
            parts = Citations.get_citation(new_type).required_parts()
        else:
            parts = None

        for key, value in request.POST.iteritems():
            if key in ('csrfmiddlewaretoken', 'sourceId'):
                continue
            elif key == 'sourceMediaType':
                src.medium = value
            elif key == '_notes':
                src.comments = value
            elif key == '_abbrev':
                src.abbrev = value
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

        if src.medium and src.medium != 'unknown':
            c = Citations.get_citation(src.medium).cite(src)
            src.title = c.full
            src.abbrev = c.short

        src.save()

    return HttpResponse(
        to_json(list_of_citations(src)), content_type="application/json")


def source_list(request):
    """View the list of all sources"""
    return None

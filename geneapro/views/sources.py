"""
Source-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from geneapro import models
from geneapro.views.queries import sql_in
from geneapro.utils.date import DateRange
from geneapro.views.graph import graph


class Fact(object):
    """Describes a fact extracted from an assertion"""

    __slots__ = ("surety", "value", "rationale", "disproved", "date",
                 "subject1_url", "subject2_url",
                 "subject1", "subject2",
                 "subject2_type",
                 "place", "parts")
    TYPE_PERSON = 0
    TYPE_EVENT = 1
    TYPE_CHARACTERISTIC = 2

    def __init__(self, surety, value, rationale, disproved, date, place,
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
        self.value     = value
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
                         "medium", "repositories", "researcher"),
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
            value=c.value,
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
            value=c.value,
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


def view(request, id):
    """View a specific source"""

    id = int(id)

    graph.update_if_needed()
    if len(graph) == 0:
        return render_to_response(
            'geneapro/firsttime.html',
            context_instance=RequestContext(request))

    schemes = set()  # The surety schemes that are needed
    sources = extended_sources([id], schemes=schemes)

    surety_schemes = dict()
    for s in schemes:
        surety_schemes[s] = models.Surety_Scheme.objects.get(id=s).parts.all()

    return render_to_response (
        'geneapro/sources.html',
        {"s": sources[id],
         "repository_types": models.Repository_Type.objects.all(),
         "source_mediums":   models.Source_Medium.objects.all(),
         "schemes": surety_schemes,
        },
        context_instance=RequestContext(request))


def source_list(request):
    """View the list of all sources"""
    return None

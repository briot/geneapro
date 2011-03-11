"""
Source-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from mysites.geneapro import models
from mysites.geneapro.views.queries import sql_in
from mysites.geneapro.utils.date import Date, DateRange


class Fact(object):
    """Describes a fact extracted from an assertion"""

    __slots__ = ("surety", "value", "rationale", "disproved", "date",
                 "subject1_url", "subject2_url",
                 "subject1", "subject2", "place", "parts")

    def __init__(self, surety, value, rationale, disproved, date, place,
                 subject1, subject2, subject1_url=None,
                 subject2_url=None, parts=None):
        self.surety    = surety
        self.value     = value
        self.rationale = rationale
        self.date      = date
        self.place     = place
        self.parts     = parts
        self.disproved = disproved
        self.subject1  = subject1
        self.subject1_url = subject1_url
        self.subject2  = subject2
        self.subject2_url = subject2_url


def extended_sources(ids):
    """Return a dict of Source instances, with extra attributes"""

    assert(isinstance(ids, list))

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
            surety=c.surety.name,
            value=c.value,
            rationale=c.rationale,
            date=c.event.date and DateRange(c.event.date),
            place=c.event.place and c.event.place.name,
            disproved=c.disproved,
            subject1=c.person.name,
            subject1_url="/persona/%d" % c.person.id,
            subject2="%s (%s)" % (c.event.name, c.role.name))
        sources[c.source_id].asserts.append(f)

    p2c = models.P2C.objects.select_related()
    for c in sql_in(p2c, "source", ids):
        parts = []
        for p in models.Characteristic_Part.objects.filter(characteristic=c.characteristic) \
                 .select_related():
            parts.append((p.type.name, p.name))

        f = Fact(
            surety=c.surety.name,
            value=c.value,
            rationale=c.rationale,
            date=c.characteristic.date and DateRange(c.characteristic.date),
            place=c.characteristic.place and c.characteristic.place.name,
            parts=parts,
            disproved=c.disproved,
            subject1=c.person.name,
            subject1_url="/persona/%d" % c.person.id,
            subject2="")
        sources[c.source_id].asserts.append(f)

    return sources


def view(request, id):
    """View a specific source"""

    id = int(id)

    s = extended_sources([id])

    return render_to_response (
        'geneapro/sources.html',
        {"s": s[id],
         "repository_types": models.Repository_Type.objects.all(),
         "source_mediums":   models.Source_Medium.objects.all(),
        },
        context_instance=RequestContext(request))

    return None


def source_list(request):
    """View the list of all sources"""
    return None

"""
Source-related views
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from mysites.geneapro import models
from mysites.geneapro.views.queries import sql_in


class Fact(object):
    """Describes a fact extracted from an assertion"""

    __slots__ = ("surety", "value", "rationale", "disproved",
                 "subject1", "subject2")

    def __init__(self, surety, value, rationale, disproved,
                 subject1, subject2):
        self.surety    = surety
        self.value     = value
        self.rationale = rationale
        self.disproved = disproved
        self.subject1  = subject1
        self.subject2  = subject2


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
            disproved=c.disproved,
            subject1=c.person.name,
            subject2="%s (%s)" % (c.event.name, c.role.name)
        )
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

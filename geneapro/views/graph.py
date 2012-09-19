"""
Handles merging of personas.
"""


from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from geneapro import models
from geneapro.views.custom_highlight import style_rules
from geneapro.views.styles import Styles
from geneapro.views.tree import Tree, SameAs
from geneapro.views.queries import sql_in
from geneapro.views.persona import extended_personas
import heapq
import datetime
from geneapro.utils.graphs import Digraph


class Persona_node(object):
    """A persona from the genealogy"""

    def __init__(self, ids, name):
        """
        Creates a new node to be stored in a graph.
        Such a node represents a physical person, possibly constructed from
        several personas. The ids set should indicate one or more database
        ids for the personas. More can be added later.
        
        The name is for debugging purposes only
        """

        assert isinstance(ids, set)

        self.ids = ids
        self.name = name

        # When viewing the database as a Quilts diagram, persons are organized
        # into layers.
        self.quilts_layer = -1

    def _graphlabel(self):
        return "%s-%s" % (",".join("%s" % p for p in self.ids), self.name)


class P2P_Link(object):
    """A link between two personas"""

    KIND_FATHER = 0   # from is FATHER of to
    KIND_MOTHER = 1   # from is MOTHER of to
    KIND_SPOUSE = 2   # from and to are spouses (married or not)
    KIND_SAME_AS = 3  # from and to are the same physical person

    def __init__(self, fromP, toP, kind):
        self.fromP = fromP
        self.toP = toP
        self.kind = kind

    def __getitem__(self, idx):
        if idx == 0:
            return self.fromP
        elif idx == 1:
            return self.toP
        else:
            raise TypeError

    def _graphlabel(self):
        return ""


class GeneaGraph(Digraph):
    """
    A graph that represents various relationships between people in the
    database. It does not contain all the info from the database, but should be
    thought mostly as an index into the database, allowing us to find which
    persons are needed for a query.
    """

    def __init__(self):
        super(GeneaGraph, self).__init__()

        # Fast mapping from database id to graph nodes.
        # There can be multiple ids mapping to the same node, when all the ids
        # represent the same physical person.
        self.__nodes = dict()

    def node_from_id(self, id):
        return self.__nodes[id]

    def from_db(self):
        """Create a graph from the data in the db"""

        self.__nodes = dict()   # id -> Persona()

        sameas = dict()  # id -> [set of persona ids]

        #####
        # Group same-as personas into a single node.

        query = models.P2P.objects.filter(
            type=models.P2P.sameAs, disproved=False)
        for p in query.values_list('person1', 'person2'):
            p0 = sameas.get(p[0], None)
            p1 = sameas.get(p[1], None)
            if p0 is None:
                if p1 is None:
                    sameas[p[0]] = sameas[p[1]] = set((p[0], p[1]))
                else:
                    sameas[p[0]] = p1
                    p1.add(p[0])
            else:
                if p1 is None:
                    sameas[p[1]] = p0
                    p0.add(p[1])
                else:
                    p0.update(p1)  # merge both groups
                    sameas[p[1]] = p0

        ######
        # Create nodes for all the persona from the database

        for p in models.Persona.objects.values_list('id', 'name'):
            same = sameas.get(p[0], set((p[0], )))  # a set of persona ids
            pa = Persona_node(ids=same, name=p[1])

            for s in same:
                self.__nodes[s] = pa

            self.add_node(pa)

        ######
        # Relationship between person through events

        p2e = models.P2E.objects.filter(
            event__type__in=(models.Event_Type.birth, ),
            disproved=False,
            role__in=(models.Event_Type_Role.principal,
                      models.Event_Type_Role.birth__father,
                      models.Event_Type_Role.birth__mother))
        events = dict()  # id -> (child, father, mother)

        for p in p2e.values_list('person', 'event', 'role'):
            t = events.get(p[1], (None, None, None))
            if p[2] == models.Event_Type_Role.principal:
                events[p[1]] = (p[0] or t[0], t[1], t[2])
            elif p[2] == models.Event_Type_Role.birth__father:
                events[p[1]] = (t[0], p[0] or t[1], t[2])
            elif p[2] == models.Event_Type_Role.birth__mother:
                events[p[1]] = (t[0], t[1], p[0] or t[2])

        for e in events.itervalues():
            if e[0] is not None and e[1] is not None:
                self.add_edge(P2P_Link(
                        fromP=self.node_from_id(e[1]),
                        toP=self.node_from_id(e[0]),
                        kind=P2P_Link.KIND_FATHER))
            if e[0] is not None and e[2] is not None:
                self.add_edge(P2P_Link(
                        fromP=self.node_from_id(e[2]),
                        toP=self.node_from_id(e[0]),
                        kind=P2P_Link.KIND_MOTHER))
            if e[1] is not None and e[2] is not None:
                self.add_edge(P2P_Link(
                        fromP=self.node_from_id(e[1]),
                        toP=self.node_from_id(e[2]),
                        kind=P2P_Link.KIND_SPOUSE))

    def ancestor_edges(self, node):
        """
        Iterate all "ancestor" edges for a node, ie return the genealogical
        parents of the persona.
        """
        for e in self.in_edges(node):
            if e.kind in (P2P_Link.KIND_FATHER, P2P_Link.KIND_MOTHER):
                yield e

    def children_edges(self, node):
        """
        Iterate all "children" edges for a node, ie return the genealogical
        parents of the persona.
        """
        for e in self.out_edges(node):
            if e.kind in (P2P_Link.KIND_FATHER, P2P_Link.KIND_MOTHER):
                yield e

    def set_layers(self):
        """Assign layers to each persona in the graph, so that the following
           requirements are correct:
              - a person is in a layer strictly greater than its children
              - spouses are preferably in the same layer, unless this doesn't
                match the first requirement.
              - layers group persons born within the same period, unless it
                contradicts the above requirements. This is used to classify
                independent personas.
        """

        e1 = self.node_from_id(438)

        for n in self.breadth_first_search(
            roots=[e1],
            edgeiter=self.ancestor_edges,
            direction=Digraph.DIRECTION_INCOMING):

            print self.node_label(n).encode("utf-8") 

        print list(
            self.node_label(n) 
            for n in self.breadth_first_search(
                roots=[e1],
                edgeiter=self.children_edges,
                direction=Digraph.DIRECTION_OUTGOING))


def view(request):
    g = GeneaGraph()
    g.from_db()
    #g.export(file("graph.pickle", "w"))
    #g.write_graphviz(file("graph.dot", "wb"))

    g.set_layers()


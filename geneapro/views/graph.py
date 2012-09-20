"""
Handles merging of personas.
"""


from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.http import HttpResponse
from geneapro import models
from geneapro.views import json
from geneapro.views.custom_highlight import style_rules
from geneapro.views.styles import Styles
from geneapro.views.tree import Tree, SameAs
from geneapro.views.queries import sql_in
from geneapro.views.persona import extended_personas
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

        self.sex = '?'   # or 'M' or 'F'

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

        # Quilts layers. Each element is a sorted list of the nodes in the given
        # layer

        self.layers = dict()

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
            if p[0] not in self.__nodes:
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


        # Sex of the persons
        #    SELECT p2c.person, characteristic_part.name
        #      FROM p2c, characteristic_part
        #     WHERE p2c.characteristic=characteristic_part.characteristic
        #       AND characteristic_part.type = 1

        query = ("SELECT %(cp_id)s, %(cp_name)s, %(p2c_person)s AS person"
                 " FROM %(p2c)s, %(cp)s"
                 " WHERE %(cp_type)s=%(val)d AND %(p2c_char)s=%(cp_char)s") % {
                    "p2c": models.sql_table_name(models.P2C),
                    "cp":  models.sql_table_name(models.Characteristic_Part),
                    "p2c_person": models.sql_field_name(models.P2C, "person"),
                    "p2c_char": models.sql_field_name(
                         models.P2C, "characteristic"),
                    "cp_id": models.sql_field_name(
                         models.Characteristic_Part, "pk"),
                    "cp_name": models.sql_field_name(
                         models.Characteristic_Part, "name"),
                    "cp_type": models.sql_field_name(
                         models.Characteristic_Part, "type"),
                    "cp_char": models.sql_field_name(
                         models.Characteristic_Part, "characteristic"),
                    "val": models.Characteristic_Part_Type.sex}

        for c in models.Characteristic_Part.objects.raw(query):
            self.node_from_id(c.person).sex = c.name

    def parent_edges(self, node):
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

    def nodes_with_no_ancestors(self):
        """
        All nodes with no genealogical parent.
        """

        for n in self:
            no_ancestor = True
            for e in self.in_edges(n):
                if e.kind in (P2P_Link.KIND_FATHER, P2P_Link.KIND_MOTHER):
                    no_ancestor = False
                    break
            if no_ancestor:
                yield n

    def spouses(self, node):
        """
        return the nodes representing the spouses of node.
        """

        for e in self.out_edges(node):
            if e.kind == P2P_Link.KIND_SPOUSE:
                yield e[1]
        for e in self.in_edges(node):
            if e.kind == P2P_Link.KIND_SPOUSE:
                yield e[0]

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
        
        # Traverse the tree so that children are seen before their parents.
        # Start assigning layers from those childre, and propagate to the
        # parents. This will not result in the best partioning. For instance,
        # the following tree is numbered based on the order of traversal by the
        # dfs algorithm. In parenthesis are the layers assigned by the
        # algorithm:
        #
        #                           N11(5)
        #        N7(4)  N8(4)    N10(4)
        #            N6(3)     N9(3)
        #              \    /
        #                N5(2)
        #               /   \
        #             N1(0)  N4(1)
        #                   /   \
        #                  N2(0)  N3(0)
        #
        # This satisfies the requirement that layer of children < layer of
        # parents. But N1 and N4 should ideally be on the same layer

        layers_count = 0

        for node in self.depth_first_search(
            roots=list(self.nodes_with_no_ancestors()),
            edgeiter=self.children_edges,
            direction=Digraph.DIRECTION_OUTGOING):

            layer = 0
            for c in self.children(node, edgeiter=self.children_edges):
                layer = max(layer, c.quilts_layer)

            node.quilts_layer = layer + 1
            layers_count = max(layers_count, layer + 1)

        # Now a second traversal, similar to the one above. But we now check
        # the parent's layer, and chose for the child the maximum of its
        # current layer and that of the parent's - 1. This fixes the layer of
        # N1. At the same time, we prepare a structure containing the nodes in
        # each layer, so that we can later organize them within their layers.

        self.layers = dict()
        for lay in range(0, layers_count + 1):
            self.layers[lay] = []

        for node in self.depth_first_search(
            roots=list(self.nodes_with_no_ancestors()),
            edgeiter=self.children_edges,
            direction=Digraph.DIRECTION_OUTGOING):

            # ??? Could look at the spouse relationships too, to try and
            # put them in the same layer.

            min_parents = layers_count
            for c in self.parents(node, edgeiter=self.parent_edges):
                min_parents = min(min_parents, c.quilts_layer)
            node.quilts_layer = max(node.quilts_layer, min_parents - 1)

            self.layers[node.quilts_layer].append(node)

        # A database could be made up of several independent trees. For
        # instance, the user might have registered "possible ancestors" that
        # make up a separate subgraph. The above two passes have layered the
        # nodes within each subgraph. We now need a separate pass to align the
        # various subgraphs. The following requirements should be met:
        #    * spouses should preferably be on the same layer. This should
        #      already be the case if they have children in common, but not
        #      otherwise since we have ignored the SPOUSE relationships.
        #    * each layer should include people mostly of the same generation.
        #      ??? Hard to define precisely.

        pass

        # Now organize the nodes withing each layer, by grouping spouses as
        # much as possible, then grouping children of the same parents
        # together. We also want to reduce the length of links between the
        # layers (so that for instance the first persons in a layer should be
        # linked to the first persons in the next layer).

        pass

    def json(self, id=None, maxdepth=-1):
        """
        Return a json structure that can be sent to the GUI.

        :param id: an integer
            If specified, only the persons related to id will be displayed.

        :param maxdepth: an integer or -1
            The maximum number of generations before and after id to look at.
            This is ignored if id is unspecified.
        """

        to_match = None

        if id is not None:
            e1 = self.node_from_id(id)

            # Also the spouse(s) of e1
            ids = [e1]
            ids.extend(self.spouses(e1))

            to_match = set(self.breadth_first_search(
                    roots=ids,
                    maxdepth=maxdepth,
                    edgeiter=self.parent_edges,
                    direction=Digraph.DIRECTION_INCOMING))
            to_match.update(self.breadth_first_search(
                    roots=ids,
                    maxdepth=maxdepth,
                    edgeiter=self.children_edges,
                    direction=Digraph.DIRECTION_OUTGOING))

        result = []
        for lay in sorted(self.layers.keys()):
            result.append(
                [(min(n.ids), n.name.encode("utf-8"), n.sex)
                 for n in self.layers[lay]
                 if to_match is None or n in to_match])

        return json.to_json(result, year_only=True)


def view(request):
    g = GeneaGraph()
    g.from_db()
    #g.export(file("graph.pickle", "w"))
    #g.write_graphviz(file("graph.dot", "wb"))

    g.set_layers()

    return render_to_response(
        'geneapro/quilts.html',
        {"data": g.json(id=1, maxdepth=3)},
        context_instance=RequestContext(request))


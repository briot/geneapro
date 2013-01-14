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

    def __repr__(self):
        return self.name.encode("utf-8")

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

        # What is the generation for each person in the graph ?
        self.__layers = dict()

        # Whether the database has been modified since the graph was created.
        self.__needs_update = True

    def node_from_id(self, id):
        return self.__nodes[id]

    def update_if_needed(self):
        """Create a graph from the data in the db"""

        if not self.__needs_update:
            return

        self.__needs_update = False
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

        # Assign layers.
        # We override the iterators so that children have lower layers than
        # their parents (which is more natural in genealogy).

        self.layers__ = self.rank_longest_path(
            roots=list(self.nodes_with_no_children()),
            outedgesiter=self.in_edges,  # include spouses
            inedgesiter=self.out_edges,  # include spouses
            preferred_length=self.preferred_length)
        self.check_ranking()

    def check_ranking(self):
        print "SLOW: checking whether the ranking is valid"
        for e in self.edges():
            if (self.layers__[e[0]] <
                self.layers__[e[1]] + self.preferred_length(e)):
                print "Invalid edge %s [%d] --[%s]--> %s [%d]" % (
                    e[0].name.encode("utf-8"),
                    self.layers__[e[0]],
                    e.kind,
                    e[1].name.encode("utf-8"),
                    self.layers__[e[1]])

    def in_parent_edges(self, node):
        """
        Iterate all "ancestor" edges for a node, ie return the genealogical
        parents of the persona.
        """
        for e in self.in_edges(node):
            if e.kind in (P2P_Link.KIND_FATHER, P2P_Link.KIND_MOTHER):
                yield e

    def out_children_edges(self, node):
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

    def nodes_with_no_children(self):
        """
        All nodes with no genealogical parent.
        """

        for n in self:
            no_children = True
            for e in self.out_edges(n):
                if e.kind in (P2P_Link.KIND_FATHER, P2P_Link.KIND_MOTHER):
                    no_children = False
                    break
            if no_children:
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

    def preferred_length(self, edge):
        return 0 if edge.kind == P2P_Link.KIND_SPOUSE else 1

    def compute_families(self, subset=None):
        """
        Compute the list of families that include nodes from the subset (or
        all the families in the database if subset is None).
        Returns a tuple of two data structures:
           * the list of families (tuples of nodes)
        """

        tmp = dict()  # families: (father,mother,child1,child2,...)
                      # indexed on (father, mother)

        for n in (subset or self):
            father = mother = None

            for e in self.in_edges(n):
                if e.kind == P2P_Link.KIND_FATHER:
                    if subset is None or e[0] in subset:
                        father = e[0]
                elif e.kind == P2P_Link.KIND_MOTHER:
                    if subset is None or e[0] in subset:
                        mother = e[0]

            if father is not None or mother is not None:
                d = tmp.get((father, mother), None)
                if d is None:
                    d = tmp[(father, mother)] = [mother, father]
                d.append(n)

        return tmp.values()

    def sort_families(self, layers, families):
        """
        Sort the families, so that they are organized by layer. A family is
        associated with its right-most layer (in general to the left of the
        layer that contains the children). Within each layer, the families are
        sorted in the order in which they should be displayed in the matrix --
        so for instance the first family should involve the first person of the
        layer to limit crossings of links.
        """

        byLayer = dict()   # Contains list of families
        for index in range(0, len(layers)):
            # make sure each layer has at least an empty list
            byLayer[index] = []

        for family in families:
            rightMostLayer = min(
                self.layers__[p] for p in family if p is not None)
            byLayer[rightMostLayer + 1].append(family)

        # ??? Should be computed independently
        indexInLayer = dict()
        for layer in layers:
            for index, node in enumerate(layer):
                indexInLayer[node] = index

        result = []
        for r in byLayer.itervalues():
            # Sort the families within each layer. If one of the parents is in
            # another layer, we want that marriage to appear first.
            r.sort(
                key=lambda family:
                (-max(self.layers__[family[0]] if family[0] else 0,
                     self.layers__[family[1]] if family[1] else 0),
                 min(indexInLayer.get(family[0], -1),
                     indexInLayer.get(family[1], -1))))

            # Pass the ids of the family members, not the nodes
            result.append(
                [map(lambda node: min(node.ids) if node else -1,
                     family)
                 for family in r])

        return result

    def json(self, subset=None):
        """
        Return a json structure that can be sent to the GUI.

        :param id: an integer
            If specified, only the persons related to id will be displayed.

        :param maxdepth: an integer or -1
            The maximum number of generations before and after id to look at.
            This is ignored if id is unspecified.
        """

        families = self.compute_families(subset=subset)
        layers = self.get_layers(layers=self.layers__, subset=subset)
        self.sort_nodes_within_layers(
            layers,
            outedgesiter=self.out_children_edges)
        families = self.sort_families(layers, families)

        result = []
        for lay in layers:
            result.append(
                [(min(n.ids), n.name.encode("utf-8"), n.sex)
                 for n in lay])

        return {"data": json.to_json(result, year_only=True),
                "families": families}

    def people_in_tree(self, id, maxdepth=-1, spouses_tree=False):
        """
        Return a set of nodes for id and all persons in his tree (ancestors
        or descendants, up to maxdepth layers in each direction).

        :param id: either the id of a person, or a list of such ids. Their
          ancestors and descendants are returned.
        :param spouses_tree: If True, also include the ancestors and
          descendants of the spouses of id.

        """

        if isinstance(id, int):
            ids = set([self.node_from_id(id)])
        else:
            ids = set(self.node_from_id(n) for n in id)

        if spouses_tree:
            # call to list() here freezes the nodes we traverse
            for id in list(ids):
                ids.update(self.spouses(id))

        to_match = set(self.breadth_first_search(
                roots=ids,
                maxdepth=maxdepth,
                edgeiter=self.in_parent_edges))
        to_match.update(self.breadth_first_search(
                roots=ids,
                maxdepth=maxdepth,
                edgeiter=self.out_children_edges))
        return to_match


# Global graph, shared by all threads and views.
# ??? This is obviously potentially dangerous, and relies on having views
# that modify the database reset the graph. We also need to make sure that
# a single thread at a time is using the graph at the same time.

graph = GeneaGraph()


def quilts_view(request, decujus=None):
    # ??? Should lock the graph until the view has been generated

    graph.update_if_needed()

    if decujus is not None:
        subset = graph.people_in_tree(
            id=int(decujus), maxdepth=3, spouses_tree=True)
    else:
        subset = None

    #graph.export(file("graph.pickle", "w"))
    #graph.write_graphviz(file("graph.dot", "wb"))
    #graph.write_graphviz(file("genea.dot", "w"),
    #                 edgeiter=g.out_children_edges)

    return render_to_response(
        'geneapro/quilts.html',
        graph.json(subset),
        context_instance=RequestContext(request))

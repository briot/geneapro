"""
Handles merging of personas.
"""


from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.http import HttpResponse
from geneaprove import models
from geneaprove.views.to_json import to_json
from geneaprove.views.custom_highlight import style_rules
from geneaprove.views.styles import Styles
from geneaprove.views.queries import sql_in
import datetime
from geneaprove.utils.graphs import Digraph


class Persona_node(object):

    """A persona from the genealogy"""

    def __init__(self, ids, name, different):
        """
        Creates a new node to be stored in a graph.
        Such a node represents a physical person, possibly constructed from
        several personas. The ids set should indicate one or more database
        ids for the personas. More can be added later.

        The name is for debugging purposes only

        :param different:
            The set of ids that have been proven not to represent the same
            physical person.
        """

        assert isinstance(ids, set)

        self.ids = ids
        self.name = name
        self.different = different
        self.sex = '?'   # or 'M' or 'F'
        self.__main_id = min(self.ids)

    @property
    def main_id(self):
        """
        Return one of the ids representing the person. It can be used at any
        time to retrieve the person.
        """
        return self.__main_id

    def __repr__(self):
        # return "%s-%s" % (self.main_id, self.name.encode("utf-8"))
        return "%s" % (self.main_id, )

    def _graphlabel(self):
        return "%s-%s" % (",".join("%s" % p for p in sorted(self.ids)), self.name)


class P2P_Link(object):

    """A link between two personas"""

    KIND_FATHER = 0   # from is FATHER of to
    KIND_MOTHER = 1   # from is MOTHER of to
    KIND_SPOUSE = 2   # from and to are spouses (married or not)

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

    def __repr__(self):
        return "%s-%s->%s" % (self.fromP, self.kind, self.toP)

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

        # Whether the database has been modified since the graph was created.
        self.__needs_update = True

    def node_from_id(self, id):
        return self.__nodes[id]

    def mark_as_invalid(self):
        self.__needs_update = True

    def update_if_needed(self):
        """Create a graph from the data in the db"""

        if not self.__needs_update:
            return

        self.__needs_update = False
        self.__nodes = dict()   # id -> Persona()

        sameas = dict()  # id -> [set of persona ids]
        different = dict()  # id -> [set of persona ids, disproved]

        #####
        # Group same-as personas into a single node.

        def add_to_dict(d, id0, id1):
            p0 = d.get(id0, None)
            p1 = d.get(id1, None)
            if p0 is None:
                if p1 is None:
                    d[id0] = d[id1] = set((id0, id1))
                else:
                    d[id0] = p1
                    p1.add(id0)
            else:
                if p1 is None:
                    d[id1] = p0
                    p0.add(id1)
                else:
                    p0.update(p1)  # merge both groups
                    d[id1] = p0

        query = models.P2P.objects.filter(type=models.P2P.sameAs)
        for p in query.values_list('person1', 'person2', 'disproved'):
            add_to_dict(different if p[2] else sameas, p[0], p[1])

        ######
        # Create nodes for all the persona from the database

        for p in models.Persona.objects.values_list('id', 'name'):
            if p[0] not in self.__nodes:
                same = sameas.get(p[0], set((p[0], )))  # a set of persona ids
                diff = different.get(p[0], set())
                pa = Persona_node(ids=same, name=p[1], different=diff)

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

    def children(self, node_or_id):
        """
        Return the list of children for this node.
        """
        if isinstance(node_or_id, models.Persona):
            node_or_id = self.node_from_id(node_or_id.id)
        elif not isinstance(node_or_id, Persona_node):
            node_or_id = self.node_from_id(node_or_id)
        return [e[1]
                for e in self.out_edges(node_or_id)
                if e.kind in (P2P_Link.KIND_MOTHER,
                              P2P_Link.KIND_FATHER)]

    def mothers(self, node_or_id):
        """
        return the nodes representing the possible mothers of node.
        There could be multiple results.
        """
        if isinstance(node_or_id, models.Persona):
            node_or_id = self.node_from_id(node_or_id.id)
        elif not isinstance(node_or_id, Persona_node):
            node_or_id = self.node_from_id(node_or_id)
        return [e[0]
                for e in self.in_edges(node_or_id)
                if e.kind == P2P_Link.KIND_MOTHER]

    def fathers(self, node_or_id):
        """
        return the nodes representing the possible father of node.
        There could be multiple results.
        """
        if isinstance(node_or_id, models.Persona):
            node_or_id = self.node_from_id(node_or_id.id)
        elif not isinstance(node_or_id, Persona_node):
            node_or_id = self.node_from_id(node_or_id)
        return [e[0]
                for e in self.in_edges(node_or_id)
                if e.kind == P2P_Link.KIND_FATHER]

    def json(self, subset=None):
        """
        Return a json structure that can be sent to the GUI.

        :param id: an integer
            If specified, only the persons related to id will be displayed.

        :param maxdepth: an integer or -1
            The maximum number of generations before and after id to look at.
            This is ignored if id is unspecified.
        """

        def __compute_families(graph, layers, layers_by_id):
            """
            Compute the list of families that include nodes from tmp.

            Sort the families, so that they are organized by layer. A family is
            associated with its right-most layer (in general to the left of the
            layer that contains the children). Within each layer, the families are
            sorted in the order in which they should be displayed in the matrix --
            so for instance the first family should involve the first person of the
            layer to limit crossings of links.

            :param graph:
                a subset of the original graph, which only includes the nodes
                we are interested in, and only the parent/child relations.
            :param layers:
                A list of list of persons, indicating the persons at each layer.
                For instance:   [[person_at_gen0], [person_at_gen1, ...], ...]
            :param layers_by_id:
                for each person, its layer.
            :return: a list of list of tuples (father,mother,child1,child2,...)
            """

            tmp = dict()  # families: (father,mother,child1,child2,...)
            # indexed on (father, mother)

            for n in graph:
                father = mother = None

                for e in graph.in_edges(n):
                    if e.kind == P2P_Link.KIND_FATHER:
                        father = e[0]
                    else:
                        mother = e[0]

                if father is not None or mother is not None:
                    tmp.setdefault(
                        (father, mother), [mother, father]).append(n)

            byLayer = dict()   # Contains list of families for each layer

            for family in tmp.itervalues():
                rightMostLayer = min(
                    layers_by_id[p] for p in family if p is not None)
                byLayer.setdefault(rightMostLayer + 1, []).append(family)

            # ??? Should be computed independently
            indexInLayer = dict()
            for layer in layers:
                for index, node in enumerate(layer):
                    indexInLayer[node] = index

            # Sort the families within each layer. If one of the parents is in
            # another layer, we want that marriage to appear first.

            mi = min(byLayer.iterkeys())
            ma = max(byLayer.iterkeys())

            result = []
            for lay in range(mi, ma + 1):
                r = byLayer.get(lay, [])
                r.sort(
                    key=lambda family:
                    (-max(layers_by_id[family[0]] if family[0] else 0,
                          layers_by_id[family[1]] if family[1] else 0),
                     min(indexInLayer.get(family[0], -1),
                         indexInLayer.get(family[1], -1))))

                # Pass the ids of the family members, not the nodes
                result.append(
                    [map(lambda node: min(node.ids) if node else -1,
                         family)
                     for family in r])

            return result

        # Prepare a temporary graph: it is used to subset the list of nodes
        # to those specified in argument, and the list of edges to the
        # parent/child relationships

        tmp = Digraph()
        for e in self.edges():
            if e.kind in (P2P_Link.KIND_MOTHER, P2P_Link.KIND_FATHER) and \
               e[0] in (subset or self) and \
               e[1] in (subset or self):

                tmp.add_edge(e)

        # Then organize nodes into layers

        #layers_by_id = tmp.rank_longest_path()
        layers_by_id = tmp.rank_minimize_dummy_vertices()

        layers = tmp.get_layers(layers_by_id=layers_by_id)
        print "MANU layers=%s" % (layers, )

        # Organize the nodes within layers
        tmp.sort_nodes_within_layers(layers)
        print "MANU sorted layers=%s" % (layers, )

        # Compute the families
        families = __compute_families(tmp, layers, layers_by_id)
        print "MANU sorted families=%s" % (families, )

        print "MANU graph=%s" % tmp

        result = []
        for lay in range(0, len(layers)):
            result.append(
                [(n.main_id, n.name.encode("utf-8"), n.sex)
                 for n in layers[lay]])

        # for index, l in enumerate(result):
        #    print "MANU layer[%d] = %s" % (index, sorted([p[0] for p in l]))
        return {"persons": to_json(result, year_only=True),
                "families": families}

    def people_in_tree(self, id, maxdepthAncestors=-1,
                       maxdepthDescendants=-1, spouses_tree=False,
                       distance=None):
        """
        Return a set of nodes for id and all persons in his tree (ancestors
        or descendants, up to maxdepth* layers in each direction).

        :param id: either the id of a person, or a list of such ids. Their
          ancestors and descendants are returned.
        :param spouses_tree: If True, also include the ancestors and
          descendants of the spouses of id.
        :param distance: if specified, it must be a dict(), which will
          associate the ancestor or descendant node with its distance (in
          generations) from id.
        :return: a set of nodes

        """

        if isinstance(id, Persona_node):
            ids = set([id])
        elif isinstance(id, int):
            ids = set([self.node_from_id(id)])
        else:
            ids = set(self.node_from_id(n) for n in id)

        if spouses_tree:
            # call to list() here freezes the nodes we traverse
            for id in list(ids):
                ids.update(self.spouses(id))

        to_match = set(self.breadth_first_search(
            roots=ids,
            maxdepth=maxdepthAncestors,
            distance=distance,
            edgeiter=self.in_parent_edges))
        to_match.update(self.breadth_first_search(
            roots=ids,
            maxdepth=maxdepthDescendants,
            distance=distance,
            edgeiter=self.out_children_edges))
        return to_match


# Global graph, shared by all threads and views.
# ??? This is obviously potentially dangerous, and relies on having views
# that modify the database reset the graph. We also need to make sure that
# a single thread at a time is using the graph at the same time.

graph = GeneaGraph()


def quilts_view(request, decujus=None):
    """
    :request_param decujus_tree:
        If True, only the persons in the decujus' tree are displayed,
        otherwise the whole contents of the datatabase is displayed.
    """

    decujus = int(decujus) if decujus is not None else 1
    decujus_tree = request.GET.get("decujus_tree", "true").lower() == "true"

    # ??? Should lock the graph until the view has been generated

    graph.update_if_needed()
    if len(graph) == 0:
        return render_to_response(
            'geneaprove/firsttime.html',
            context_instance=RequestContext(request))

    subset = None

    if decujus_tree:
        subset = graph.people_in_tree(
            id=decujus, maxdepthAncestors=-1, maxdepthDescendants=-1,
            spouses_tree=True)

    #graph.export(file("graph.pickle", "w"))
    #graph.write_graphviz(file("graph.dot", "wb"))
    # graph.write_graphviz(file("genea.dot", "w"),
    #                 edgeiter=g.out_children_edges)

    data = graph.json(subset)

    return render_to_response(
        'geneaprove/quilts.html',
        {"persons": data["persons"],
         "families": data["families"],
         "decujus_tree": decujus_tree,
         "decujus_name": "",
         "decujus": decujus},
        context_instance=RequestContext(request))

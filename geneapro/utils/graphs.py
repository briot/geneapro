"""
This package provides a graph datastructure and algorithms to manipulate it.
It is independent of geneapro itself.

Examples of use:

################
# Create a graph

> links = [("a", "b"), ("b", "c"), ("c", "d"),
           ("e", "g"), ("f", "g"), ("g", "h"),
           ("d", "h"), ("a", "e"), ("a", "f")]
> g = graphs.Digraph(edges=links)

######################
# Laying out the graph

> layers = g.rank_minimize_dummy_vertices()
> g.sort_nodes_within_layers(g.get_layers(layers))
   => [ ["a"], ["e", "f", "b"], ["g", "c"], ["d"], ["h"]]

   Which corresponds to a drawing like:
                         a
                       / |  \
                      e  f   b
                       \ |   |
                         g   c
                         |   |
                         |   d
                          \ /
                           h

"""

import pickle
import sys
import subprocess
import heapq


class Digraph(object):
    """A directed graph.
       Nodes can be of any hashable type (string, instances,...).
       Edges can be of any type so that  edge[0] and edge[1] are the two
       ends of the edge (deriving from tuple would achieve this purpose).
    """

    def __init__(self, nodes=None, edges=None):
        self.outedges = {}  # "node" -> set(edges)
        self.inedges = {}   # "node" -> set(edges)
        if nodes:
            self.add_nodes(nodes)
        if edges:
            self.add_edges(edges)

        self.__cyclic = None      # unknown
        self.__backedges = None  # only meaningful when cyclic, includes
                                  # edges to remove to break cycles

    def __len__(self):
        """
        Return the number of nodes in the graph.
        """
        return len(self.outedges)

    def isleaf(self, node):
        """
        Whether the given node is a leaf node (no out edges).
        """
        return not self.outedges[node]

    def isroot(self, node):
        """
        Whether the given node is a root node (no in edges).
        """
        return not self.inedges[node]

    def iscyclic(self):
        """
        Whether the graph has cycles
        """
        if self.__cyclic is None:
            for n in self.depth_first_search():
                pass

        return self.__cyclic

    def has_edge(self, source, target, outedgesiter=None):
        """
        Whether there is at least one edge from source to target.
        outedgesiter can be used to restrict the search to a subset of
        the edges outgoing from source.
        """
        #return not self.outedges[source].isdisjoint(self.inedges[target])

        if outedgesiter is None:
            outedgesiter = self.out_edges

        for e in outedgesiter(source):
            if e[1] == target:
                return True
        return False

    ###############
    # Editing graphs
    ###############

    def add_node(self, node):
        """
        Adds a new node to the graph.
        node can be of any hashable type.
        """

        if node in self.outedges:
            raise Exception("Node already exists in the graph")
        self.outedges[node] = set()
        self.inedges[node] = set()

    def add_edge(self, edge):
        """
        Adds an edge to the graph.
        An edge is any indexable type such that edge[0] and edge[1] are the
        ends of the edge. The nodes are created if they do not exist in the
        graph yet.
        """
        u = edge[0]
        v = edge[1]

        if u not in self.outedges:
            self.add_node(u)
        if v not in self.outedges:
            self.add_node(v)

        self.outedges[u].add(edge)
        self.inedges[v].add(edge)
        self.__cyclic = None  # unknown, needs to be computed again

    def remove_edge(self, edge):
        """
        Remove an edge from the graph.
        An edge is a tuple (from, to)
        """
        u = edge[0]
        v = edge[1]
        self.outedges[u].remove(edge)
        self.inedges[v].remove(edge)
        self.__cyclic = None  # unknown, needs to be computed again

    def remove_node(self, node):
        """
        Remove a node and all its edges from the graph
        """
        for edge in self.outedges[node]:
            self.inedges[edge[1]].remove(edge)
        for edge in self.inedges[node]:
            self.outedges[edge[0]].remove(edge)

        del self.outedges[node]
        del self.inedges[node]

    def add_nodes(self, nodelist):
        """
        Add given nodes to the graph
        :param nodelist: iterable of nodes to be added
        """
        for n in nodelist:
            self.add_node(n)

    def add_edges(self, edgelist):
        """
        Add given edges to the graph
        :param edgelist: iterable of (u, v) edges to add.
        """
        for n in edgelist:
            self.add_edge(n)

    def remove_nodes(self, nodelist):
        """
        Remove multiple nodes
        """
        for n in nodelist:
            self.remove_node(n)

    ###############
    # Sorting
    # The following functions provide support for sorting nodes and edges.
    # By default, they check if the node or edge has a _graphsortkey function.
    # Its result is used for the sorting. If the function doesn't exist, they
    # fallback on using the standard comparison functions for the types.
    # These can be overridden for the graph itself, which might be more
    # convenient that forcing the use of specific types for nodes and edges.
    ###############

    def _node_sortkey(self, node):
        try:
            return node._graphsortkey()
        except AttributeError:
            return edge

    def _edge_sortkey(self, edge):
        try:
            return edge._graphsortkey()
        except AttributeError:
            return edge

    ###############
    # Traversing a graph
    ###############

    def __iter__(self):
        """
        Iter over all nodes in the graph.
        """
        for n in self.outedges:
            yield n

    def sorted_nodes(self):
        """
        Iter over all nodes, in the order defined by the nodes' __cmp__
        function.
        """
        nodes = list(self.outedges)
        nodes.sort()
        return nodes

    def roots(self, nodes=None):
        """
        Iter over all root nodes in the graph:
        :param nodes: An iterable that returns the subset of nodes to
           analyze. This can be used also to force a specific order in the
           returned roots. The default is self.__iter__
        """
        if nodes is None:
            nodes = self.__iter__()

        for n in nodes:
            if self.isroot(n):
                yield n

    def leaves(self, nodes=None):
        """
        Iter over all leaf nodes
        """
        if nodes is None:
            nodes = self.__iter__()
        for n in nodes:
            if self.isleaf(n):
                yield n

    def breadth_first_search(self, roots, edgeiter=None,
                             maxdepth=-1):

        def bfs(seen, u, maxdepth):
            """Return all children of u, then their own children.
               Does not return u itself.
            """

            ends = []
            seen.add(u)
            for edge in edgeiter(u):
                e = edge[1] if edge[0] == u else edge[0]
                if e not in seen:
                    yield e
                    ends.append(e)
                    seen.add(e)

            if maxdepth != 0:
                for e in ends:
                    for d in bfs(seen, e, maxdepth - 1):
                        yield d

        if edgeiter is None:
            edgeiter = self.out_edges

        seen = set()

        for node in roots:
            if node not in seen:
                yield node
                for d in bfs(seen, node, maxdepth):
                    yield d

    def depth_first_search(self, roots=None, edgeiter=None):
        """
        Traverse the tree depth first search, and returns the children of
        a node before the node itself.
        Graph may be directed or undirected.

        :param roots: an iterable to indicate which nodes should be analyzed.
           depth_first_search will eventually return all nodes of the graph
           if roots returns at least the set of root nodes for the graph.
           However, it is also safe to return all nodes of the graph, and
           the result of depth_first_search is still sorted properly.

        :param edgeiter: a function to traverse all outedges of a node. This
           function takes one parameter, the node we are inspecting. The
           default is self.out_edges.

        :return: an iterator
        """

        def dfs(u, color):
            color[u] = 1  # GRAY

            # Since topological sort will reverse the list, we need to also
            # reverse the sort order so that the final order is that returned
            # by edgeiter

            for edge in reversed(list(edgeiter(u))):
                v = edge[1] if edge[0] == u else edge[0]
                c = color[v]
                if c == 0:   # WHITE
                    # predecessor[v] = u
                    for d in dfs(v, color):
                        yield d

                elif c == 1:  # GRAY
                    self.__backedges.add(edge)
                    self.__cyclic = True

            color[u] = 2  # BLACK
            yield u

        if roots is None:
            # An iterator
            roots = list(self.roots())
        else:
            # Here as well we want to preserve the user's sort, and topological
            # is going to reverse the final list.
            roots = reversed(list(roots))

        if edgeiter is None:
            edgeiter = self.out_edges

        self.__backedges = set()
        self.__cyclic = False
        color = {}    # WHITE/unvisited(0), GRAY/being processed(1) or BLACK(2)
        # predecessor = {}

        for node in self:
            color[node] = 0   # WHITE

        for node in roots:
            if color[node] == 0:   # WHITE
                for d in dfs(node, color):
                    yield d

    def topological_sort(self, roots=None, edgeiter=None):
        """
        Topological sorting of the graph. This is the list of nodes sorted
        such that the tail of each edge returned by edgeiter is returned
        before its head.

        roots is the list of nodes the search should start from. This can
        be used to restrict the nodes which will eventually be visited.
        If you want to have all nodes of the graph visited eventually,
        roots should be set to the list of nodes that are not the tail
        of any edge returned by edgeiter. The default is to use nodes that
        do not have any incoming edge at all, but this isn't suitable if
        edgeiter only looks at a subset of the edges for instance.

        This is only meaningful for directed acyclic graphs.
        """
        dfs = list(self.depth_first_search(
                roots=roots, edgeiter=edgeiter))
        dfs.reverse()
        return dfs

    def sorted_topological(self):
        """
        Same as topological sort, but the nodes are sorted so that however the
        graph was built, the order of nodes is always the same for two graphs
        containing the same edges. This is slower than topological_sort.
        """
        return self.topological_sort(
            roots=self.sorted_nodes(), edgeiter=self.sorted_edges)

    ################
    # Traversing a node's out edges
    ################

    def __getitem__(self, node):
        """
        Iterate all *nodes* that are the target of an edge outgoing from node.
        This is used as:
            for neighbor_node in self[node]:
        The edges are not sorted.
        """
        for edge in self.outedges[node]:
            yield edge[1]

    def out_edges(self, node):
        """
        Iterate all *edges* that are outgoing from node.
        """
        return self.outedges[node]

    def in_edges(self, node):
        """
        Iterate all *edges* that are incoming to node.
        """
        return self.inedges[node]

    def sorted_edges(self, node):
        """
        Returns all outgoing *edges* from node.
        Same as out_edges but sorts the edges (see the _edge_sortkey function).
        """
        return sorted(self.outedges[node], key=self._edge_sortkey)

    def children(self, node, edgeiter=None):
        """
        Iterate of all *nodes* that are the source of an edge incoming to node.
        """
        if edgeiter is None:
            edgeiter = self.out_edges

        return (edge[1] for edge in edgeiter(node))

    def parents(self, node, edgeiter=None):
        """
        Iterate of all *nodes* that are the source of an edge incoming to node.
        """
        if edgeiter is None:
            edgeiter = self.in_edges
        return [edge[0] for edge in edgeiter(node)]

    def sorted_parents(self, node):
        """
        Same as parents(), but sorts the edges before returning the nodes.
        """
        return [edge[0]
                for edge in sorted(self.inedges[node], key=self._edge_sortkey)]

    def backedges(self):
        """
        Return the back edges of the graph (ie the ones that created cycle in
        the depth-first search traversal). Removing those will make the graph
        acyclic.
        For a given cyclic graph, the set of backedges might be different from
        one time to the other.
        :return: a set of edges
        """
        if self.iscyclic():  # Also forces the computation if needed
            return self.__backedges
        else:
            return set()

    ##################
    # Support for input/output of graphs.
    ##################

    def export(self, file):
        """
        Dump the graph into file, so that it can later be imported again.
        """
        pickle.dump(self, file)

    @staticmethod
    def importFile(file):
        return pickle.load(file)

    ##################
    # Support for writing graphs and processing them through dot
    ##################

    def node_label(self, node):
        """
        Returns a label to represent the node in a graph.
        The default is to use the edge's _graphlabel function if it exists,
        and otherwise the edge's __str__ function.
        """
        try:
            return node._graphlabel()
        except AttributeError:
            return "%s" % node

    def edge_label(self, edge):
        """
        Returns the properties (for graphviz) to use for this edge.
        Returning None hides the edge.
        By default, it uses the edge's _graphlabel function if it exists.
        """
        try:
            return edge._graphlabel()
        except AttributeError:
            return ""

    def write_graphviz(
        self, file=sys.stdout, number_nodes=False, nodes=None,
        edgeiter=None):
        """
        Write a representation of the graph in a format suitable for graphviz.
        Nodes should define a __str__ function to represent their label.

        :param number_nodes: a boolean; if True, nodes are numbered in the
           order in which they were processed.
        :param nodes: an iterable for the nodes. If unspecified, the nodes are
           processed in any order. Otherwise, this can be used to force a
           specific order for the nodes.
        """

        file.write("digraph {compound=true; rankdir=LR;\n")

        if nodes is None:
            nodes = self.__iter__()

        if not edgeiter:
            edgeiter=self.out_edges

        for index, node in enumerate(nodes):
            label = self.node_label(node)
            if number_nodes:
                label = u"%d %s" % (index, label)
            s = u"n_%s [label=<%s>]\n" % (id(node), label)
            file.write(s.encode("utf-8"))

            for edge in edgeiter(node):
                label = self.edge_label(edge)
                if label is not None:
                    s = u"n_%s -> n_%s [%s]\n" % (
                        id(edge[0]), id(edge[1]), label)
                    file.write(s.encode("utf-8"))

        file.write("}\n")

    def graphviz(self, basename="output", format="pdf", number_nodes=False,
                 nodes=None):
        """Process the graph through graphviz"""

        dot = subprocess.Popen(
            ["dot", "-T%s" % format, "-o%s.%s" % (basename, format)],
            stdin=subprocess.PIPE)

        self.write_graphviz(
            file=dot.stdin, number_nodes=number_nodes, nodes=nodes)
        dot.stdin.close()

        status = dot.wait()
        if status != 0:
            raise Exception("Error when running dot, exit status=%d" % status)

    ##########
    # Layout #
    ##########

    def rank_longest_path(self, roots=None,
                          outedgesiter=None, inedgesiter=None,
                          preferred_length=lambda e: 1):
        """
        Split the nodes into layers, so that: the head of edges are in strictly
        higher layers than the tail.

        The two iterators should be symmetrical: outedgesiter is used to make
        sure the nodes are visited in the proper order internally, and
        inedgesiter are the ones used to satisfy the constraint above. So
        the head of all edges returned inedgesiter will be in a higher
        layer than their tails. outedgesiter should return the opposite
        edges.

        preferred_length can be used to return the preferred length of edges.
        1 means the head and the tail should preferrably be one generation
        apart.

        This is a rough (but fast) algorithm. It is possible that lots of
        edges span multiple layers. However, this initial sorting can then
        be used as a starting point for other enhanced algorithms.

           1 - Put each node on layer 1
           2 - Traverse the node in topological order.
           3 - For each node traversed, assign it the layer:
                layer(u) = max(layer(u), layer(v) + 1)
                 for each v in the outset of u.
        See:
          "Graph Drawing and Applications for Software and Knowledge Engineers"
           by Kozo Sugiyama,  p64

        :return: a dict mapping edges to their layers. It is guaranteed
           that the number of layers is equal to the longuest path in the
           graph (provided the graph is not cyclic), i.e. the height is
           optimal.
        """

        if not inedgesiter:
            inedgesiter = self.in_edges

        layers = dict()
        for n in self:
            layers[n] = 0
        for n in self.topological_sort(roots=roots, edgeiter=outedgesiter):
            for e in inedgesiter(n):
                end = e[0] if e[1] == n else e[1]
                layers[n] = max(layers[n], layers[end] + preferred_length(e))

        return layers

    def rank_minimize_dummy_vertices(self, roots=None,
                                     outedgesiter=None, inedgesiter=None,
                                     preferred_length=lambda e: 1):
        """
        Split the nodes into layers, similar to rank_with_longest_path.
        However, this algorithm also attempts to minimize the number of
        edges that span multiple years.

        This algorithm is described in:
            "A technique for Drawing Directed Graphs" (graphviz)
        """

        ranks = self.rank_longest_path(
            roots=roots, outedgesiter=outedgesiter, inedgesiter=inedgesiter,
            preferred_length=preferred_length)

        def feasible_tree():
            """
            Computes an initial feasible spanning tree. This is a spanning tree
            build while ignoring the direction of edges, and such that the
            length of each edge is greater or equal to its minimum length.
            """

            tree = set()             # nodes in the tree
            not_in_tree = set(self)  # nodes in graph but not in tree
            edges_from_tree = []     # possible edges from the tree nodes

            def add_node(n):
                try:
                    not_in_tree.remove(n)
                except:
                    pass

                tree.add(n)
                for e in outedgesiter(n):
                    if e[1] not in tree:
                        heapq.heappush(
                            edges_from_tree,
                            (ranks[e[1]] - ranks[e[0]] - preferred_length(e),
                             e))
                for e in inedgesiter(n):
                    if e[0] not in tree:
                        heapq.heappush(
                            edges_from_tree,
                            (ranks[e[1]] - ranks[e[0]] - preferred_length(e),
                             e))

            # Start with a random node
            for n in self:
                add_node(n)
                break

            while not_in_tree:
                while not edges_from_tree:
                    if not not_in_tree:
                        return
                    n = not_in_tree.pop()
                    add_node(n)

                slack, e = heapq.heappop(edges_from_tree)

                if e[0] in tree:
                    end = e[1]
                else:
                    slack = -slack
                    end = e[0]

                for v in tree:
                    ranks[v] += slack
                add_node(end)

        feasible_tree()

        # ??? Real algorithm from graphviz also computes cutpoints
        return ranks

    def get_layers(self, layers, subset=None):
        """
        Returns a list of layers, as sorted by rank_* above. Each element of
        the list is itself is a list of nodes that belong to that layer, in no
        particular order.

        :param subset: can be a set or list of nodes we want to classify. If
           unspecified, all the nodes of the graph are taken into account.
        :return: a list of list of nodes
        """

        # Create a temporary structure, so that we can skip empty layers
        tmp = dict()
        for n in subset or self:
            tmp.setdefault(layers[n], []).append(n)

        result = []
        for lay in sorted(tmp.keys()):
            result.append(tmp[lay])
        return result

    def sort_nodes_within_layers(self, layers):
        """
        Sort nodes within each layer so as to minimize crossing of edges.
        Layers should be a list as returned by get_layers.

        To do this, we use a Barycenter Heuristic.
        This is also similar to what dot() uses to reorder nodes within a
        layer to minimize edge crossing. See for instance:
           "The barycenter Heuristic and the reorderable matrix"
              Erkki Makinen, Harri Siirtola
           http://www.informatica.si/PDF/29-3/"
               13_Makinen-The%20Barycenter%20Heuristic....pdf

        Basically, for each layer, we order the nodes based on the barycenter
        of their neighbor nodes, and repeat for each layer.

        :param layers: a list of list of nodes
           Each nested list is sorted in place.
        :return:  layers itself, after sorting. The return value can be used in
           case you directly passed the result of get_layers() as a parameter.
        """

        def order_layer1(layer1, layer2):
            # ??? Should take into account links to higher layer, so that those
            # children appear first in the list.
            weights = {}
            for n in layer1:
               total = 0
               count = 1
               for index2, n2 in enumerate(layer2):
                   if self.has_edge(n, n2, outedgesiter=self.children_edges):
                       total += index2 + 1
                       count += 1
               weights[n] = float(total) / float(count)

            layer1.sort(key=lambda x: weights[x])

        for index, layer in enumerate(layers):
            if index > 0:
                order_layer1(layer, layers[index - 1])
        return layers

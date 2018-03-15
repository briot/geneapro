r"""
This package provides a graph datastructure and algorithms to manipulate it.
It is independent of geneaprove itself.

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


class Digraph(object):
    """
    A directed graph.
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

    def __repr__(self):
        return "<graph %s>" % (
            " ".join(
                sorted("%s" % (e, ) for e in self.edges())))

    def is_empty(self):
        """
        True if there are no nodes in self
        """
        return len(self.outedges) == 0

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
        # return not self.outedges[source].isdisjoint(self.inedges[target])

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
    # By default, they check if the node or edge has a graphsortkey function.
    # Its result is used for the sorting. If the function doesn't exist, they
    # fallback on using the standard comparison functions for the types.
    # These can be overridden for the graph itself, which might be more
    # convenient that forcing the use of specific types for nodes and edges.
    ###############

    def _edge_sortkey(self, edge):
        if hasattr(edge, "graphsortkey"):
            return edge.graphsortkey()
        else:
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

    def edges(self):
        """
        Iter over all edges of the graph.
        """
        seen = set()
        for n in self:
            for e in self.outedges[n]:
                if e not in seen:
                    seen.add(e)
                    yield e

    def breadth_first_search(self, roots, edgeiter=None, maxdepth=-1,
                             distance=None):
        """
        Traverse the tree breadth first, and returns the immediate
        children of a node before their own children.
        :param distance: if specified, it must be a dict, which will be
          augmented to associate a node with its distance from the roots.
        """

        def bfs(seen, u, dist):
            """Return all children of u, then their own children.
               Does not return u itself.
            """

            ends = []
            seen.add(u)
            for edge in edgeiter(u):
                e = edge[1] if edge[0] == u else edge[0]
                if e not in seen:
                    if distance is not None:
                        distance[e] = min(distance.get(e, 10000), dist)
                    yield e
                    ends.append(e)
                    seen.add(e)

            if maxdepth == -1 or dist < maxdepth:
                for e in ends:
                    for d in bfs(seen, e, dist=dist + 1):
                        yield d

        if edgeiter is None:
            edgeiter = self.out_edges

        seen = set()
        if maxdepth != 0:
            for node in roots:
                if node not in seen:
                    if distance is not None:
                        distance[node] = 0
                    yield node
                    for d in bfs(seen, node, dist=1):
                        yield d

    def depth_first_search(self, roots=None, outedgesiter=None):
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

            for edge in reversed(list(outedgesiter(u))):
                v = edge[1] if edge[0] == u else edge[0]
                c = color.get(v, 0)  # WHITE by default
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
            roots = list(roots)
            roots.reverse()

        if outedgesiter is None:
            outedgesiter = self.out_edges

        self.__backedges = set()
        self.__cyclic = False
        color = {}    # WHITE/unvisited(0), GRAY/being processed(1) or BLACK(2)
        # predecessor = {}

        for node in roots:
            if color.get(node, 0) == 0:   # WHITE
                for d in dfs(node, color):
                    yield d

    def post_order(self, roots=None, outedgesiter=None):
        """
        Similar to depth_first_search, but also computes three additional
        pieces of information.
            :return: a dict providing the following tuple for each node:
                (low, lim, parent)
                where:
                    lim is the order in which the node was traversed.
                    low is the lowest 'lim' of all its descendants.
                    parent is a pointer to the parent node (when traversing).
        This function is not an iterator, as opposed to depth_first_search
        """

        data = {}
        color = {}    # WHITE/unvisited(0), GRAY/being processed(1) or BLACK(2)

        def dfs(u, color, parent, index):
            """process a Node"""
            color[u] = 1  # GRAY
            low = index

            for edge in reversed(list(outedgesiter(u))):
                v = edge[1] if edge[0] == u else edge[0]
                c = color.get(v, 0)  # WHITE by default
                if c == 0:   # WHITE
                    index = dfs(v, color, parent=u, index=index)
                elif c == 1:  # GRAY
                    self.__cyclic = True

            color[u] = 2  # BLACK
            data[u] = (low, index, parent)
            return index + 1

        if roots is None:
            # An iterator
            roots = self
        else:
            # Here as well we want to preserve the user's sort, and topological
            # is going to reverse the final list.
            roots = list(roots)
            roots.reverse()

        if outedgesiter is None:
            outedgesiter = self.out_edges

        index = 1
        for node in roots:
            if color.get(node, 0) == 0:   # WHITE
                index = dfs(node, color, parent=None, index=index)
        assert len(data) == len(self)
        return data

    def topological_sort(self, roots=None, outedgesiter=None):
        """
        Topological sorting of the graph. This is the list of nodes sorted
        such that the head of each edge returned by edgeiter is returned
        before its tail.

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
            roots=roots, outedgesiter=outedgesiter))
        dfs.reverse()
        return dfs

    def sorted_topological(self):
        """
        Same as topological sort, but the nodes are sorted so that however the
        graph was built, the order of nodes is always the same for two graphs
        containing the same edges. This is slower than topological_sort.
        """
        return self.topological_sort(
            roots=self.sorted_nodes(), outedgesiter=self.sorted_edges)

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
        The default is to use the edge's graphviz_label function if it exists,
        and otherwise the edge's __str__ function.
        """
        try:
            return node.graphviz_label()
        except AttributeError:
            return "%s" % node

    def edge_label(self, edge):
        """
        Returns the properties (for graphviz) to use for this edge.
        Returning None hides the edge.
        By default, it uses the edge's graphviz_label function if it exists.
        """
        try:
            return edge.graphviz_label()
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
            edgeiter = self.out_edges

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
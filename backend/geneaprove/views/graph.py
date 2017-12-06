"""
Handles merging of personas.
"""


from geneaprove import models
from geneaprove.views.to_json import JSONView
from geneaprove.utils.graphs import Digraph
from grandalf.graphs import Vertex,Edge,Graph
from grandalf.layouts import SugiyamaLayout
import logging

logger = logging.getLogger('geneaprove.graph')


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
        return "Node(%s)" % (self.main_id, )

    def graphviz_label(self):
        return "%s-%s" % (
            ",".join("%s" % p for p in sorted(self.ids)),
            self.name)


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

    def graphviz_label(self):
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
            event__type__in=(models.Event_Type.PK_birth,
                             models.Event_Type.PK_marriage,
                            ),
            disproved=False,
            role__in=(models.Event_Type_Role.PK_principal,
                      models.Event_Type_Role.PK_birth__father,
                      models.Event_Type_Role.PK_birth__mother))

        class ShortEvent(object):
            @staticmethod
            def from_kind(kind):
                if kind == models.Event_Type.PK_birth:
                    return ShortEventBirth()
                elif kind == models.Event_Type.PK_marriage:
                    return ShortEventMarriage()
                else:
                    raise Exception("Can't handle event kind %s" % kind)

        class ShortEventBirth(ShortEvent):
            child = None
            father = None
            mother = None

            def add_event(self, person, role):
                if role == models.Event_Type_Role.PK_principal:
                    self.child = person
                elif role == models.Event_Type_Role.PK_birth__father:
                    self.father = person
                elif role == models.Event_Type_Role.PK_birth__mother:
                    self.mother = person
                else:
                    raise Exception("Unknown role for birth %s" % role)

            def add_links(self, graph):
                if self.child and self.father:
                    graph.add_edge(P2P_Link(
                        fromP=graph.node_from_id(self.father),
                        toP=graph.node_from_id(self.child),
                        kind=P2P_Link.KIND_FATHER))

                if self.child and self.mother:
                    graph.add_edge(P2P_Link(
                        fromP=graph.node_from_id(self.mother),
                        toP=graph.node_from_id(self.child),
                        kind=P2P_Link.KIND_MOTHER))

                if self.father and self.mother:
                    # ??? Should this be bidirectional link
                    graph.add_edge(P2P_Link(
                        fromP=graph.node_from_id(self.father),
                        toP=graph.node_from_id(self.mother),
                        kind=P2P_Link.KIND_SPOUSE))

        class ShortEventMarriage(ShortEvent):
            person1 = None
            person2 = None

            def add_event(self, person, role):
                if role == models.Event_Type_Role.PK_principal:
                    if self.person1 is None:
                        self.person1 = person
                    else:
                        self.person2 = person
                else:
                    raise Exception("Unknown role for marriage %s" % role)

            def add_links(self, graph):
                if self.person1 and self.person2:
                    # ??? Should this be bidirectional link
                    graph.add_edge(P2P_Link(
                        fromP=graph.node_from_id(self.person1),
                        toP=graph.node_from_id(self.person2),
                        kind=P2P_Link.KIND_SPOUSE))


        events = dict()  # id -> ShortEvent

        for p in p2e.values_list('person', 'event', 'role', 'event__type_id'):
            t = events.setdefault(p[1], ShortEvent.from_kind(kind=p[3]))
            t.add_event(person=p[0], role=p[2])

        for e in events.values():
            e.add_links(graph=self)

        raw = {
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
            "val": models.Characteristic_Part_Type.PK_sex
        }

        query = (
            "SELECT %(cp_id)s, %(cp_name)s, %(p2c_person)s AS person"
            " FROM %(p2c)s, %(cp)s"
            " WHERE %(cp_type)s=%(val)d AND %(p2c_char)s=%(cp_char)s") % raw

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

        :param set[PersonaNode] subset: which persons to take into account
        """

        def __build_families():
            """
            Return a list of families found in the subset of self.
            :rtype list[list[id]]:  [parent1,parent2,child1.child2,...]
            """

            tmp = {}  # indexed on (father, mother)
            for n in self:
                if not subset or n in subset:
                    father = mother = None

                    for e in self.in_edges(n):
                        if e.kind == P2P_Link.KIND_FATHER:
                            father = e[0]
                        elif e.kind == P2P_Link.KIND_MOTHER:
                            mother = e[0]
                        elif e.kind == P2P_Link.KIND_SPOUSE:
                            n2 = e[0].main_id
                            if not subset or n2 in subset:
                                tmp.setdefault((n2, n.main_id), [n2, n.main_id])
                        else:
                            raise Exception("Unknown edge in graph: %s" % e.kind)

                    # Filter events irrelevant to our subset of the graph
                    if subset:
                        if father and father not in subset:
                            logger.debug('Cancel father')
                            father = None
                        if mother and mother not in subset:
                            logger.debug('Cancel mother')
                            mother = None

                    if father:
                        father = father.main_id
                    if mother:
                        mother = mother.main_id

                    if father or mother:
                        t = tmp.setdefault((father, mother), [father, mother])
                        if n:
                            t.append(n.main_id)

            return list(tmp.values())

        # Prepare a temporary graph: it is used to subset the list of nodes
        # to those specified in argument, and the list of edges to the
        # parent/child relationships

        tmp = Digraph()
        for e in self.edges():
            if e.kind in (P2P_Link.KIND_MOTHER, P2P_Link.KIND_FATHER) and \
               (subset is None or (
                  (e[0] in subset) and \
                  (e[1] in subset))):

                tmp.add_edge(e)

        families = __build_families()
        logger.debug('%s families' % (len(families), ))

        # Using an external library for layout

        subset2 = [n.main_id for n in subset] if subset else None
        Vmap = {v.main_id: Vertex(v)
                for v in self
                if subset2 is None or not v.ids.isdisjoint(subset2)}
        V = [v for v in Vmap.values()]
        E = [Edge(Vmap[e[0].main_id], Vmap[e[1].main_id])
             for e in self.edges()
             if e.kind in (P2P_Link.KIND_MOTHER, P2P_Link.KIND_FATHER) and \
                (e[0].main_id in Vmap) and
                (e[1].main_id in Vmap)
            ]
        g = Graph(V, E)

        # for v in V:
        #     logger.info('%s [label="%s"];' % (v.data.main_id, v.data.name))
        # for e in E:
        #     logger.info('%s -> %s;' % (e.v[0].data.main_id, e.v[1].data.main_id))

        class defaultview(object):
            w = 10
            h = 10
        for v in V:
            v.view = defaultview()

        persons = []
        persons_to_layer = {}

        logger.debug('%s components in graph' % (len(g.C), ))

        for core in g.C:
           sug = SugiyamaLayout(core)
           sug.init_all(optimize=True, cons=False)
           sug.draw()
           sug.layers.reverse()

           for layerIndex, layer in enumerate(sug.layers):
               if layerIndex not in persons:
                   persons.extend([[]] * (layerIndex + 1 - len(persons)))
               persons[layerIndex].extend(
                   {"sex": node.data.sex, "name": node.data.name, "id": node.data.main_id}
                    for node in layer
                    if hasattr(node, "data")   # ignore dummy vertices
               )

               for node in layer:
                   if hasattr(node, "data"):
                       persons_to_layer[node.data.main_id] = layerIndex

        families_by_layer = {}
        for f in families:
            l = min(persons_to_layer[id] for id in f if id is not None)
            # If there are no children
            if len(f) <= 2:
                l -= 1
            families_by_layer.setdefault(l, []).append(f)

        flatten_families = [
            families_by_layer.get(layerIndex, [])
            for layerIndex, layer in enumerate(sug.layers)
        ]

        return {
            "persons": persons,
            "families": flatten_families
        }

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
          generations) from id. Distance will be negative for descendants.
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
            maxdepth=maxdepthDescendants,
            distance=distance,
            edgeiter=self.out_children_edges))
        if distance is not None:
            for (id, dist) in distance.items():
                distance[id] = -dist

        to_match.update(self.breadth_first_search(
            roots=ids,
            maxdepth=maxdepthAncestors,
            distance=distance,
            edgeiter=self.in_parent_edges))
        return to_match


# Global graph, shared by all threads and views.
# ??? This is obviously potentially dangerous, and relies on having views
# that modify the database reset the graph. We also need to make sure that
# a single thread at a time is using the graph at the same time.

global_graph = GeneaGraph()


class QuiltsView(JSONView):

    def get_json(self, params, id):
        """
        :request_param decujus_tree:
            If True, only the persons in the decujus' tree are displayed,
            otherwise the whole contents of the datatabase is displayed.
        """

        decujus = int(id) if id is not None else 1
        decujus_tree = params.get("decujus_tree", "true").lower() == "true"

        # ??? Should lock the graph until the view has been generated

        global_graph.update_if_needed()
        if len(global_graph) == 0:
            return {}

        subset = None   # set[int]  => what persons to look at

        if decujus_tree:
            subset = global_graph.people_in_tree(
                id=decujus, maxdepthAncestors=-1, maxdepthDescendants=-1,
                spouses_tree=True)

        data = global_graph.json(subset)
        return {
            "persons": data["persons"],
            "families": data["families"],
            "decujusOnly": decujus_tree,
            "decujus_name": "",
            "decujus": decujus}

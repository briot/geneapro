import collections
import itertools
from geneaprove import models
from grandalf.graphs import Vertex,Edge,Graph
from grandalf.layouts import SugiyamaLayout
from .to_json import JSONView
from .queries import PersonSet


class BirthEvent:
    def __init__(self):
        self.child = None
        self.fathers = []
        self.mothers = []

    def set_child(self, main_id):
        assert self.child is None
        self.child = int(main_id)

    def add_father(self, main_id):
        self.fathers.append(int(main_id))

    def add_mother(self, main_id):
        self.mothers.append(int(main_id))

    def __repr__(self):
        return f"(birth {self.child} from {self.fathers} and {self.mothers})"

class MarriageEvent:
    def __init__(self):
        self.spouses = []

    def add_spouse(self, main_id):
        self.spouses.append(int(main_id))


class NodeLayout:
    def __init__(self):
        self.w = 10
        self.h = 10


class QuiltsView(JSONView):

    def get_json(self, params, id):
        persons = PersonSet()
        persons.add_folks(int(id), 'ancestors')
        persons.add_folks(int(id), 'descendants')
        persons.fetch_p2e(
            event_types=(models.Event_Type.PK_birth,
                         models.Event_Type.PK_marriage))

        decujus = persons.get_from_id(int(id))

        # Recreate the birth events, we need child, father and mother to build
        # the links. Likewise for marriage events.

        births = collections.defaultdict(BirthEvent)
        marriages = collections.defaultdict(MarriageEvent)

        for a in persons.asserts:
            if isinstance(a, models.P2E) and not a.disproved:
                if a.event.type_id == models.Event_Type.PK_birth:
                    if a.role_id == models.Event_Type_Role.PK_principal:
                        births[a.event.id].set_child(a.person_id)
                    elif a.role_id == models.Event_Type_Role.PK_birth__father:
                        births[a.event.id].add_father(a.person_id)
                    elif a.role_id == models.Event_Type_Role.PK_birth__mother:
                        births[a.event.id].add_mother(a.person_id)

                elif a.event.type_id == models.Event_Type.PK_marriage:
                    if a.role_id == models.Event_Type_Role.PK_principal:
                        marriages[a.event.id].add_spouse(a.person_id)

        # Organize persons into layers, based on child->parent relationships
        nodes = {main_id: Vertex(person)
                 for main_id, person in persons.persons.items()}
        edges = [Edge(nodes[b.child], nodes[p])
                 for b in births.values()
                 for p in itertools.chain(b.fathers, b.mothers)
                 if b.child]
        g = Graph(list(nodes.values()), edges)

        for n in nodes.values():
            n.view = NodeLayout()

        perlayer = collections.defaultdict(list)  # main_id for each layer
        person_to_layer = {}   # main_id => layer

        for core in g.C:
            sug = SugiyamaLayout(core)
            sug.init_all(optimize=True, cons=False)
            sug.draw()

            for layerIndex, layer in enumerate(sug.layers):
                for node in layer:
                    # ignore dummy vertices
                    if hasattr(node, "data"):
                        perlayer[layerIndex].append(node.data.main_id)
                        person_to_layer[node.data.main_id] = layerIndex

        # Build the list of families. Each family is described as a list
        #   [parent1, parent2, child1, child2,...]
        children = collections.defaultdict(list)
        for b in births.values():
            if b.child:
                for f in (b.fathers or [None]):
                    for m in (b.mothers or [None]):
                        if f is not None or m is not None:
                            children[(f, m)].append(b.child)

        couples = set(children.keys())
        for event in marriages.values():
            for idx, p1 in enumerate(event.spouses):
                for p2 in event.spouses[idx + 1:]:
                    couples.add((p1, p2))

        families_by_layer = collections.defaultdict(list)
        for c in couples:
            family = list(a for a in c) + children[c]
            layer = min(person_to_layer[p] for p in family if p is not None)

            # If there are no children:
            if len(family) <= 2:
                layer -= 1

            families_by_layer[layer].append(family)

        flatten_families = [
            families_by_layer[layerIndex]
            for layerIndex, layer in enumerate(sug.layers)]

        return {
            "persons": persons.persons,
            "perlayer": [perlayer[a]for a in sorted(perlayer)],
            "families": flatten_families,
            "decujus_name": decujus.display_name,
            "decujus": decujus.main_id}

"""
Statistics
"""

import datetime
from geneaprove.utils.date import CalendarGregorian
from geneaprove.views.graph import global_graph
from geneaprove.views.persona import extended_personas, \
    event_types_for_pedigree
from geneaprove.views.to_json import JSONView


class StatsView(JSONView):
    """Display the statistics for a given person"""

    def get_json(self, params, id):
        # pylint: disable=redefined-builtin
        # pylint: disable=arguments-differ

        id = int(id)
        global_graph.update_if_needed()

        # ??? The stats includes persons "Unknown" that were created during a
        # gedcom import for the purpose of preserving families. Will be fixed
        # when we store children differently (for instance in a group)

        distance = dict()
        decujus = global_graph.node_from_id(id)

        allpeople = global_graph.people_in_tree(
            id=decujus.main_id, distance=distance)
        persons = extended_personas(
            nodes=allpeople,
            styles=None,
            event_types=event_types_for_pedigree(),
            graph=global_graph)

        f = global_graph.fathers(decujus.main_id)
        fathers = global_graph.people_in_tree(
            id=f[0], maxdepthDescendants=0) if f else []
        m = global_graph.mothers(decujus.main_id)
        mothers = global_graph.people_in_tree(
            id=m[0], maxdepthDescendants=0) if m else []

        cal = CalendarGregorian()

        generations = dict()  # list of persons for each generation
        for a in allpeople:
            d = distance[a]
            if d not in generations:
                generations[d] = []
            generations[d].append(a)

        ranges = []

        for index in sorted(generations):
            births = None
            deaths = None
            gen_range = [index + 1, "?", "?", ""]  # gen, min, max, legend
            for p in generations[index]:
                p = persons[p.main_id]
                if p.birthISODate:
                    if births is None or p.birthISODate < births:
                        births = p.birthISODate
                        year = int(p.birthISODate[0:4])
                        if year is not None:
                            gen_range[1] = year

                if p.deathISODate:
                    if deaths is None or p.deathISODate > deaths:
                        deaths = p.deathISODate
                        year = int(p.deathISODate[0:4])
                        if year is not None:
                            gen_range[2] = year

            if index >= 0:
                gen_range[3] = "Gen. %02d (%d / %d) %s - %s" \
                    % (index + 1, len(generations[index]), 2 ** (index + 1),
                       gen_range[1], gen_range[2])
            else:
                gen_range[3] = "Desc. %02d (%d) %s - %s" \
                    % (-index, len(generations[index]),
                       gen_range[1], gen_range[2])

            # Postprocess the ranges:
            #   generation n's earliest date has to be at least 15 years before
            #     its children's earliest date (can't have children before
            #     that)
            #   generation n's latest date (death) has to be after the
            #     children's generation earliest date (first birth)

            if len(ranges) > 0:
                if gen_range[1] == "?":
                    gen_range[1] = ranges[-1][1] - 15
                if gen_range[2] == "?" or gen_range[2] < ranges[-1][1]:
                    gen_range[2] = ranges[-1][1]
            if gen_range[2] == '?':
                gen_range[2] = datetime.datetime.now().year

            ranges.append(gen_range)

        ages = []
        for a in range(0, 120, 5):
            ages.append([a, 0, 0, 0])  # date_range, males, females, unknown

        for p in persons.values():
            if p.birthISODate and p.deathISODate:
                age = int(p.deathISODate[0:4]) - int(p.birthISODate[0:4])
                #if age is not None:
                #    if p.sex == "M":
                #        ages[int(age / 5)][1] += 1
                #    elif p.sex == "F":
                #        ages[int(age / 5)][2] += 1
                #    else:
                #        ages[int(age / 5)][3] += 1
                ages[int(age / 5)][3] += 1

        return {
            "total_ancestors": len(allpeople),
            "total_father":    len(fathers),
            "total_mother":    len(mothers),
            "total_persons":   len(global_graph),
            "ranges":          ranges,
            "ages":            ages,
            "decujus":         decujus.main_id,
            "decujus_name":    persons[decujus.main_id].name,
        }

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

        max_age = int(params.get('max_age', '0'))
        bar_width = int(params.get('bar_width', '5'))

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

        # Group persons by generations

        generations = dict()  # list of persons for each generation
        for a in allpeople:
            d = distance[a]
            if d not in generations:
                generations[d] = []
            generations[d].append(a)

        # Compute birth and death dates for all persons, taking into account
        # the max_age setting

        current_year = datetime.datetime.now().year
        dates = {}
        for a in allpeople:
            p = persons[a.main_id]
            b_year = int(p.birthISODate[0:4]) if p.birthISODate else None
            d_year = int(p.deathISODate[0:4]) if p.deathISODate else None
            if not d_year and max_age > 0:
                if b_year:
                    d_year = min(b_year + max_age, current_year)
                else:
                    # no birth nor death known
                    pass

            dates[a.main_id] = [b_year, d_year]

        # Compute timespans for generations

        ranges = []
        for index in sorted(generations):
            births = None
            deaths = None
            gen_range = [index + 1, "?", "?", ""]  # gen, min, max, legend
            for p in generations[index]:
                a = dates[p.main_id]

                if a[0] and (births is None or a[0] < births):
                    births = a[0]
                    gen_range[1] = a[0]

                if a[1] and (deaths is None or a[1] > deaths):
                    deaths = a[1]
                    gen_range[2] = a[1]

            if index >= 0:
                gen_range[3] = "Gen. %02d (%d / %d) %s - %s" \
                    % (index + 1, len(generations[index]), 2 ** index,
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

        # Compute the age pyramid

        ages = []    # date_range, males, females, unknown
        for p in allpeople:
            a = dates[p.main_id]
            if a[0] and a[1]:
                age = int((a[1] - a[0]) / bar_width)

                if age >= len(ages):
                    for b in range(len(ages), age + 1):
                        ages.append([b * bar_width, 0, 0, 0])

                #if age is not None:
                #    if p.sex == "M":
                #        ages[int(age / 5)][1] += 1
                #    elif p.sex == "F":
                #        ages[int(age / 5)][2] += 1
                #    else:
                #        ages[int(age / 5)][3] += 1
                ages[age][3] += 1

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

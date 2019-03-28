"""
Statistics
"""

import collections
import datetime
from django.db.models import Count, F
import logging
from .. import models
from ..utils.date import DateRange
from .queries import PersonSet
from .to_json import JSONView

logger = logging.getLogger('geneaprove.STATS')


class StatsView(JSONView):
    """Display the statistics for a given person"""

    def get_json(self, params, id):
        # pylint: disable=redefined-builtin
        # pylint: disable=arguments-differ

        max_age = int(params.get('max_age', '0'))
        bar_width = int(params.get('bar_width', '5'))

        # ??? The stats includes persons "Unknown" that were created during a
        # gedcom import for the purpose of preserving families. Will be fixed
        # when we store children differently (for instance in a group)

        persons = PersonSet()
        persons.add_folks(person_id=int(id), relationship='ancestors')
        persons.add_folks(person_id=int(id), relationship='descendants')
        persons.fetch_p2e()   # compute births and deaths

        logger.debug('count persons in tree')
        fathers = [p for p in persons.persons.values() if p.sex == 'M']
        mothers = [p for p in persons.persons.values() if p.sex == 'F']

        # Compute birth and death dates for all persons, taking into account
        # the max_age setting

        logger.debug('parse dates')
        current_year = datetime.datetime.now().year
        dates = {}
        for p in persons.persons.values():
            b_year = DateRange(p.birthISODate).year() \
                if p.birthISODate else None
            d_year = DateRange(p.deathISODate).year() \
                if p.deathISODate else None
            if not d_year and max_age > 0:
                if b_year:
                    d_year = min(b_year + max_age, current_year)
                else:
                    # no birth nor death known
                    pass

            dates[p.main_id] = [b_year, d_year]

        # Group persons by generations. Do not use a recursive approach, since
        # it will fail with large numbers of generations

        distance = persons.compute_generations(gen_0_ids=[int(id)])
        generations = collections.defaultdict(list)
        for main_id, gen in distance.items():
            generations[gen].append(main_id)

        # Compute timespans for generations

        logger.debug('compute timespans')
        ranges = []
        for index in sorted(generations):
            births = None
            deaths = None
            gen_range = [index + 1, "?", "?", ""]  # gen, min, max, legend
            for main_id in generations[index]:
                a = dates[main_id]

                if a[0] and (births is None or a[0] < births):
                    births = a[0]
                    gen_range[1] = a[0]

                if a[1] and (deaths is None or a[1] > deaths):
                    deaths = a[1]
                    gen_range[2] = a[1]

            if index >= 16:
                gen_range[3] = f"Gen. {index + 1:02d} ({len(generations[index])}) {gen_range[1]} - {gen_range[2]}"
            elif index >= 0 and index <= 16:
                gen_range[3] = f"Gen. {index + 1:02d} ({len(generations[index])} / {2 ** index}) {gen_range[1]} - {gen_range[2]}"
            else:
                # No need to count maximum number of persons, this becomes
                # too large, and irrelevant since there is implex
                gen_range[3] = f"Desc. {-index:02d} ({len(generations[index])}) {gen_range[1]} - {gen_range[2]}"

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

        logger.debug('group by age')
        ages = []    # date_range, males, females, unknown
        for main_id in persons.persons:
            a = dates[main_id]
            if a[0] and a[1]:
                # age could be negative in some invalid files
                age = max(0, int((a[1] - a[0]) / bar_width))

                for b in range(len(ages), age + 1):
                    ages.append([b * bar_width, 0, 0, 0])

                p = persons.get_from_id(main_id)
                if p.sex == "M":
                    ages[age][1] += 1
                elif p.sex == "F":
                    ages[age][2] += 1
                else:
                    ages[age][3] += 1

        total_in_db = models.Persona.objects \
            .filter(id=F('main_id')).aggregate(count=Count('id'))
        decujus = persons.get_from_id(int(id))

        return {
            "total_ancestors": len(persons.persons),
            "total_father":    len(fathers),
            "total_mother":    len(mothers),
            "total_persons":   int(total_in_db['count']),
            "ranges":          ranges,
            "ages":            ages,
            "decujus":         decujus.main_id,
            "decujus_name":    decujus.display_name,
        }

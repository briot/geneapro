"""
Statistics
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from geneapro import models
from geneapro.utils.date import CalendarGregorian
from geneapro.views.tree import Tree, SameAs
from geneapro.views.styles import *
from geneapro.views.persona import extended_personas, event_types_for_pedigree
from geneapro.views.json import to_json

def view (request, decujus=1):
   """Display the statistics for a given person"""

   decujus = int(decujus)
   same = SameAs()
   same.compute(None) # Compute all "same as" relationships
   tree = Tree(same=same)
   styles = None # Don't need style here

   # ??? The stats includes persons "Unknown" that were created during a
   # gedcom import for the purpose of preserving families. Will be fixed
   # when we store children differently (for instance in a group)

   ids = tree.ancestors(decujus).keys()
   persons = extended_personas(
       ids, styles, event_types=event_types_for_pedigree, same=same)
   father_ids = tree.ancestors(tree.father(decujus))
   mother_ids = tree.ancestors(tree.mother(decujus))

   cal = CalendarGregorian()

   ranges = []
   for index, g in enumerate(tree.generations(decujus)):
      births = None
      deaths = None
      gen_range = [index+1, "?", "?", ""] # gen, min, max, legend
      for p in g:
         p = persons [p]
         if p.birth and p.birth.Date:
            if births is None or p.birth.Date < births:
               births = p.birth.Date
               year = p.birth.Date.year(cal)
               if year is not None:
                  gen_range[1] = year

         if p.death and p.death.Date:
            if deaths is None or p.death.Date > deaths:
               deaths = p.death.Date
               year = p.death.Date.year(cal)
               if year is not None:
                  gen_range[2] = year

      gen_range[3] = "Generation %02d (%d out of %d) (%s - %s)" \
            % (index+1, len (g), 2 ** (index + 1),
               gen_range[1], gen_range[2])

      # Postprocess the ranges:
      #   generation n's earliest date has to be at least 15 years before
      #     its children's earliest date (can't have children before that)
      #   generation n's latest date (death) has to be after the children's
      #     generation earliest date (first birth)

      if len (ranges) > 0:
         if gen_range [1] == "?":
            gen_range[1] = ranges[-1][1] - 15
         if gen_range [2] == "?" or gen_range[2] < ranges[-1][1]:
            gen_range[2] = ranges[-1][1]

      ranges.append(gen_range)

   ages = []
   for a in range (0, 120, 5):
      ages.append ([a,0,0,0])  # date_range, males, females, unknown

   for p in persons.itervalues ():
      if p.birth and p.birth.Date and p.death and p.death.Date:
         age = p.death.Date.years_since (p.birth.Date)
         if age is not None:
            if p.sex == "M":
               ages[int(age / 5)][1] += 1;
            elif p.sex == "F":
               ages[int(age / 5)][2] += 1;
            else:
               ages[int(age / 5)][3] += 1;

   return render_to_response (
       'geneapro/stats.html',
      {"total_ancestors": len (ids),
       "total_father":    len (father_ids) + 1,  # +1 is for the father
       "total_mother":    len (mother_ids) + 1,
       "ranges":          ranges,
       "ages":            ages,
      },
       context_instance=RequestContext(request))

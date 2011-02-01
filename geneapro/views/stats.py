"""
Statistics
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date, CalendarGregorian
from mysites.geneapro.views.tree import *
from mysites.geneapro.views.styles import *
from mysites.geneapro.views.persona import extended_personas
from mysites.geneapro.views.json import to_json

def view (request):
   """Display the statistics for a given person"""

   decujus = 1
   tree = Tree ()
   styles = Styles ([], tree, decujus=decujus)
   ids = set (tree.ancestors (decujus).keys())
   persons = extended_personas (ids, styles)
   father_ids = tree.ancestors (tree.father (decujus))
   mother_ids = tree.ancestors (tree.mother (decujus))

   cal = CalendarGregorian()

   ranges = []
   for index, g in enumerate (tree.generations (decujus)):
      births = None
      deaths = None
      gen_range = [index+1, "?", "?", ""] # gen, min, max, legend
      for p in g:
         p = persons [p]
         if p.birth and p.birth.Date:
            if births is None or p.birth.Date < births:
               births = p.birth.Date
               if p.birth.Date.year_known:
                  gen_range[1] = p.birth.Date.year (cal)

         if p.death and p.death.Date:
            if deaths is None or p.death.Date > deaths:
               deaths = p.death.Date
               if p.death.Date.year_known:
                  gen_range[2] = p.death.Date.year (cal)

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

      ranges.append (gen_range)

   ages = []
   for a in range (0, 120, 5):
      ages.append ([a,0,0,0])  # date_range, males, females, unknown

   for p in persons.itervalues ():
      if p.birth and p.birth.Date and p.death and p.death.Date:
         age = p.death.Date.years_since (p.birth.Date)
         if age:
            if p.sex == "M":
               ages [int (age / 5)][1] += 1;
            elif p.sex == "F":
               ages [int (age / 5)][2] += 1;
            else:
               ages [int (age / 5)][3] += 1;

   return render_to_response (
       'geneapro/stats.html',
      {"total_ancestors": len (ids),
       "total_father":    len (father_ids) + 1,  # +1 is for the father
       "total_mother":    len (mother_ids) + 1,
       "ranges":          ranges,
       "ages":            ages,
      },
       context_instance=RequestContext(request))

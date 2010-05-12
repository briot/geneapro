"""
Statistics
"""

from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _
from django.utils import simplejson
from django.http import HttpResponse
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date
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

   ranges = []
   for index, g in enumerate (tree.generations (decujus)):
      births = [None, None, "", ""]  # min Date, max Date, min dpy, max dpy
      deaths = [None, None, "", ""]
      gen_range = [index+1, "?", "?", ""] # gen, min, max, legend
      for p in g:
         p = persons [p]
         if p.birth and p.birth.Date:
            if births[0] is None or p.birth.Date < births[0]:
               births[0] = p.birth.Date
               births[2] = births[0].display()
               if p.birth.Date.year_known:
                  gen_range[1] = p.birth.Date.year ()
            if births[1] is None or p.birth.Date > births[1]:
               births[1] = p.birth.Date
               births[3] = births[1].display()

         if p.death and p.death.Date:
            if deaths[0] is None or p.death.Date < deaths[0]:
               deaths[0] = p.death.Date
               deaths[2] = deaths[0].display ()
            if deaths[1] is None or p.death.Date > deaths[1]:
               deaths[1] = p.death.Date
               deaths[3] = deaths[1].display()
               if p.death.Date.year_known:
                  gen_range[2] = p.death.Date.year ()

      gen_range[3] = "Generation %02d (%d out of %d) (%s - %s)" \
            % (index+1, len (g), 2 ** (index + 1),
               gen_range[1], gen_range[2])

      if gen_range[1] == "?" and gen_range[2] == "?":
         gen_range[1] = 'null'
         gen_range[2] = 'null'
      elif gen_range [1] == "?":
         gen_range[1] = gen_range[2] - 1
      elif gen_range [2] == "?":
         gen_range[2] = gen_range[1] + 1

      ranges.append (gen_range)

   ages = []
   for a in range (0, 120, 5):
      ages.append ([a,0])

   for p in persons.itervalues ():
      if p.birth and p.birth.Date and p.death and p.death.Date:
         age = p.death.Date.years_since (p.birth.Date)
         if age:
            ages [int (age / 5)][1] += 1;

   return render_to_response (
       'geneapro/stats.html',
      {"total_ancestors": len (ids),
       "total_father":    len (father_ids) + 1,  # +1 is for the father
       "total_mother":    len (mother_ids) + 1,
       "ranges":          ranges,
       "ages":            ages,
      },
       context_instance=RequestContext(request))

"""Convert data to JSON"""

from django.utils import simplejson
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date
from mysites.geneapro.views.styles import get_place

def to_json (obj, year_only):
   """Converts a type to json data, properly converting database instances.
      If year_only is true, then the dates will only include the year"""

   class ModelEncoder (simplejson.JSONEncoder):
      """Encode an object or a list of objects extracted from our model into
         JSON"""

      def default (self, obj):
         """See inherited documentation"""

         if isinstance (obj, models.Persona):
            b = None
            bp = None
            bs = None
            if obj.birth:
               b = obj.birth.Date
               bp = get_place (obj.birth, "name")
               if obj.birth.sources:
                  bs = obj.birth.sources

            d = ""
            dp = None
            ds = None
            if obj.death:
               D = obj.death.Date
               if D:
                  d = D.display (year_only=year_only)
               if not year_only and b and d:
                  a = D.years_since (b)
                  if a:
                     d += " (age " + str (a) + ")"
               dp = get_place (obj.death, "name")
               if obj.death.sources:
                  ds = obj.death.sources
            elif not year_only and b:
               a = Date.today().years_since (b)
               if a:
                  d = "(age " + str (a) + ")"

            return {"id":obj.id, "givn":obj.given_name,
                    'surn':obj.surname, 'sex':obj.sex,
                    'styles':obj.styles,
                    'birth':b, 'birthp':bp, 'births':bs,
                    'death':d, 'deathp':dp, 'deaths':ds}

         elif isinstance (obj, Date):
            return obj.display (year_only=year_only)

         elif isinstance (obj, models.Event):
            return {"date":    obj.Date,
                    "sources": obj.sources}

         elif isinstance (obj, models.GeneaproModel):
            return obj.to_json()

         return super (ModelEncoder, self).default (obj)

   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))


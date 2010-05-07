"""Convert data to JSON"""

from django.utils import simplejson
from mysites.geneapro import models
from mysites.geneapro.utils.date import Date

def to_json (obj, year_only):
   """Converts a type to json data, properly converting database instances.
      If year_only is true, then the dates will only include the year"""

   class ModelEncoder (simplejson.JSONEncoder):
      """Encode an object or a list of objects extracted from our model into
         JSON"""

      def default (self, obj):
         """See inherited documentation"""

         if isinstance (obj, models.Persona):
            d = ""
            if obj.death:
               d = obj.death.display (year_only=year_only)
               if not year_only:
                  a = obj.death.years_since (obj.birth)
                  if a:
                     d += " (age " + str (a) + ")"
            elif not year_only:
               a = Date.today().years_since (obj.birth)
               if a:
                  d = "(age " + str (a) + ")"

            return {"id":obj.id, "givn":obj.given_name,
                    'surn':obj.surname,
                    'styles':obj.styles,
                    'birth':obj.birth, 'sex':obj.sex, 'death':d,
                    'birthp':obj.birth_place or "",
                    'deathp':obj.death_place or "",
                    'births':obj.birth_sources or "",
                    'deaths':obj.death_sources or ""}

         elif isinstance (obj, Date):
            return obj.display (year_only=year_only)

         elif isinstance (obj, models.Event):
            return {"date":    Date (obj.date),
                    "sources": obj.sources}

         elif isinstance (obj, models.GeneaproModel):
            return obj.to_json()

         return super (ModelEncoder, self).default (obj)

   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))


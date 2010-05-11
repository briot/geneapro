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

      def _event (self, evt):
         """Encode event"""
         if evt is None:
            return ""
         else:
            place = get_place (evt, "name") or ""
            if year_only and evt.Date:
               return [evt.Date.display (year_only=True), place, evt.sources]
            else:
               # Reuse user date if possible
               return [evt.date, place, evt.sources]

      def default (self, obj):
         """See inherited documentation"""

         if isinstance (obj, models.Persona):
            b = self._event (obj.birth)
            d = self._event (obj.death)

            if not year_only and obj.birth:
               if obj.death:
                  if obj.death.Date:
                     age = " (age " \
                        + str (obj.death.Date.years_since (obj.birth.Date)) \
                        + ")"
                     d[0] += age
               else:
                  age = " (age " \
                        + str (Date.today().years_since (obj.birth.Date)) \
                        + ")"
                  d = [age, None, None]

            return {"id":obj.id, "givn":obj.given_name,
                    'surn':obj.surname, 'sex':obj.sex,
                    'y':obj.styles, 'b':b, 'd':d}

         elif isinstance (obj, Date):
            return obj.display (year_only=year_only)

         elif isinstance (obj, models.Event):
            return self._event (obj)

         elif isinstance (obj, models.GeneaproModel):
            return obj.to_json()

         return super (ModelEncoder, self).default (obj)

   return simplejson.dumps (obj, cls=ModelEncoder, separators=(',',':'))


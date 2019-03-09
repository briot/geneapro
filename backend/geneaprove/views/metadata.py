from .. import models
from ..models.theme import checks_list
from .to_json import JSONView

class MetadataList(JSONView):
    """
    List all static lists used in the model.
    These are the lists that only need to be refreshed infrequently.
    """

    def get_json(self, params):
        return {
            'characteristic_types': models.Characteristic_Part_Type
               .objects.all(),
            'event_types': models.Event_Type.objects.all(),
            'event_type_roles': models.Event_Type_Role.objects.all(),
            'theme_operators': checks_list,
            'themes': models.Theme.objects.all(),
        }

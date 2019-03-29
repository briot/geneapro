from .. import models
from ..models.theme import Checker
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
            'char_part_SEX': models.Characteristic_Part_Type.PK_sex,
            'event_types': models.Event_Type.objects.all(),
            'event_type_roles': models.Event_Type_Role.objects.all(),
            'p2p_types': models.P2P_Type.objects.all(),
            'researchers': models.Researcher.objects.all(),
            'theme_operators': Checker.CHECKS_LIST,
            'themes': models.Theme.objects.all(),
        }

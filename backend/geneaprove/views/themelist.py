from .. import models
from ..models.theme import checks_list
from .to_json import JSONView

class ThemeList(JSONView):
    """
    List all known color themes
    """

    def get_json(self, params):
        return {
           'themes': {r.id: r.name for r in models.Theme.objects.all()}
        }


class RuleList(JSONView):
    """
    List of rules within a theme
    """

    def get_json(self, params):
        theme_id = params.get('theme', -1)
        try:
            theme = models.Theme.objects\
                .prefetch_related('rules', 'rules__parts').get(id=theme_id)
            rules = [theme.rules.all()]
        except:
            rules = []

        return {
            'rules': rules,
            'operators': checks_list,
        }

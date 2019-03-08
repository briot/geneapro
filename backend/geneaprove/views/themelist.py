from .. import models
from .to_json import JSONView

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
        }

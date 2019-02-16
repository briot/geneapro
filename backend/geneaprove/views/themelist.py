from geneaprove import models
from geneaprove.views.to_json import JSONView

class ThemeList(JSONView):
    """
    List all known color themes
    """

    def get_json(self, params):
        return {
           'themes': {r.id: r.name for r in models.Theme.objects.all()}
        }


"""
Provides a number of simple views for geneaprove
"""

from django.http import HttpResponse
from geneaprove.views.to_json import to_json


def getLegend(request):
    """
    Return the list of highlighting rules
    """
    # pylint: disable=unused-argument

    theme_name = request.GET.get('theme', '')
    theme = models.Theme.Theme.objects \
            .prefetch_related('rules', 'rules__parts') \
            .get(name=theme_name)
    if theme:
        rules = theme.as_rule_list()
    else:
        rules = []
    return HttpResponse(
        to_json({'rules': rules}),
        content_type='application/json')

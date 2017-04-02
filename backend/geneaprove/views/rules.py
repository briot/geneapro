
"""
Provides a number of simple views for geneaprove
"""

from django.http import HttpResponse
import geneaprove.views.custom_highlight
from geneaprove.views.styles import style_to_css
from geneaprove.views.to_json import to_json


def getLegend(request):
    """
    Return the list of highlighting rules
    """
    # pylint: disable=unused-argument

    all_rules = geneaprove.views.custom_highlight.style_rules()
    rules = []
    for name, _, _, style in all_rules:
        rules.append({'name': name, 'css': style_to_css(style)})
    return HttpResponse(
        to_json({'rules': rules}),
        content_type='application/json')

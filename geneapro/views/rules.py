
"""
Provides a number of simple views for Geneapro
"""

from django.shortcuts import render_to_response
from django.template import Context, Template
from django.template.loader import get_template
import mysites.geneapro.views.custom_highlight
from mysites.geneapro.views.styles import style_to_td


def getLegend():
    all_rules = mysites.geneapro.views.custom_highlight.style_rules
    rules = []
    for name, type, tests, style in all_rules:
        rules.append((name, style_to_td(style)))

    tmpt = get_template('geneapro/rules.html')
    c = Context({'rules': rules})
    return tmpt.render(c)

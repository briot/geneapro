
"""
Provides a number of simple views for geneaprove
"""

from django.shortcuts import render_to_response
from django.template import Context, Template
from django.template.loader import get_template
import geneaprove.views.custom_highlight
from geneaprove.views.styles import style_to_css


def getLegend():
    all_rules = geneaprove.views.custom_highlight.style_rules
    rules = []
    for name, type, tests, style in all_rules:
        rules.append((name, style_to_css(style)))

    tmpt = get_template('geneaprove/rules.html')
    c = Context({'rules': rules})
    return tmpt.render(c)

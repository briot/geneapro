import json
from .. import models
from .to_json import JSONView


class ThemeRules(JSONView):
    """
    List of rules within a theme
    """

    def get_json(self, params, theme_id):
        try:
            theme = models.Theme.objects\
                .prefetch_related('rules', 'rules__parts').get(id=theme_id)
            rules = theme.rules.filter(parent=None).all()
        except:
            rules = []

        return {
            'rules': rules,
        }


class ThemeSave(JSONView):
    """
    Create a new theme or edit an existing one
    """

    def create_rule_recursive(self, theme, r, sequence_number, parent=None):
        rule = models.Rule.objects.create(
            theme=theme,
            type=r['type'],
            name=r.get('name', ''),
            sequence_number=sequence_number,
            style_fill=r.get('fill', None),
            style_color=r.get('color', None),
            style_stroke=r.get('stroke', None),
            style_font_weight=r.get('fontWeight', None),
            parent=parent)

        children = r.get('children', None)
        if children:
            for idx, c in enumerate(children):
                self.create_rule_recursive(theme, c, idx, parent=rule)

        parts = r.get('parts', None)
        if parts:
            for key, p in parts.items():
                models.RulePart.objects.create(
                    rule=rule,
                    field=key,
                    operator=p['operator'],
                    value=p['value'])

    def post_json(self, params, theme_id):
        name = params['name']
        rules = json.loads(params['rules'])

        theme, created = models.Theme.objects.update_or_create(
            id=theme_id,
            defaults={'name': name})

        if not created:
            for r in theme.rules.all():
                r.delete()

        for idx, r in enumerate(rules):
            self.create_rule_recursive(theme, r, idx)

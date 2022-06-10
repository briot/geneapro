from django.db import models
from ..base import GeneaProveModel
from .checks import Checker, Check
from .rules import RuleChecker
from .styles import Style
from typing import Dict, Any


class Theme(GeneaProveModel):
    """
    A collection of styles applied to entities in the GUI
    """

    # ??? Perhaps there should be theme per-user
    name = models.TextField(help_text="Name of the neme", unique=True)

    class Meta:
        db_table = "theme"

    def __str__(self):
        return f"(Theme name={self.name})"

    def as_rule_list(self):
        """
        Return the list of RuleChecker for this theme.
        """
        return [r.as_rule_checker() for r in self.rules.all()]


class Rule(GeneaProveModel):
    """
    One specific rule within a theme
    """

    theme = models.ForeignKey(
        Theme, related_name="rules", on_delete=models.CASCADE)
    type = models.TextField(help_text="Type oof rule")
    name = models.TextField(
        help_text="Description of the style", blank=True, null=True)
    sequence_number = models.IntegerField(default=1)
    style_fill = models.TextField(
        help_text="Color to fill elements", blank=True, null=True)
    style_color = models.TextField(
        help_text="Color for text", blank=True, null=True)
    style_stroke = models.TextField(
        help_text="Color for lines", blank=True, null=True)
    style_font_weight = models.TextField(
        help_text="Thickness of text (normal, bold)", blank=True, null=True)

    parent = models.ForeignKey(
        "Rule", related_name="children", on_delete=models.CASCADE,
        null=True)
    # For a `And` or `Or` rule, the list of child rules to check

    class Meta:
        ordering = ("sequence_number", "name")
        db_table = "rule"

    def __str__(self):
        return (
            f"(Rule name={self.name} type={self.type}"
            f" seq={self.sequence_number}"
            f" fill={self.style_fill}"
            f" color={self.style_color}"
            f" stroke={self.style_stroke}"
            f" font={self.style_font_weight})"
        )

    def to_json(self):
        return {
            'name': self.name,
            'type': self.type,
            'fill': self.style_fill,
            'color': self.style_color,
            'stroke': self.style_stroke,
            'fontWeight': self.style_font_weight,

            # ??? Should send a list and let front-end deal with dict
            'parts': {p.field: p for p in self.parts.all()},
            'children': self.children.all(),
        }

    def as_rule_checker(self):
        """
        Create a RuleChecker, usable from python to check whether the rule
        applies.
        """
        children = [r.as_rule_checker() for r in self.children.all()]

        kwargs = {}
        if children:
            kwargs["rules"] = children

        for part in self.parts.all():
            kwargs[part.field] = Checker.build_check(part)

        return RuleChecker.get_factory(self.type)(
            descr=self.name,
            style=Style(
                fill=self.style_fill,
                color=self.style_color,
                stroke=self.style_stroke,
                font_weight=self.style_font_weight),
            **kwargs)


class RulePart(GeneaProveModel):
    """
    A component of a rule
    """
    rule = models.ForeignKey(
        Rule, related_name='parts', on_delete=models.CASCADE)

    field = models.TextField(
        help_text="What we are testing, for instance 'name'")
    operator = models.TextField(max_length=10, choices=Checker.DJANGO_CHOICES)
    value = models.TextField(
        help_text="What it should match (either a string or a list)")

    def __str__(self):
        return f"(RulePart {self.field} {self.operator} {self.value})"

    def build_check(self) -> Check:
        descr = Checker.__MAPPING[self.operator]
        return descr[0](descr[1].convert(self.value))

    def to_json(self) -> Dict[str, Any]:
        descr = Checker.__MAPPING[self.operator]
        return {  # Javascript's  RulePart
            "field": self.field,
            "operator": self.operator,
            "value": descr[1].convert(self.value),
        }

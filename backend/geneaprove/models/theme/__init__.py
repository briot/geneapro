from django.db import models
from ..base import GeneaProveModel
from .checks import build_check, check_choices
from .rules import RuleChecker
from .styles import Style


class Theme(GeneaProveModel):
    """
    A collection of styles applied to entities in the GUI
    """

    # ??? Perhaps there should be theme per-user
    name = models.TextField(help_text="Name of the neme", unique=True)

    class Meta:
        db_table = "theme"

    def __str__(self):
        return "(Theme name=%s)" % self.name

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
        return "(Rule name=%s)" % self.name

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
            kwargs[part.field] = build_check(
                operator=part.operator, value=part.value)

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
    operator = models.TextField(max_length=10, choices=check_choices)
    value = models.TextField(
        help_text="What it should match (either a string or a list)")

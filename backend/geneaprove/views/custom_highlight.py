"""
Various views related to displaying the pedgree of a person graphically
"""

from geneaprove import models
import geneaprove.views.styles as rules

def style_rules():
    return [
        rules.Alive(
            max_age=110,
            descr="Persons that are still alive",
            style=rules.Style(font_weight="bold")),

        rules.Alive(
            descr="Person's age today is more than 60, and is alive",
            style=rules.Style(color="orange"),
            alive=True,
            age__gt=60),

        rules.Event(
            descr='PROBLEM: persons too old at death',
            style=rules.Style(fill='red'),
            type=models.Event_Type.PK_death,
            role=models.Event_Type_Role.PK_principal,
            age__gt=110),

        rules.Event(
            descr='PROBLEM: persons too young at birth of child',
            style=rules.Style(fill='red'),
            type=models.Event_Type.PK_birth,
            role__in=(models.Event_Type_Role.PK_birth__father,
                      models.Event_Type_Role.PK_birth__mother),
            age__lt=17),

        rules.Implex(
            descr='person appears multiple times in ancestor tree of 2',
            of=2,
            style=rules.Style(fill='yellow'),
            count__gte=2),

        rules.Event(
            descr="Born or dead in La Baussaine before 1862",
            style=rules.Style(color="rgb(200,0,0)"),
            type__in=(models.Event_Type.PK_birth, models.Event_Type.PK_death),
            role=models.Event_Type_Role.PK_principal,
            date__lt="1940-01-01",
            place_name__icontains="baussaine"),

        rules.And(
            descr='All male ancestors of person 2',
            style=rules.Style(fill='#c6ebff', stroke='#1d4f67'),
            rules=[rules.Sex(sex="M"),
                   rules.Ancestor(of=2)]),

        rules.And(
            descr='All female ancestors of current decujus',
            style=rules.Style(fill='#e9daf1', stroke='#ff2080'),
            rules=[rules.Sex(sex="F"),
                   rules.Ancestor()]),

        rules.Event(
            descr='Died younger than 60',
            style=rules.Style(color='blue'),
            type=models.Event_Type.PK_death,
            role=models.Event_Type_Role.PK_principal,
            age__lt=60),

        rules.Default(
            descr="Set default style",
            style=rules.Style(stroke='black', fill='none')),

        # ("Foreign people in different color",
        #  RULE_EVENT,
        #  [("type", RULE_IS, models.Event_Type.PK_birth),
        #   ("role", RULE_IS, models.Event_Type_Role.PK_principal),
        #   ("place.country", RULE_IS_NOT, ""),
        #   ("place.country", RULE_CONTAINS_NOT_INSENSITIVE, "france")],
        #  {"fill": "#AAAAAA"}),

        # ("Person's with more than one marriage",
        #  RULE_EVENT,
        #  [("type", RULE_IS, models.Event_Type.PK_marriage),
        #   ("role", RULE_IS, models.Event_Type_Role.PK_principal),
        #   ("count", RULE_GREATER, 1)],
        #  {"fill": "rgb(0,155,0)"}),

        # ("All male descendants of person id=%s" % decujus,
        #  RULE_ATTR,
        #  [("descendant", RULE_IS, decujus), ("SEX", RULE_IS, "M")],
        #  {"fill": "#D6E0EA", "stroke": "#9CA3D4"}),

        # ("All female descendants of person id=%s" % decujus,
        #  RULE_ATTR,
        #  [("descendant", RULE_IS, decujus), ("SEX", RULE_IS, "F")],
        #  {"fill": "#E9DAF1", "stroke": "#fF2080"}),

        # ("Unknown father",
        #  RULE_ATTR,
        #  [("UNKNOWN_FATHER", RULE_IS, "Y")],
        #  {"color": "violet"}),

        # ("Unknown mother",
        #  RULE_ATTR,
        #  [("UNKNOWN_MOTHER", RULE_IS, "Y")],
        #  {"color": "violet"}),

        # ("Person's name is Delamote (case insensitive)",
        #  RULE_ATTR,
        #  [("surname", RULE_IS_INSENSITIVE, "delamotte")],
        #  {"color": "green"}),
    ]

# ??? Other rules that would be nice to have:
#   "Is descendant of ..."
#   "Project Explorer contains (or not) the person"
#   "Son's name is"
#   "Has sources", "Has sources with reliability >= "

"""
Various views related to displaying the pedgree of a person graphically
"""

from geneaprove import models
from geneaprove.views.styles import RULE_ATTR, RULE_EVENT, RULE_IN, RULE_IS, \
    RULE_IS_NOT, RULE_CONTAINS_NOT_INSENSITIVE, RULE_GREATER, \
    RULE_SMALLER, RULE_CONTAINS_INSENSITIVE, RULE_BEFORE, \
    RULE_SMALLER_EQUAL, RULE_IS_INSENSITIVE


def style_rules():
    return [
        ("Persons that are alive",
         RULE_ATTR,
         [("ALIVE", RULE_IS, "Y")],
         {"font-weight": "bold"}),

        ("Born or dead in La Baussaine before 1862",
         RULE_EVENT,
         [("type", RULE_IN,
           (models.Event_Type.PK_birth, models.Event_Type.PK_death)),
          ("place.name", RULE_CONTAINS_INSENSITIVE, "baussaine"),
          ("role", RULE_IS, models.Event_Type_Role.PK_principal),
          ("date", RULE_BEFORE, "1862")],
         {"color": "rgb(200,0,0)", "stroke": "black"}),

        ("Died younger than 60",
         RULE_EVENT,
         [("type", RULE_IS, models.Event_Type.PK_death),
          ("role", RULE_IS, models.Event_Type_Role.PK_principal),
          ("age", RULE_SMALLER_EQUAL, 60)],
         {"color": "blue"}),

        ("Person's age today is more than 80, and is alive",
         RULE_ATTR,
         [("age", RULE_GREATER, 80),
          ("ALIVE", RULE_IS, "Y")],
         {"color": "orange"}),

        ("Foreign people in different color",
         RULE_EVENT,
         [("type", RULE_IS, models.Event_Type.PK_birth),
          ("role", RULE_IS, models.Event_Type_Role.PK_principal),
          ("place.country", RULE_IS_NOT, ""),
          ("place.country", RULE_CONTAINS_NOT_INSENSITIVE, "france")],
         {"fill": "#AAAAAA"}),

        ("Person's with more than one marriage",
         RULE_EVENT,
         [("type", RULE_IS, models.Event_Type.PK_marriage),
          ("role", RULE_IS, models.Event_Type_Role.PK_principal),
          ("count", RULE_GREATER, 1)],
         {"fill": "rgb(0,155,0)"}),

        ("PROBLEM: Persons too young at birth of child",
         RULE_EVENT,
         [("type", RULE_IS, models.Event_Type.PK_birth),
          ("role", RULE_IN, (models.Event_Type_Role.PK_birth__father,
                             models.Event_Type_Role.PK_birth__mother)),
          ("age", RULE_SMALLER, 17)],
         {"fill": "red"}),

        ("PROBLEM: Persons too old at death",
         RULE_EVENT,
         [("type", RULE_IS, models.Event_Type.PK_death),
          ("role", RULE_IS, models.Event_Type_Role.PK_principal),
          ("age", RULE_GREATER, 110)],
         {"fill": "red"}),

        ("If the person appears multiple time in the current tree",
         RULE_ATTR,
         [("IMPLEX", RULE_GREATER, 1)],
         {"fill": "yellow"}),

        ("All male ancestors of person id=1",
         RULE_ATTR,
         [("ancestor", RULE_IS, 1), ("SEX", RULE_IS, "M")],
         {"fill": "#D6E0EA", "stroke": "#9CA3D4"}),

        ("All female ancestors of person id=1",
         RULE_ATTR,
         [("ancestor", RULE_IS, 1), ("SEX", RULE_IS, "F")],
         {"fill": "#E9DAF1", "stroke": "#fF2080"}),

        ("All male descendants of person id=1",
         RULE_ATTR,
         [("descendant", RULE_IS, 1), ("SEX", RULE_IS, "M")],
         {"fill": "#D6E0EA", "stroke": "#9CA3D4"}),

        ("All female descendants of person id=1",
         RULE_ATTR,
         [("descendant", RULE_IS, 1), ("SEX", RULE_IS, "F")],
         {"fill": "#E9DAF1", "stroke": "#fF2080"}),

        ("Unknown father",
         RULE_ATTR,
         [("UNKNOWN_FATHER", RULE_IS, "Y")],
         {"color": "violet"}),

        ("Unknown mother",
         RULE_ATTR,
         [("UNKNOWN_MOTHER", RULE_IS, "Y")],
         {"color": "violet"}),

        ("Person's name is Delamote (case insensitive)",
         RULE_ATTR,
         [("surname", RULE_IS_INSENSITIVE, "delamotte")],
         {"color": "green"}),
    ]

# ??? Other rules that would be nice to have:
#   "Is descendant of ..."
#   "Project Explorer contains (or not) the person"
#   "Son's name is"
#   "Has sources", "Has sources with reliability >= "

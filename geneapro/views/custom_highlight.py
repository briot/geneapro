"""
Various views related to displaying the pedgree of a person graphically
"""

from mysites.geneapro import models
from mysites.geneapro.views.styles import *

style_rules = [
    ("Persons that are alive",
     RULE_ATTR,
     [("ALIVE", RULE_IS, "Y")],
     {"font-weight":"bold"}),

    ("Born or dead in La Baussaine before 1862",
     RULE_EVENT,
     [("type",  RULE_IN,         (models.Event_Type.birth,
                                 models.Event_Type.death)),
      ("place.name", RULE_CONTAINS_INSENSITIVE, "baussaine"),
      ("role",  RULE_IS,         models.Event_Type_Role.principal),
      ("date",  RULE_BEFORE,     "1862")],
     {"color":"red"}),

    ("Died younger than 60",
     RULE_EVENT,
     [("type", RULE_IS, models.Event_Type.death),
      ("role", RULE_IS, models.Event_Type_Role.principal),
      ("age",  RULE_SMALLER_EQUAL, 60)],
     {"color":"blue"}),

    ("Person's age today is more than 80, and is alive",
     RULE_ATTR,
     [("age",   RULE_GREATER, 80),
      ("ALIVE", RULE_IS,      "Y")],
     {"color":"orange"}),

    ("Foreign people in different color",
     RULE_EVENT,
     [("type", RULE_IS, models.Event_Type.birth),
      ("role", RULE_IS, models.Event_Type_Role.principal),
      ("place.country", RULE_IS_NOT, ""),
      ("place.country", RULE_CONTAINS_NOT_INSENSITIVE, "france")],
     {"fill":"#AAAAAA"}),

    ("Person's with more than one marriage",
     RULE_EVENT,
     [("type",  RULE_IS, models.Event_Type.marriage),
      ("role",  RULE_IS, models.Event_Type_Role.principal),
      ("count", RULE_GREATER, 1)],
     {"fill":"#AA0000"}),

    ("PROBLEM: Persons too young at birth of child",
     RULE_EVENT,
     [("type", RULE_IS, models.Event_Type.birth),
      ("role", RULE_IN, (models.Event_Type_Role.birth__father,
                         models.Event_Type_Role.birth__mother)),
      ("age",  RULE_SMALLER, 17)],
     {"fill":"red"}),

    ("PROBLEM: Persons too old at death",
     RULE_EVENT,
     [("type", RULE_IS, models.Event_Type.death),
      ("role", RULE_IS, models.Event_Type_Role.principal),
      ("age",  RULE_GREATER, 110)],
     {"fill":"red"}),

    ("If the person appears multiple time in the current tree",
     RULE_ATTR,
     [("IMPLEX", RULE_GREATER, 1)],
     {"fill":"yellow"}),

    ("All male ancestors of person id=1",
     RULE_ATTR,
     [("ancestor", RULE_IS, 1), ("SEX", RULE_IS, "M")],
     {"fill":"#D6E0EA", "stroke":"#9CA3D4"}),

    ("All female ancestors of person id=1",
     RULE_ATTR,
     [("ancestor", RULE_IS, 1), ("SEX", RULE_IS, "F")],
     {"fill":"#E9DAF1", "stroke":"#fF2080"}),

    ("All male descendants of person id=1",
     RULE_ATTR,
     [("descendant", RULE_IS, 1), ("SEX", RULE_IS, "M")],
     {"fill":"#D6E0EA", "stroke":"#9CA3D4"}),

    ("All female descendants of person id=1",
     RULE_ATTR,
     [("descendant", RULE_IS, 1), ("SEX", RULE_IS, "F")],
     {"fill":"#E9DAF1", "stroke":"#fF2080"}),

    ("Unknown father",
     RULE_ATTR,
     [("UNKNOWN_FATHER", RULE_IS, "Y")],
     {"color":"violet"}),

    ("Unknown mother",
     RULE_ATTR,
     [("UNKNOWN_MOTHER", RULE_IS, "Y")],
     {"color":"violet"}),

    ("Person's name is Delamote (case insensitive)",
     RULE_ATTR,
     [("surname", RULE_IS_INSENSITIVE, "delamotte")],
     {"color":"green"}),
]

# ??? Other rules that would be nice to have:
#   "Is descendant of ..."
#   "Project Explorer contains (or not) the person"
#   "Son's name is"
#   "Has sources", "Has sources with reliability >= "

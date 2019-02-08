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
            descr="Not-French people",
            style=rules.Style(fill='#AAAAAA'),
            type=models.Event_Type.PK_birth,
            role=models.Event_Type_Role.PK_principal,
            place_name__icontains_not="france"),
            # place_country__icontains_not="france"),
#
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
            rules=[rules.Characteristic(
                       type=models.Characteristic_Part_Type.PK_sex,
                       value__iexact="M"),
                   rules.Ancestor(of=2)]),

        rules.And(
            descr='All female ancestors of current decujus',
            style=rules.Style(fill='#e9daf1', stroke='#ff2080'),
            rules=[rules.Characteristic(
                       type=models.Characteristic_Part_Type.PK_sex,
                       value__iexact="F"),
                   rules.Ancestor()]),

        rules.Event(
            descr='Died younger than 60',
            style=rules.Style(color='blue'),
            type=models.Event_Type.PK_death,
            role=models.Event_Type_Role.PK_principal,
            age__lt=60),

        rules.Descendants(
            descr='All descendants of person 2',
            style=rules.Style(fill='#06e0ea', stroke='#9ca3d4'),
            of=2),

        rules.Known_Father(
            descr='Unknown father',
            equal=False,
            style=rules.Style(color='violet')),
        rules.Known_Mother(
            descr='Unknown mother',
            equal=False,
            style=rules.Style(color='violet')),

        rules.Characteristic(
            descr="Person's whose surname is Poidevin",
            type=models.Characteristic_Part_Type.PK_surname,
            value__iexact="poidevin",
            style=rules.Style(color='green')),

        rules.Event(
            descr="Perons with more than one marriage",
            style=rules.Style(fill='rgb(0,155,0)'),
            type=models.Event_Type.PK_marriage,
            role=models.Event_Type_Role.PK_principal,
            count__gt=1),

        rules.Default(
            descr="Set default style",
            style=rules.Style(stroke='black', fill='none')),

    ]

# ??? Other rules that would be nice to have:
#   "Has sources", "Has sources with reliability >= "

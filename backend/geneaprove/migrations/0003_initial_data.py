# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def forward(apps, schema_editor):
    Surety_Scheme = apps.get_model('geneaprove', 'Surety_Scheme')
    SSPart = apps.get_model('geneaprove', 'Surety_Scheme_Part')
    PPart = apps.get_model('geneaprove', 'Place_Part_Type')
    RType = apps.get_model('geneaprove', 'Repository_Type')
    EType = apps.get_model('geneaprove', 'Event_Type')
    ETRole = apps.get_model('geneaprove', 'Event_Type_Role')
    CPT = apps.get_model('geneaprove', 'Characteristic_Part_Type')
    CIT = apps.get_model('geneaprove', 'Citation_Part_Type')
    GT = apps.get_model('geneaprove', 'Group_Type')
    db_alias = schema_editor.connection.alias

    s = Surety_Scheme(
        description="This is the default surety scheme, based on five levels of certainty",
        name="Default scheme")
    s.save()
    SSPart.objects.using(db_alias).bulk_create([
        SSPart(name="very high", scheme=s, sequence_number=5),
        SSPart(name="high",      scheme=s, sequence_number=4),
        SSPart(name="normal",    scheme=s, sequence_number=3),
        SSPart(name="low",       scheme=s, sequence_number=2),
        SSPart(name="very low",  scheme=s, sequence_number=1)])

    PPart.objects.using(db_alias).bulk_create([
        PPart(gedcom="ADR1",     name="address"),
        PPart(gedcom="ADR2",     name="address2"),
        PPart(gedcom="CITY",     name="city"),
        PPart(gedcom="CTRY",     name="country"),
        PPart(gedcom="",         name="county"),
        PPart(gedcom="MAP",      name="GPS coordinates"),
        PPart(gedcom="",         name="monument"),
        PPart(gedcom="",         name="province"),
        PPart(gedcom="STAE",     name="state"),
        PPart(gedcom="POST",     name="zipcode"),
        PPart(gedcom="WWW",      name="website"),
        PPart(gedcom="EMAIL",    name="email"),
        PPart(gedcom="FAX",      name="fax"),
        PPart(gedcom="WEB",      name="website"),
        PPart(gedcom="NOTE",     name="note"),
        PPart(gedcom="FORM",     name="place hierarchy"),
    ])

    CIT.objects.using(db_alias).bulk_create([
        CIT(gedcom='TITL',       name='title'),
        CIT(gedcom='CHAN',       name='last change'),
        CIT(gedcom='DATE',       name='date'),
        CIT(gedcom='PAGE',       name='page'),
        CIT(gedcom='QUAY',       name='quality'),
        CIT(gedcom='TEXT',       name='text'),
        CIT(gedcom='AUTH',       name='author'),
        CIT(gedcom='PUBL',       name='publisher')])

    RType.objects.using(db_alias).bulk_create([
        RType(description="",         name="album"),
        RType(description="",         name="archive"),
        RType(description="",         name="bookstore"),
        RType(description="",         name="cemetery"),
        RType(description="",         name="church"),
        RType(description="",         name="collection"),
        RType(description="",         name="library"),
        RType(description="",         name="web site")])

    EType.objects.using(db_alias).bulk_create([
        EType(gedcom="",         name="acquittal"),
        EType(gedcom="ADOP",     name="adoption"),
        EType(gedcom="CHRA",     name="adult christening"),
        EType(gedcom="ANUL",     name="annulment"),
        EType(gedcom="",         name="arrest"),
        EType(gedcom="BAPM",     name="baptism"),
        EType(gedcom="BARM",     name="bar mitzvah"),
        EType(gedcom="BASM",     name="bas mitzvah"),
        EType(gedcom="BIRT",     name="birth"),
        EType(gedcom="BLES",     name="blessing"),
        EType(gedcom="BURI",     name="burial"),
        EType(gedcom="CENS",     name="census"),
        EType(gedcom="CHR",      name="christening"),
        EType(gedcom="",         name="civil union"),
        EType(gedcom="CONF",     name="confirmation"),
        EType(gedcom="",         name="conviction"),
        EType(gedcom="CREM",     name="cremation"),
        EType(gedcom="DEAT",     name="death"),
        EType(gedcom="DIV",      name="divorce"),
        EType(gedcom="DIVF",     name="divorce filed"),
        EType(gedcom="EMIG",     name="emigration"),
        EType(gedcom="ENGA",     name="engagement"),
        EType(gedcom="FCOM",     name="first communion"),
        EType(gedcom="GRAD",     name="graduation"),
        EType(gedcom="IMMI",     name="immigration"),
        EType(gedcom="",         name="indictement"),
        EType(gedcom="MARB",     name="marriage bans"),
        EType(gedcom="MARR",     name="marriage"),
        EType(gedcom="MARC",     name="marriage contract"),
        EType(gedcom="MARL",     name="marriage license"),
        EType(gedcom="MARS",     name="marriage settlement"),
        EType(gedcom="_MIL",     name="military service"),
        EType(gedcom="EDUC",     name="education"),
        EType(gedcom="_DEG",     name="diploma"),
        EType(gedcom="NATU",     name="naturalization"),
        EType(gedcom="ORDN",     name="ordination"),
        EType(gedcom="EVEN",     name="other event"),
        EType(gedcom="PROB",     name="probate"),
        EType(gedcom="",         name="religious conversion"),
        EType(gedcom="RESI",     name="residence"),
        EType(gedcom="RETI",     name="retirement"),
        EType(gedcom="",         name="voyage"),
        EType(gedcom="WILL",     name="will")])

    birth = EType.objects.get(gedcom="BIRT")
    adoption = EType.objects.get(gedcom="ADOP")

    ETRole.objects.using(db_alias).bulk_create([
        ETRole(name="principal",   type=None),
        ETRole(name="father",      type=birth),
        ETRole(name="mother",      type=birth),
        ETRole(name="adopting",    type=adoption),
        ETRole(name="not adopting", type=adoption),
    ])

    CPT.objects.using(db_alias).bulk_create([
        CPT(gedcom="",          is_name_part=False,  name="address"),
        CPT(gedcom="NOTE",      is_name_part=False,  name="note"),
        CPT(gedcom="FACT",      is_name_part=False,  name="other"),
        CPT(gedcom="_IMG",      is_name_part=False,  name="image"),
        CPT(gedcom="OCCU",      is_name_part=False,  name="occupation"),
        CPT(gedcom="",          is_name_part=False,  name="AFN"),
        CPT(gedcom="",          is_name_part=False,  name="cause of death"),
        CPT(gedcom="CAST",      is_name_part=False,  name="cast name"),
        CPT(gedcom="PROP",      is_name_part=False,  name="property (real-estate,...)"),
        CPT(gedcom="",          is_name_part=False,  name="email"),
        CPT(gedcom="",          is_name_part=False,  name="ethnicity"),
        CPT(gedcom="",          is_name_part=False,  name="language"),
        CPT(gedcom="",          is_name_part=False,  name="literacy"),
        CPT(gedcom="",          is_name_part=False,  name="living"),
        CPT(gedcom="",          is_name_part=False,  name="marital status"),
        CPT(gedcom="",          is_name_part=False,  name="medical condition"),
        CPT(gedcom="",          is_name_part=False,  name="nationality"),
        CPT(gedcom="NCHI",      is_name_part=False,  name="number of children"),
        CPT(gedcom="NMR",       is_name_part=False,  name="number of marriages"),
        CPT(gedcom="",          is_name_part=False,  name="patronymic"),
        CPT(gedcom="",          is_name_part=False,  name="personality"),
        CPT(gedcom="DSCR",      is_name_part=False,  name="physical description"),
        CPT(gedcom="RELI",      is_name_part=False,  name="religion"),
        CPT(gedcom="IDNO",      is_name_part=False,  name="national identification number"),
        CPT(gedcom="NATI",      is_name_part=False,  name="national or tribe origin"),
        CPT(gedcom="RFN",       is_name_part=False,  name="record file number"),
        CPT(gedcom="AFN",       is_name_part=False,  name="ancestral file number"),
        CPT(gedcom="RIN",       is_name_part=False,  name="RIN"),
        CPT(gedcom="SEX",       is_name_part=False,  name="sex"),
        CPT(gedcom="TYPE",      is_name_part=False,  name="type"),
        CPT(gedcom="SSN",       is_name_part=False,
            name="social security number"),
        CPT(gedcom="",          is_name_part=False,  name="telephone"),
        CPT(gedcom="TITL",      is_name_part=False,  name="title"),
        CPT(gedcom="REFN",      is_name_part=False,  name="reference number"),
        CPT(gedcom="",          is_name_part=True,   name="dit name"),
        CPT(gedcom="",          is_name_part=True,   name="farm name"),
        CPT(gedcom="",          is_name_part=True,   name="matronymic name"),
        CPT(gedcom="",          is_name_part=True,   name="mononame"),
        CPT(gedcom="SURN",      is_name_part=True,   name="surname"),
        CPT(gedcom="GIVN",      is_name_part=True,   name="given name"),
        CPT(gedcom="_MIDL",     is_name_part=True,   name="middle name"),
        CPT(gedcom="NPFX",      is_name_part=True,   name="name prefix"),
        CPT(gedcom="NICK",      is_name_part=True,   name="nickname"),
        CPT(gedcom="SPFX",      is_name_part=True,   name="surname prefix"),
        CPT(gedcom="NSFX",      is_name_part=True,   name="name suffix"),
        CPT(gedcom="",          is_name_part=True,   name="religious name")])

    GT.objects.using(db_alias).bulk_create([
        GT(gedcom="",         name="association"),
        GT(gedcom="",         name="caste"),
        GT(gedcom="",         name="children of union"),
        GT(gedcom="",         name="friends"),
        GT(gedcom="",         name="neighbors"),
        GT(gedcom="",         name="passenger list"),
        GT(gedcom="",         name="passengers"),
        GT(gedcom="",         name="same person")])


class Migration(migrations.Migration):
    dependencies = [
        ('geneaprove', '0002_auto_20180314_0957')
    ]
    operations = [
        migrations.RunPython(forward)
    ]

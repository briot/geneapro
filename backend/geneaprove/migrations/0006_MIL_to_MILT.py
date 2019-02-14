# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def forward(apps, schema_editor):
    EType = apps.get_model('geneaprove', 'Event_Type')

    m = EType.objects.get(gedcom='_MIL')
    m.gedcom = '_MILT'
    m.save()

    # EType.objects.using(db_alias).bulk_create([
    #     EType(gedcom="_MILT",     name="military service"),
    # ])


class Migration(migrations.Migration):
    dependencies = [
        ('geneaprove', '0004_create_p2p_type'),
    ]
    operations = [
        migrations.RunPython(forward)
    ]

# Generated by Django 3.0.2 on 2022-06-14 20:08

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('geneaprove', '0010_auto_20220601_2141'),
    ]

    operations = [
        migrations.AddField(
            model_name='repository',
            name='last_change',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
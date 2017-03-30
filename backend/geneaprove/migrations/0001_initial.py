# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-03-30 19:53
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Activity',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('scheduled_date', models.DateField(null=True)),
                ('completed_date', models.DateField(null=True)),
                ('is_admin', models.BooleanField(default=False, help_text='True if this is an administrative task (see matching table), or False if this is a search to perform')),
                ('status', models.TextField(help_text='Could be either completed, on hold,...', null=True)),
                ('description', models.TextField(null=True)),
                ('priority', models.IntegerField(default=0)),
                ('comments', models.TextField(null=True)),
            ],
            options={
                'db_table': 'activity',
                'ordering': ('scheduled_date', 'completed_date'),
            },
        ),
        migrations.CreateModel(
            name='Assertion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('rationale', models.TextField(help_text='Explains why the assertion (deduction, comments,...)', null=True)),
                ('disproved', models.BooleanField(default=False)),
                ('last_change', models.DateTimeField(default=django.utils.timezone.now, help_text='When was the assertion last modified')),
            ],
            options={
                'db_table': 'assertion',
            },
        ),
        migrations.CreateModel(
            name='Assertion_Assertion',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('sequence_number', models.IntegerField(default=1)),
            ],
            options={
                'db_table': 'assertion_assertion',
                'ordering': ('sequence_number',),
            },
        ),
        migrations.CreateModel(
            name='Characteristic',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField(help_text='Name of the characteristic. This could be guessed from its parts only if there is one of the latter, so we store it here')),
                ('date', models.CharField(help_text='Date as read in the original source', max_length=100, null=True)),
                ('date_sort', models.CharField(help_text='Date, parsed automatically', max_length=100, null=True)),
            ],
            options={
                'db_table': 'characteristic',
            },
        ),
        migrations.CreateModel(
            name='Characteristic_Part',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('sequence_number', models.IntegerField(default=1)),
                ('characteristic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parts', to='geneaprove.Characteristic')),
            ],
            options={
                'db_table': 'characteristic_part',
                'ordering': ('sequence_number', 'name'),
            },
        ),
        migrations.CreateModel(
            name='Characteristic_Part_Type',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('gedcom', models.CharField(blank=True, help_text='Name in Gedcom files', max_length=15)),
                ('is_name_part', models.BooleanField(default=False)),
            ],
            options={
                'db_table': 'characteristic_part_type',
            },
        ),
        migrations.CreateModel(
            name='Citation_Part',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('value', models.TextField()),
            ],
            options={
                'db_table': 'citation_part',
            },
        ),
        migrations.CreateModel(
            name='Citation_Part_Type',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('gedcom', models.CharField(blank=True, help_text='Name in Gedcom files', max_length=15)),
            ],
            options={
                'db_table': 'citation_part_type',
            },
        ),
        migrations.CreateModel(
            name='Config',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('schema_version', models.IntegerField(default=1, editable=False, help_text='Version number of this database. Used to detect what updates need to be performed')),
            ],
            options={
                'db_table': 'config',
            },
        ),
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('date', models.CharField(help_text='Date of the event, as found in original source', max_length=100, null=True)),
                ('date_sort', models.CharField(help_text='Date of the event, parsed automatically', max_length=100, null=True)),
            ],
            options={
                'db_table': 'event',
            },
        ),
        migrations.CreateModel(
            name='Event_Type',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('gedcom', models.CharField(blank=True, help_text='Name in Gedcom files', max_length=15)),
            ],
            options={
                'db_table': 'event_type',
            },
        ),
        migrations.CreateModel(
            name='Event_Type_Role',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50)),
                ('type', models.ForeignKey(blank=True, help_text='The event type for which the role is defined. If unset, this applies to all events', null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Event_Type')),
            ],
            options={
                'db_table': 'event_type_role',
            },
        ),
        migrations.CreateModel(
            name='Group',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('date', models.CharField(help_text='Date, as found in original source', max_length=100, null=True)),
                ('date_sort', models.CharField(help_text='Date, parsed automatically', max_length=100, null=True)),
                ('criteria', models.TextField(help_text='The criteria for admission in a group. For instance, one group might be all neighbors listed in a particular document, and another group might be a similar group listed in another document, or same document at a different time', null=True)),
            ],
            options={
                'db_table': 'group',
            },
        ),
        migrations.CreateModel(
            name='Group_Type',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('gedcom', models.CharField(blank=True, help_text='Name in Gedcom files', max_length=15)),
            ],
            options={
                'db_table': 'group_type',
            },
        ),
        migrations.CreateModel(
            name='Group_Type_Role',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('sequence_number', models.IntegerField(default=1)),
                ('type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roles', to='geneaprove.Group_Type')),
            ],
            options={
                'db_table': 'group_type_role',
                'ordering': ('sequence_number', 'name'),
            },
        ),
        migrations.CreateModel(
            name='Persona',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('description', models.TextField(null=True)),
                ('last_change', models.DateTimeField(default=django.utils.timezone.now)),
            ],
            options={
                'db_table': 'persona',
            },
        ),
        migrations.CreateModel(
            name='Place',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.CharField(help_text='Date as found in original source', max_length=100, null=True)),
                ('date_sort', models.CharField(help_text='Date parsed automatically', max_length=100, null=True)),
                ('name', models.CharField(help_text='Short description of the place', max_length=100)),
                ('parent_place', models.ForeignKey(help_text='The parent place, that contains this one', null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Place')),
            ],
            options={
                'db_table': 'place',
                'ordering': ('date_sort',),
            },
        ),
        migrations.CreateModel(
            name='Place_Part',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('sequence_number', models.PositiveSmallIntegerField(default=1, verbose_name='Sequence number')),
                ('place', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parts', to='geneaprove.Place')),
            ],
            options={
                'db_table': 'place_part',
                'ordering': ('sequence_number', 'name'),
            },
        ),
        migrations.CreateModel(
            name='Place_Part_Type',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('gedcom', models.CharField(blank=True, help_text='Name in Gedcom files', max_length=15)),
            ],
            options={
                'db_table': 'place_part_type',
            },
        ),
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(null=True)),
                ('client_data', models.TextField(help_text='The client for which the project is undertaken. In general this will be the researched himself', null=True)),
            ],
            options={
                'db_table': 'project',
            },
        ),
        migrations.CreateModel(
            name='Repository',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('info', models.TextField(null=True)),
                ('addr', models.TextField(null=True)),
                ('place', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Place')),
            ],
            options={
                'db_table': 'repository',
            },
        ),
        migrations.CreateModel(
            name='Repository_Source',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('call_number', models.CharField(max_length=200, null=True)),
                ('description', models.TextField(null=True)),
                ('activity', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Activity')),
                ('repository', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Repository')),
            ],
            options={
                'db_table': 'repository_source',
            },
        ),
        migrations.CreateModel(
            name='Repository_Type',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
            ],
            options={
                'db_table': 'repository_type',
                'ordering': ('name',),
            },
        ),
        migrations.CreateModel(
            name='Representation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('mime_type', models.CharField(max_length=40)),
                ('file', models.TextField()),
                ('comments', models.TextField(null=True)),
            ],
            options={
                'db_table': 'representation',
            },
        ),
        migrations.CreateModel(
            name='Research_Objective',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(null=True)),
                ('sequence_number', models.IntegerField(default=1)),
                ('priority', models.IntegerField(default=0)),
                ('status', models.TextField(null=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Project')),
            ],
            options={
                'db_table': 'research_objective',
                'ordering': ('sequence_number', 'name'),
            },
        ),
        migrations.CreateModel(
            name='Researcher',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('comment', models.TextField(help_text='Contact information for this researcher, like email or postal addresses,...', null=True)),
            ],
            options={
                'db_table': 'researcher',
            },
        ),
        migrations.CreateModel(
            name='Researcher_Project',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.TextField(help_text='Role that the researcher plays for that project', null=True)),
                ('project', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Project')),
                ('researcher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Researcher')),
            ],
            options={
                'db_table': 'researched_project',
            },
        ),
        migrations.CreateModel(
            name='Search',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('searched_for', models.TextField(null=True)),
                ('activity', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Activity')),
                ('repository', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Repository')),
            ],
            options={
                'db_table': 'search',
            },
        ),
        migrations.CreateModel(
            name='Source',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject_date', models.CharField(help_text='the date of the subject. Note that the dates might be different for the various levels of source (a range of dates for a book, and a specific date for an extract for instance). This field contains the date as found in the original document. subject_date_sort stores the actual computed from subject_date, for sorting purposes', max_length=100, null=True)),
                ('subject_date_sort', models.CharField(help_text='Date parsed automatically', max_length=100, null=True)),
                ('medium', models.TextField(help_text='The type of the source, used to construct the citation.\nThe value for this field is the key into the citations.py dictionary that\ndocuments the citation styles.', null=True)),
                ('title', models.TextField(default='Untitled', help_text='The (possibly computed) full citation for this source', null=True)),
                ('abbrev', models.TextField(default='Untitled', help_text='An (possibly computed) abbreviated citation', null=True)),
                ('biblio', models.TextField(default='Untitled', help_text='Full citation for a bibliography', null=True)),
                ('comments', models.TextField(null=True)),
                ('last_change', models.DateTimeField(default=django.utils.timezone.now)),
                ('higher_source', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='lower_sources', to='geneaprove.Source')),
                ('jurisdiction_place', models.ForeignKey(help_text='Example: a record in North Carolina describes a person and their activities in Georgia. Georgia is the subject place, whereas NC is the jurisdiction place', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='jurisdiction_for', to='geneaprove.Place')),
                ('repositories', models.ManyToManyField(related_name='sources', through='geneaprove.Repository_Source', to='geneaprove.Repository')),
                ('researcher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Researcher')),
                ('subject_place', models.ForeignKey(help_text='Where the event described in the source takes place', null=True, on_delete=django.db.models.deletion.CASCADE, related_name='sources', to='geneaprove.Place')),
            ],
            options={
                'db_table': 'source',
            },
        ),
        migrations.CreateModel(
            name='Source_Group',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('sources', models.ManyToManyField(related_name='groups', to='geneaprove.Source')),
            ],
            options={
                'db_table': 'source_group',
            },
        ),
        migrations.CreateModel(
            name='Surety_Scheme',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(null=True)),
            ],
            options={
                'db_table': 'surety_scheme',
            },
        ),
        migrations.CreateModel(
            name='Surety_Scheme_Part',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('sequence_number', models.IntegerField(default=1)),
                ('scheme', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parts', to='geneaprove.Surety_Scheme')),
            ],
            options={
                'db_table': 'surety_scheme_part',
                'ordering': ('sequence_number', 'name'),
            },
        ),
        migrations.CreateModel(
            name='P2C',
            fields=[
                ('assertion_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='geneaprove.Assertion')),
            ],
            options={
                'db_table': 'p2c',
            },
            bases=('geneaprove.assertion',),
        ),
        migrations.CreateModel(
            name='P2E',
            fields=[
                ('assertion_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='geneaprove.Assertion')),
            ],
            options={
                'db_table': 'p2e',
            },
            bases=('geneaprove.assertion',),
        ),
        migrations.CreateModel(
            name='P2G',
            fields=[
                ('assertion_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='geneaprove.Assertion')),
            ],
            options={
                'db_table': 'p2g',
            },
            bases=('geneaprove.assertion',),
        ),
        migrations.CreateModel(
            name='P2P',
            fields=[
                ('assertion_ptr', models.OneToOneField(auto_created=True, on_delete=django.db.models.deletion.CASCADE, parent_link=True, primary_key=True, serialize=False, to='geneaprove.Assertion')),
                ('type', models.IntegerField()),
                ('person1', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sameAs1', to='geneaprove.Persona')),
                ('person2', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sameAs2', to='geneaprove.Persona')),
            ],
            options={
                'db_table': 'p2p',
            },
            bases=('geneaprove.assertion',),
        ),
        migrations.AddField(
            model_name='search',
            name='source',
            field=models.ForeignKey(help_text='The source in which the search was conducted. It could be null if this was a general search in a repository for instance', null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Source'),
        ),
        migrations.AddField(
            model_name='representation',
            name='source',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='representations', to='geneaprove.Source'),
        ),
        migrations.AddField(
            model_name='repository_source',
            name='source',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Source'),
        ),
        migrations.AddField(
            model_name='repository',
            name='type',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Repository_Type'),
        ),
        migrations.AddField(
            model_name='project',
            name='researchers',
            field=models.ManyToManyField(through='geneaprove.Researcher_Project', to='geneaprove.Researcher'),
        ),
        migrations.AddField(
            model_name='project',
            name='scheme',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Surety_Scheme'),
        ),
        migrations.AddField(
            model_name='place_part',
            name='type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Place_Part_Type'),
        ),
        migrations.AddField(
            model_name='group',
            name='place',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Place'),
        ),
        migrations.AddField(
            model_name='group',
            name='type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Group_Type'),
        ),
        migrations.AddField(
            model_name='event',
            name='place',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Place'),
        ),
        migrations.AddField(
            model_name='event',
            name='type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Event_Type'),
        ),
        migrations.AddField(
            model_name='citation_part',
            name='source',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parts', to='geneaprove.Source'),
        ),
        migrations.AddField(
            model_name='citation_part',
            name='type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Citation_Part_Type'),
        ),
        migrations.AddField(
            model_name='characteristic_part',
            name='type',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Characteristic_Part_Type'),
        ),
        migrations.AddField(
            model_name='characteristic',
            name='place',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Place'),
        ),
        migrations.AddField(
            model_name='assertion_assertion',
            name='deduction',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='deducted_from', to='geneaprove.Assertion'),
        ),
        migrations.AddField(
            model_name='assertion_assertion',
            name='original',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='leads_to', to='geneaprove.Assertion'),
        ),
        migrations.AddField(
            model_name='assertion',
            name='researcher',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Researcher'),
        ),
        migrations.AddField(
            model_name='assertion',
            name='source',
            field=models.ForeignKey(help_text='An assertion comes from no more than one source. It can also come from one or more other assertions through the assertion_assertion table, in which case source_id is null', null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Source'),
        ),
        migrations.AddField(
            model_name='assertion',
            name='surety',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Surety_Scheme_Part'),
        ),
        migrations.AddField(
            model_name='activity',
            name='objectives',
            field=models.ManyToManyField(to='geneaprove.Research_Objective'),
        ),
        migrations.AddField(
            model_name='activity',
            name='researcher',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Researcher'),
        ),
        migrations.AlterUniqueTogether(
            name='researcher_project',
            unique_together=set([('researcher', 'project')]),
        ),
        migrations.AddField(
            model_name='p2g',
            name='group',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='personas', to='geneaprove.Group'),
        ),
        migrations.AddField(
            model_name='p2g',
            name='person',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='groups', to='geneaprove.Persona'),
        ),
        migrations.AddField(
            model_name='p2g',
            name='role',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Group_Type_Role'),
        ),
        migrations.AddField(
            model_name='p2e',
            name='event',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='actors', to='geneaprove.Event'),
        ),
        migrations.AddField(
            model_name='p2e',
            name='person',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='events', to='geneaprove.Persona'),
        ),
        migrations.AddField(
            model_name='p2e',
            name='role',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='geneaprove.Event_Type_Role'),
        ),
        migrations.AddField(
            model_name='p2c',
            name='characteristic',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='persons', to='geneaprove.Characteristic'),
        ),
        migrations.AddField(
            model_name='p2c',
            name='person',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='characteristics', to='geneaprove.Persona'),
        ),
    ]

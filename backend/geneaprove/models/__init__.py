"""
The data model for our application.
In addition to all the standard django properties, the classes here can
define an addition to_json method that should return a version of the
object appropriate for use by simplejson. For instance:
   class Persona (models.Model):
      name = models.CharField (max_length=10)
      def to_json (self):
         return {"name": self.name}
"""

from django.db import models, connection
import django.utils.timezone
from .asserts import Assertion, P2P, P2C, P2E, P2G, Assertion_Assertion
from .characteristic import Characteristic_Part_Type, \
    Characteristic, Characteristic_Part
from .event import Event_Type, Event_Type_Role, Event
from .group import Group_Type, Group_Type_Role, Group
from .persona import Persona
from .place import Place, Place_Part_Type, Place_Part
from .representation import Representation
from .repository import Repository, Repository_Type
from .researcher import Researcher
from .source import Source, Citation_Part_Type, Citation_Part
from .surety import Surety_Scheme, Surety_Scheme_Part
from .base import GeneaProveModel, Part_Type


class Config(GeneaProveModel):
    """
    This table contains general information on the setup of the database
    """

    schema_version = models.IntegerField(
        editable=False, default=1,
        help_text="Version number of this database. Used to detect what"
        " updates need to be performed")

    class Meta:
        """Meta data for the model"""
        db_table = "config"


class Project (GeneaProveModel):

    """
    This table describes one of the project that a researcher is working
    on. It could be something as simple as "my genealogy", or a more detailed
    description
    """

    researchers = models.ManyToManyField(Researcher,
                                         through="Researcher_Project")
    name = models.CharField(max_length=100)
    description = models.TextField(null=True)
    scheme = models.ForeignKey(Surety_Scheme, default=1)
    client_data = models.TextField(
        null=True,
        help_text="The client for which the project is undertaken. In general"
        " this will be the researched himself")

    def __str__(self):
        return "name=" + self.name

    class Meta:

        """Meta data for the model"""
        db_table = "project"


class Researcher_Project (GeneaProveModel):

    """
    A project is conducted by one or more researchers, and a
    given researcher might be working simulatenously on several projects.
    """

    researcher = models.ForeignKey(Researcher, null=False)
    project = models.ForeignKey(Project)
    role = models.TextField(
        null=True,
        help_text="Role that the researcher plays for that project")

    class Meta:

        """Meta data for the model"""
        unique_together = (("researcher", "project"))
        db_table = "researched_project"


class Research_Objective (GeneaProveModel):

    """
    Contains comments about one objective that the researcher has
    determined is appropriate for a project. This could for instance be
    "find the father of x".
    An objective is accomplished in terms of activities.
    """

    project = models.ForeignKey(Project)
    name = models.CharField(max_length=100)
    description = models.TextField(null=True)
    sequence_number = models.IntegerField(default=1)
    priority = models.IntegerField(default=0)
    status = models.TextField(null=True)

    class Meta:

        """Meta data for the model"""
        ordering = ("sequence_number", "name")
        db_table = "research_objective"


class Activity (GeneaProveModel):

    """
    An activity allows a researcher to translate a Research_Objective
    into a specific action item
    """

    objectives = models.ManyToManyField(Research_Objective)
    researcher = models.ForeignKey(Researcher, null=True)
    scheduled_date = models.DateField(null=True)
    completed_date = models.DateField(null=True)
    is_admin = models.BooleanField(
        default=False,
        help_text="True if this is an administrative task (see matching"
        " table), or False if this is a search to perform")
    status = models.TextField(
        null=True,
        help_text="Could be either completed, on hold,...")
    description = models.TextField(null=True)
    priority = models.IntegerField(default=0)
    comments = models.TextField(null=True)

    class Meta:

        """Meta data for the model"""
        ordering = ("scheduled_date", "completed_date")
        db_table = "activity"


class Repository_Source (GeneaProveModel):

    """
    Links repositories to the sources they contains, and the sources to
    all the possible repositories where they are found
    """

    repository = models.ForeignKey(Repository)
    source = models.ForeignKey(Source)
    activity = models.ForeignKey(Activity, null=True)
    call_number = models.CharField(max_length=200, null=True)
    description = models.TextField(null=True)

    class Meta:

        """Meta data for the model"""
        db_table = "repository_source"


class Search (GeneaProveModel):

    """
    A specific examination of a source to find information. This is
    usually linked to a research_objective, through an activity, but not
    necessarily, if for instance this is an unexpected opportunity
    """

    activity = models.ForeignKey(Activity, null=True)
    source = models.ForeignKey(
        Source, null=True,
        help_text="The source in which the search was conducted. It could"
        " be null if this was a general search in a repository for"
        " instance")
    repository = models.ForeignKey(Repository)
    searched_for = models.TextField(null=True)

    class Meta:
        """Meta data for the model"""
        db_table = "search"


class Source_Group (GeneaProveModel):

    """
    This can be used to group sources into groups relevant to the user,
    such as "wills", "census",... or "new england sources" for instance
    """

    sources = models.ManyToManyField(Source, related_name="groups")
    name = models.CharField(max_length=100)

    class Meta:

        """Meta data for the model"""
        db_table = "source_group"


# This is used to help write custom SQL queries without hard-coding
# table or field names


def sql_table_name(cls):
    return connection.ops.quote_name(cls._meta.db_table)


def sql_field_name(cls, field_name):
    """Help write custom SQL queries"""
    if field_name == "pk":
        f = cls._meta.pk
    else:
        f = cls._meta.get_field(field_name)
    return "%s.%s" % (
        sql_table_name(cls), connection.ops.quote_name(f.column))


all_fields = {
    'char_part.name': sql_field_name(Characteristic_Part, "name"),
    'char_part':      sql_table_name(Characteristic_Part),
    'assert':         sql_table_name(Assertion),
    'p2c':            sql_table_name(P2C),
    'p2e':            sql_table_name(P2E),
    'char_part.char': sql_field_name(Characteristic_Part, "characteristic"),
    'assert.pk':      sql_field_name(Assertion, "pk"),
    'p2e.pk':         sql_field_name(P2E, "pk"),
    'p2c.pk':         sql_field_name(P2C, "pk"),
    'p2c.char':       sql_field_name(P2C, "characteristic"),
    'p2c.person':     sql_field_name(P2C, "person"),
    'p2e.person':     sql_field_name(P2E, "person"),
    'p2e.event':      sql_field_name(P2E, "event"),
    'p2e.role':       sql_field_name(P2E, "role"),
    'char_part.type': sql_field_name(Characteristic_Part, "type"),
    'persona.id': sql_field_name(Persona, "pk"),
    'event.date': sql_field_name(Event, "date"),
    'event':          sql_table_name(Event),
    'event.id':       sql_field_name(Event, "pk"),
    'event.type':     sql_field_name(Event, "type"),
}

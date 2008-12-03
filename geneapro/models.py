# ??? Prevent edition of date_sort, and set it when date is modified

from django.db import models

class Config (models.Model):
    """
    This table contains general information on the setup of the database
    """

    schema_version = models.IntegerField (editable=False, default=1,
       help_text="Version number of this database. Used to detect what"
              + " updates need to be performed")

class Researcher (models.Model):
    """
    A researcher is a person who gathers data or made assertions
    """

    name = models.CharField (max_length=100)
    comment = models.TextField (null=True, 
        help_text="Contact information for this researcher, like email"
                + " or postal addresses,...")

class Surety_Scheme (models.Model):
    """
    A surety scheme describes how certain a researcher is of the data that
    was gathered. Different projects and researchers might be using different
    surety schemes. Some people want to use the notion of primary and
    secondary sources, others prefer original or derivative material. Yet
    others might prefer percentages...
    The possible values in a scheme are described through a Surety_Scheme_Part
    """

    name = models.CharField (max_length=100)
    description = models.TextField (null=True)

class Surety_Scheme_Part (models.Model):
    """
    An element of a Surety_Scheme
    """

    scheme = models.ForeignKey (Surety_Scheme, related_name="part")
    name   = models.CharField (max_length=100)
    description = models.TextField (null=True)
    sequence_number = models.IntegerField (default=1)

    class Meta:
        ordering = ('sequence_number', 'name')

class Project (models.Model):
    """
    This table describes one of the project that a researcher is working
    on. It could be something as simple as "my genealogy", or a more detailed
    description
    """

    researchers = models.ManyToManyField (Researcher,
        through="Researcher_Project")
    name        = models.CharField (max_length=100)
    description = models.TextField (null=True)
    scheme      = models.ForeignKey (Surety_Scheme, default=0)
    client_data = models.TextField (null=True,
        help_text="The client for which the project is undertaken. In general"
                + " this will be the researched himself")

class Researcher_Project (models.Model):
    """
    A project is conducted by one or more researchers, and a
    given researcher might be working simulatenously on several projects.
    """

    researcher = models.ForeignKey (Researcher)
    project    = models.ForeignKey (Project)
    role       = models.TextField (null=True,
        help_text="Role that the researcher plays for that project")

    class Meta:
        unique_together = (("researcher", "project"))
    
class Research_Objective (models.Model):
    """
    Contains comments about one objective that the researcher has
    determined is appropriate for a project. This could for instance be
    "find the father of x".
    An objective is accomplished in terms of activities.
    """
    
    project         = models.ForeignKey (Project)
    name            = models.CharField (max_length=100)
    description     = models.TextField (null=True)
    sequence_number = models.IntegerField (default=1)
    priority        = models.IntegerField (default=0)
    status          = models.TextField (null=True)

    class Meta:
        ordering = ("sequence_number", "name")
    
class Activity (models.Model):
    """
    An activity allows a researcher to translate a Research_Objective
    into a specific action item
    """

    objectives      = models.ManyToManyField (Research_Objective)
    researcher      = models.ForeignKey (Researcher, null=True)
    scheduled_date  = models.DateField (null=True)
    completed_date  = models.DateField (null=True)
    is_admin        = models.BooleanField (default=False,
        help_text="True if this is an administrative task (see matching"
                + " table), or False if this is a search to perform")
    status          = models.TextField (null=True,
        help_text="Could be either completed, on hold,...")
    description     = models.TextField (null=True)
    priority        = models.IntegerField (default=0)
    comments        = models.TextField (null=True)

    class Meta:
        ordering = ("scheduled_date", "completed_date")

class Source_Medium (models.Model):
    """
    This table lists the different types of medium for sources
    """

    name        = models.CharField (max_length=50)
    description = models.TextField ()

class Place (models.Model):
    """
    Information about a historical place. Places are organized hierarchically,
    to avoid duplicating information whenever possible (for instance, if a
    city was known with a different name in different times, and we have
    several locations in this city, we do not want to duplicate the historical
    names for every location).
    The actual info for a place is defined in terms of Place_Part
    """

    date = models.CharField (
        'date of existence', max_length=200, null=True)
    date_sort = models.DateTimeField ('date used when sorting', null=True)
    parent_place = models.ForeignKey ('self', null=True,
        help_text = "The parent place, that contains this one")

    def __unicode__ (self):
        parts = self.place_part_set.all ()
        name = ",".join ([p.name for p in parts]) + " " + str (self.date)
        if self.parentPlace:
            return str (self.parentPlace) + name
        else:
            return name

class Place_Part_Type (models.Model):
    """
    Contains information about various schemes for organizing place data
    """

    name        = models.CharField (
        'type name', max_length=100, blank=False,null=False)

    def __unicode__ (self):
        return self.name

class Place_Part (models.Model):
    """
    Specific information about a place
    """

    # ??? How do we know where the place_part was found (ie for instance an
    # alternate name for the place found in a different document ?)
    # ??? Should the existence date be a place_part as well, or a field in
    # a place part, so that the same place with different names results in
    # a single id
    place       = models.ForeignKey (Place)
    type        = models.ForeignKey (Place_Part_Type)
    name        = models.CharField (max_length=200)
    sequence_number = models.PositiveSmallIntegerField (
       "Sequence number", default=1)

    class Meta:
        order_with_respect_to = 'place'
        ordering = ('sequence_number', 'name')

    def __unicode__ (self):
        return str (self.type) + "=" + self.name

class Repository_Type (models.Model):
    """
    The various kinds of repositories
    """

    name        = models.CharField (max_length=100)
    description = models.TextField (null=True)
    
class Repository (models.Model):
    """
    Contains information about the place where data was found. Most
    fields from the gentech model were grouped into the info field.
    A repository might also be a person you interviewed one or more times
    """

    place = models.ForeignKey (Place, null=True)
    name  = models.CharField (max_length=200)
    type  = models.ForeignKey (Repository_Type)
    info  = models.TextField (null=True)

class Source (models.Model):
    """
    A collection of data useful for genealogical research, such as a book,
    a compiled genealogy, an electronic database,... Generally, a
    source will have one or more documents, such as specific wills inside
    a book. Such a document is represented as another source, which
    points to the book. This provides better sharing of common information.
    """

    repositories = models.ManyToManyField (Repository,
        related_name="repositories",
        through="Repository_Source")
    higher_source = models.ForeignKey ("self", related_name="lower_sources",
                                       null=True)
    subject_place = models.ForeignKey (Place, null=True, related_name="sources",
        help_text="Where the event described in the source takes place")
    jurisdiction_place = models.ForeignKey (Place, null=True,
        related_name="jurisdiction_for",
        help_text="Example: a record in North Carolina describes a person"
                + " and their activities in Georgia. Georgia is the subject"
                + " place, whereas NC is the jurisdiction place")
    researcher    = models.ForeignKey (Researcher)
    subject_date  = models.CharField (max_length=200, null=True,
        help_text="the date of the subject. Note that the dates might be"
                + " different for the various levels of source (a range of"
                + " dates for a book, and a specific date for an extract for"
                + " instance). This field contains the date as found in the"
                + " original document. subject_date_sort stores the actual"
                + " computed from subject_date, for sorting purposes")
    subject_date_sort = models.DateTimeField (null=True)
    medium        = models.ForeignKey (Source_Medium)
    comments      = models.TextField (null=True)

class Repository_Source (models.Model):
    """
    Links repositories to the sources they contains, and the sources to
    all the possible repositories where they are found
    """

    repository  = models.ForeignKey (Repository)
    source      = models.ForeignKey (Source)
    activity    = models.ForeignKey (Activity)
    call_number = models.CharField (max_length=200, null=True)
    description = models.TextField (null=True)

class Search (models.Model):
    """
    A specific examination of a source to find information. This is
    usually linked to a research_objective, through an activity, but not
    necessarily, if for instance this is an unexpected opportunity
    """

    activity     = models.ForeignKey (Activity, null=True)
    source       = models.ForeignKey (Source, null=True,
        help_text="The source in which the search was conducted. It could"
                + " be null if this was a general search in a repository for"
                + " instance")
    repository   = models.ForeignKey (Repository)
    searched_for = models.TextField (null=True)

class Source_Group (models.Model):
    """
    This can be used to group sources into groups relevant to the user,
    such as "wills", "census",... or "new england sources" for instance
    """

    sources = models.ManyToManyField (Source, related_name="groups")
    name = models.CharField (max_length=100)

class Representation (models.Model):
    """
    Contains the representation of a source in a variete of formats.
    A given source can have multiple representations
    """

    source = models.ForeignKey (Source)
    mime_type = models.CharField (max_length=40)
    file = models.TextField ()
    comments = models.TextField (null=True)

class Citation_Part_Type (models.Model):
    """
    The type of elements associated with a citation
    """

    name = models.CharField (max_length=100)

class Citation_Part (models.Model):
    """
    Stores the citation for a source, such as author, title,...
    """

    source = models.ForeignKey (Source)
    type   = models.ForeignKey (Citation_Part_Type)
    value  = models.TextField ()

class Entity (models.Model):
    pass

class Persona (Entity):
    """
    Contains the core identification for individuals. Such individuals
    are grouped into group to represent a real individual. A persona
    really represents some data about an individual found in one source
    (when we are sure all attributes apply to the same person)
    """

    name = models.CharField (max_length=100)
    description = models.TextField (null=True)

class Event_Type (models.Model):
    """
    The type of events
    """

    name = models.CharField (max_length=100)
    gedcom = models.CharField (max_length=10,
        help_text="Name in Gedcom fiels")

class Event_Type_Role (models.Model):
    """
    The individual roles of a defined event type, such as "witness",
    "chaplain"
    """

    type = models.ForeignKey (Event_Type)
    name = models.CharField (max_length=50)

class Event (Entity):
    """
    An event is any type of happening
    """

    type = models.ForeignKey (Event_Type)
    place = models.ForeignKey (Place, null=True)
    name  = models.CharField (max_length=100)
    date  = models.CharField (max_length=200,
        help_text="The date of the event, as found in the original source."
                + " This date is internally parsed into date_sort"
                + " which is used for sorting purposes")
    date_sort = models.DateTimeField ()

class Characteristic_Part_Type (models.Model):
    name = models.CharField (max_length=100)

class Characteristic (Entity):
    """
    A characteristic is any data that distinguishes one person from another
    """

    place = models.ForeignKey (Place, null=True)
    date  = models.CharField (max_length=200)
    date_sort = models.DateTimeField ()

class Characteristic_Part (models.Model):
    """
    Most characteristics have a single part (such as Occupation
    for instance). However, the full name is also stored as a
    characterstic, and therefore various parts might be needed
    """

    characteristic  = models.ForeignKey (Characteristic)
    type            = models.ForeignKey (Characteristic_Part_Type)
    name            = models.CharField (max_length=200)
    sequence_number = models.IntegerField (default=1)

    class Meta:
        ordering = ("sequence_number", "name")

class Group_Type (models.Model):
    """
    A group is any way in which persons might be grouped: students from
    the same class, members of the same church, an army regiment,...
    Each member in a group might have a different role, which is
    described by a Group_Type_Role
    """

    name = models.CharField (max_length=100)

class Group_Type_Role (models.Model):
    """
    The role a person can have in a group
    """

    type = models.ForeignKey (Group_Type, related_name="roles")
    name = models.CharField (max_length=200)
    sequence_number = models.IntegerField (default=1)

    class Meta:
        ordering = ("sequence_number", "name")

class Group (Entity):
    """
    The groups as found in our various sources
    """

    type = models.ForeignKey (Group_Type)
    place = models.ForeignKey (Place, null=True)
    name  = models.CharField (max_length=200)
    date  = models.CharField (max_length=200)
    date_sort = models.DateTimeField ()
    criteria  = models.TextField (null=True,
         help_text="The criteria for admission in a group. For instance, one"
                 + " group might be all neighbors listed in a particular"
                 + " document, and another group might be a similar group"
                 + " listed in another document, or same document at a"
                 + " different time")

class Assertion (models.Model):
    """
    """

    surety     = models.ForeignKey (Surety_Scheme_Part)
    researcher = models.ForeignKey (Researcher)
    source     = models.ForeignKey (Source, null=True,
        help_text="An assertion comes from no more than one source. It can"
                + " also come from one or more other assertions through the"
                + " assertion_assertion table, in which case source_id is"
                + " null")
    subject1   = models.ForeignKey (Entity, related_name="subject1")
    subject2   = models.ForeignKey (Entity, related_name="subject2")
    group_role = models.ForeignKey (Group_Type_Role, null=True)
    event_role = models.ForeignKey (Event_Type_Role, null=True)
    value      = models.TextField (
        help_text="Describes the value for an assertion, which could either"
                + " point into a table, or be described as text, depending"
                + " on the type of assertion")
    rationale  = models.TextField ()
    disproved  = models.BooleanField (default=False)

class Assertion_Assertion (models.Model):
    original = models.ForeignKey (Assertion, related_name="leads_to")
    deduction = models.ForeignKey (Assertion, related_name="deducted_from")
    sequence_number = models.IntegerField (default=1)

    class Meta:
        ordering = ("sequence_number",)

 
# from mysites.geneapro.models import *
# p = Place ()
# p.place_part_set.create (type="0", name="France")
# p.place_part_set.create (type=Place_Part_Type.objects.get(pk=1), name="France")

# from django.db import connection
# connection.queries

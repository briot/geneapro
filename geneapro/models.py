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

from django.db import models, backend, connection
from mysites.geneapro.utils import date

class GeneaproModel (models.Model):
    def to_json (self):
        """Returns a version of self suitable for use in json. By default,
           this returns the dictionary of the class without the attributes
           starting with _"""
        result = {}
        for key, value in self.__dict__.iteritems():
            if key[0] != '_':
               result[key] = value
        return result

    class Meta:
        abstract = True

class PartialDateField (models.CharField):
    """
    A new type of field: this stores a date/time or date range exactly
    as was entered by the user (that is it fundamentally behaves as a
    text field). However, whenever it is modified, it also modifies another
    field in the model with a standard date/time which can be used for
    sorting purposes
    """
    # ??? We should also override form_field, so that we can more easily
    #     create html input fields to edit this field

    __metaclass__ = models.SubfieldBase

    def __init__ (self, max_length=0, null=True, *args, **kwargs):
        kwargs["null"]=null
        super (PartialDateField, self).__init__ (
           self, max_length=100, *args, **kwargs)

    def contribute_to_class (self, cls, name):
        """Add the partialDateField to a class, as well as a second field
           used for sorting purposes"""
        sortfield = models.DateTimeField ('used to sort', null=True)
        self._sortfield = name + "_sort"
        cls.add_to_class (self._sortfield, sortfield)
        super (PartialDateField, self).contribute_to_class (cls, name)

    def pre_save(self, model_instance, add):
        """Update the value of the sort field based on the contents of self"""
        val = super (PartialDateField, self).pre_save (model_instance, add)
        if val:
           sort = date.DateRange (val).sort_date ()
           setattr (model_instance, self._sortfield, sort)
        return val

class Config (GeneaproModel):
    """
    This table contains general information on the setup of the database
    """

    schema_version = models.IntegerField (editable=False, default=1,
       help_text="Version number of this database. Used to detect what"
              + " updates need to be performed")

    class Meta:
       db_table="config"

class Researcher (GeneaproModel):
    """
    A researcher is a person who gathers data or made assertions
    """

    name = models.CharField (max_length=100)
    comment = models.TextField (null=True, 
        help_text="Contact information for this researcher, like email"
                + " or postal addresses,...")

    def __unicode__ (self):
        return self.name

    class Meta:
       db_table="researcher"

class Surety_Scheme (GeneaproModel):
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

    def __unicode__ (self):
        return self.name

    class Meta:
       db_table="surety_scheme"

class Surety_Scheme_Part (GeneaproModel):
    """
    An element of a Surety_Scheme
    """

    scheme = models.ForeignKey (Surety_Scheme, related_name="parts")
    name   = models.CharField (max_length=100)
    description = models.TextField (null=True,blank=True)
    sequence_number = models.IntegerField (default=1)

    def __unicode__ (self):
        return self.name

    class Meta:
        ordering = ('-sequence_number', 'name')

    class Meta:
       db_table="surety_scheme_part"

class Project (GeneaproModel):
    """
    This table describes one of the project that a researcher is working
    on. It could be something as simple as "my genealogy", or a more detailed
    description
    """

    researchers = models.ManyToManyField (Researcher,
        through="Researcher_Project")
    name        = models.CharField (max_length=100)
    description = models.TextField (null=True)
    scheme      = models.ForeignKey (Surety_Scheme, default=1)
    client_data = models.TextField (null=True,
        help_text="The client for which the project is undertaken. In general"
                + " this will be the researched himself")

    def __unicode__ (self):
        return "name=" + self.name

    class Meta:
       db_table="project"

class Researcher_Project (GeneaproModel):
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
       db_table="researched_project"

class Research_Objective (GeneaproModel):
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
        db_table = "research_objective"
 
class Activity (GeneaproModel):
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
        db_table = "activity"

class Source_Medium (GeneaproModel):
    """
    This table lists the different types of medium for sources
    """

    name        = models.CharField (max_length=50)
    description = models.TextField (blank=True)

    def __unicode__ (self):
        return self.name

    class Meta:
        ordering = ("name",)
        db_table = "source_medium"

class Place (GeneaproModel):
    """
    Information about a historical place. Places are organized hierarchically,
    to avoid duplicating information whenever possible (for instance, if a
    city was known with a different name in different times, and we have
    several locations in this city, we do not want to duplicate the historical
    names for every location).
    The actual info for a place is defined in terms of Place_Part
    """

    date = PartialDateField ()
    parent_place = models.ForeignKey ('self', null=True,
        help_text = "The parent place, that contains this one")

    def __unicode__ (self):
        parts = self.place_part_set.all ()
        name = ",".join ([p.name for p in parts]) + " " + str (self.date)
        if self.parent_place:
            return str (self.parent_place) + name
        else:
            return name

    class Meta:
        ordering = ("date_sort",)
        db_table = "place"

class Part_Type (GeneaproModel):
    """
    An abstract base class for the various tables that store components of
    higher level entities. These are associated with a simple name in general,
    but we also store the required information to import and export them to
    the Gedcom format
    """

    name = models.CharField (max_length=100, blank=False, null=False)
    gedcom = models.CharField (max_length=15, help_text="Name in Gedcom files",
                               blank=True)

    class Meta:
        abstract = True
        ordering = ("name",)
        db_table = "part_type"

    def __unicode__ (self):
        if self.gedcom:
           return self.name + " (gedcom: " + self.gedcom + ")"
        else:
           return self.name

class Place_Part_Type (Part_Type):
    """
    Contains information about various schemes for organizing place data
    """

    class Meta:
       db_table = "place_part_type"

class Place_Part (GeneaproModel):
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
        db_table = "place_part"

    def __unicode__ (self):
        return str (self.type) + "=" + self.name

class Repository_Type (GeneaproModel):
    """
    The various kinds of repositories
    """

    name        = models.CharField (max_length=100)
    description = models.TextField (null=True, blank=True)

    def __unicode__ (self):
        return self.name

    class Meta:
        ordering = ("name",)
        db_table = "repository_type"
    
class Repository (GeneaproModel):
    """
    Contains information about the place where data was found. Most
    fields from the gentech model were grouped into the info field.
    A repository might also be a person you interviewed one or more times
    """

    place = models.ForeignKey (Place, null=True)
    name  = models.CharField (max_length=200)
    type  = models.ForeignKey (Repository_Type)
    info  = models.TextField (null=True)

    class Meta:
       db_table = "repository"

class Source (GeneaproModel):
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
    subject_date  = PartialDateField (
        help_text="the date of the subject. Note that the dates might be"
                + " different for the various levels of source (a range of"
                + " dates for a book, and a specific date for an extract for"
                + " instance). This field contains the date as found in the"
                + " original document. subject_date_sort stores the actual"
                + " computed from subject_date, for sorting purposes")
    medium        = models.ForeignKey (Source_Medium)
    comments      = models.TextField (null=True)

    class Meta:
       db_table = "source"

class Repository_Source (GeneaproModel):
    """
    Links repositories to the sources they contains, and the sources to
    all the possible repositories where they are found
    """

    repository  = models.ForeignKey (Repository)
    source      = models.ForeignKey (Source)
    activity    = models.ForeignKey (Activity)
    call_number = models.CharField (max_length=200, null=True)
    description = models.TextField (null=True)

    class Meta:
       db_table = "repository_source"

class Search (GeneaproModel):
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

    class Meta:
       db_table = "search"

class Source_Group (GeneaproModel):
    """
    This can be used to group sources into groups relevant to the user,
    such as "wills", "census",... or "new england sources" for instance
    """

    sources = models.ManyToManyField (Source, related_name="groups")
    name = models.CharField (max_length=100)

    class Meta:
       db_table = "source_group"

class Representation (GeneaproModel):
    """
    Contains the representation of a source in a variete of formats.
    A given source can have multiple representations
    """

    source = models.ForeignKey (Source)
    mime_type = models.CharField (max_length=40)
    file = models.TextField ()
    comments = models.TextField (null=True)

    class Meta:
       db_table = "representation"

class Citation_Part_Type (Part_Type):
    """
    The type of elements associated with a citation
    """

    class Meta:
       db_table = "citation_part_type"

class Citation_Part (GeneaproModel):
    """
    Stores the citation for a source, such as author, title,...
    """

    source = models.ForeignKey (Source)
    type   = models.ForeignKey (Citation_Part_Type)
    value  = models.TextField ()

    class Meta:
       db_table = "citation_part"

class ParentsManager (models.Manager):
    """
    A manager that adds extra parent_id and mother_id fields to each persona
    returned
    """

    def get_query_set(self):
        if not hasattr (self, "_query"):
           self._p2p_query = \
              "SELECT %(p2e.subj1)s" + \
              " FROM %(p2e)s WHERE" + \
              " %(p2e.role)s=%%d" + \
              " AND %(p2e.subj2)s IN" + \
              "   (SELECT %(p2e.event)s FROM %(p2e)s, %(event)s" + \
              "    WHERE %(p2e.event)s=%(event.id)s" + \
              "    AND %(p2e.person)s=%(persona.id)s" + \
              "    AND %(event.type)s=1" + \
              "    AND %(p2e.role)s=5)" + \
              " AND %(persona.id)s!=%(p2e.person)s" + \
              " LIMIT 1"
           self._p2p_query = self._p2p_query % all_fields 

           self._char_query = \
              "SELECT %(char_part.name)s" + \
              " FROM %(char_part)s, %(p2c)s" + \
              " WHERE %(char_part.char)s=%(p2c.char)s" + \
              " AND %(char_part.type)s=%%d" + \
              " AND %(p2c.person)s=%(persona.id)s LIMIT 1"
           self._char_query = self._char_query % all_fields

           self._event_date_query = \
              "SELECT lower (%(event.date)s)" + \
              " FROM %(p2e)s, %(event)s" + \
              " WHERE %(p2e.event)s=%(event.id)s" + \
              " AND %(p2e.person)s=%(persona.id)s" + \
              " AND %(event.type)s=%%d" + \
              " AND %(p2e.role)s=%%d" + \
              " LIMIT 1"
           self._event_date_query = self._event_date_query % all_fields

        ## ??? The query is rather complex at this point, maybe we should
        ## split it into several smaller pieces, that would be as efficient
        ## and remove the need for custom queries
        return super (ParentsManager, self).get_query_set().extra (select={
           'father_id': self._p2p_query % (Event_Type_Role.birth__father),
           'mother_id': self._p2p_query % (Event_Type_Role.birth__mother),
           'birth': self._event_date_query % 
               (Event_Type.birth, Event_Type_Role.principal),
           'death': self._event_date_query %
               (Event_Type.death, Event_Type_Role.principal),
           'sex': self._char_query %
               (Characteristic_Part_Type.sex)})

class Persona (GeneaproModel):
    """
    Contains the core identification for individuals. Such individuals
    are grouped into group to represent a real individual. A persona
    really represents some data about an individual found in one source
    (when we are sure all attributes apply to the same person)
    """

    name = models.CharField (max_length=100)
    description = models.TextField (null=True)

    def __unicode__ (self):
        return self.name

    def to_json (self):
        # This only works if self was generated through the parents manager
        # If not defined, we get an exception. The caller needs to be fixed,
        # not here
        return {"id":self.id, "name":self.name, "sex":self.sex,
                "birth":self.birth, "death":self.death}

    objects = models.Manager ()
    parents = ParentsManager ()

    class Meta:
        db_table = "persona"

    def get_related_personas (self, event_type, role, related_role):
        """Return all persons related to self through the given Event_Type,
           where self played the role and the other persons played the
           related_role"""
        return Persona.objects.filter (
           id__in = P2E_Assertion.objects.filter (
              ole_in = related_role,
              event__in = self.events.filter (
                 subject2__type = event_type,
                 role__in = role).values ('event').query)
           .values ('person').query).exclude (id = self.id)

class Event_Type (Part_Type):
    """
    The type of events
    """

    class Meta:
       db_table = "event_type"

    # Some hard-coded values for efficiency. Ideally, we should look these
    # from the database. The problem is if the database gets translated
    birth = 1
    death = 4

class Event_Type_Role (GeneaproModel):
    """
    The individual roles of a defined event type, such as "witness",
    "chaplain"
    """

    type = models.ForeignKey (Event_Type, null=True, blank=True,
        help_text="The event type for which the role is defined. If unset,"
                + " this applies to all events")
    name = models.CharField (max_length=50)

    class Meta:
       db_table = "event_type_role"

    def __unicode__ (self):
       if self.type:
          return str (self.id) + ": " + self.type.name + " => " + self.name
       else:
          return str (self.id) + ": * =>" + self.name

    # Some hard-coded values for efficiency. Ideally, we should look these
    # from the database. The problem is if the database gets translated
    marriage__husband = 1
    marriage__wife = 2
    principal = 5
    birth__father = 6
    birth__mother = 7

class Event (models.Model):
    """
    An event is any type of happening
    A Event is associated with a Persona or a Group through an
    assertion.
    """

    type = models.ForeignKey (Event_Type)
    place = models.ForeignKey (Place, null=True)
    name  = models.CharField (max_length=100)
    date  = PartialDateField (
        help_text="The date of the event, as found in the original source."
                + " This date is internally parsed into date_sort"
                + " which is used for sorting purposes")

    class Meta:
       db_table = "event"

    def __unicode__ (self):
       if self.date:
          date = " (on " + self.date + ")"
       else:
          date = ""

       return self.name + date

class Characteristic_Part_Type (Part_Type):
    class Meta:
       db_table = "characteristic_part_type"

    # Some hard-coded values for efficiency. Ideally, we should look these
    # from the database. The problem is if the database gets translated
    sex = 1

class Characteristic (models.Model):
    """
    A characteristic is any data that distinguishes one person from another.
    A Characteristic is associated with a Persona or a Group through an
    assertion.
    """

    place = models.ForeignKey (Place, null=True)
    date  = PartialDateField (null=True)

    class Meta:
       db_table = "characteristic"

class Characteristic_Part (GeneaproModel):
    """
    Most characteristics have a single part (such as Occupation
    for instance). However, the full name is also stored as a
    characterstic, and therefore various parts might be needed.
    """

    characteristic  = models.ForeignKey (Characteristic, related_name="parts")
    type            = models.ForeignKey (Characteristic_Part_Type)
    name            = models.CharField (max_length=200)
    sequence_number = models.IntegerField (default=1)

    class Meta:
        ordering = ("sequence_number", "name")
        db_table = "characteristic_part"

    def __unicode__ (self):
        return self.type.name + "=" + self.name

class Group_Type (Part_Type):
    """
    A group is any way in which persons might be grouped: students from
    the same class, members of the same church, an army regiment,...
    Each member in a group might have a different role, which is
    described by a Group_Type_Role
    """

    class Meta:
       db_table = "group_type"

class Group_Type_Role (GeneaproModel):
    """
    The role a person can have in a group
    """

    type = models.ForeignKey (Group_Type, related_name="roles")
    name = models.CharField (max_length=200)
    sequence_number = models.IntegerField (default=1)

    class Meta:
        ordering = ("sequence_number", "name")
        db_table = "group_type_role"

class Group (models.Model):
    """
    The groups as found in our various sources
    """

    type = models.ForeignKey (Group_Type)
    place = models.ForeignKey (Place, null=True)
    name  = models.CharField (max_length=200)
    date  = PartialDateField ()
    criteria  = models.TextField (null=True,
         help_text="The criteria for admission in a group. For instance, one"
                 + " group might be all neighbors listed in a particular"
                 + " document, and another group might be a similar group"
                 + " listed in another document, or same document at a"
                 + " different time")

    class Meta:
       db_table = "group"

class Assertion (GeneaproModel):
    """
    Links two entities together, describing various facts we have learned
    about in a source.
    Not all combination of subject1 and subject2 make sense as per the
    GenTech standard (although they are all allowed). The following
    combination are described in the standard:
      (Persona, Event)  # was part of an event (role is described separately)
      (Persona, Group)  # is a member of a group (role is described)
                        # Or "member of children of ..." (not used here)
      (Persona, Characteristic) # has some attribute
      (Event,   Event)  # One event occurred before another for instance
      (Group,   Event)
      (Group,   Persona)
      (Group,   Group)  # Two groups might be the same for instance
      (Group,   Characteristic) # e.g. prays on Sunday
      (Characteristic, Group)   # occupation members of all jobs done by a
                                # given person

    It seems that the following are also expected
      (Persona, Persona)  # When two persona represent the same person
    """

    surety     = models.ForeignKey (Surety_Scheme_Part)
    researcher = models.ForeignKey (Researcher)
    source     = models.ForeignKey (Source, null=True,
        help_text="An assertion comes from no more than one source. It can"
                + " also come from one or more other assertions through the"
                + " assertion_assertion table, in which case source_id is"
                + " null")
    value      = models.TextField (
        help_text="Describes the value for an assertion, which could either"
                + " point into a table, or be described as text, depending"
                + " on the type of assertion")
    rationale  = models.TextField (null=True)
    disproved  = models.BooleanField (default=False)

    class Meta:
       db_table = "assertion"

class P2C_Assertion (Assertion):
    """Persona-to-Characteristic assertions"""
    person = models.ForeignKey (Persona, related_name="characteristics")
    characteristic = models.ForeignKey (Characteristic, related_name="persons")

    class Meta:
       db_table = "p2c"

class P2E_Assertion (Assertion):
    """Persona-to-Event assertions"""
    person     = models.ForeignKey (Persona, related_name="events")
    event      = models.ForeignKey (Event, related_name="actors")
    role       = models.ForeignKey (Event_Type_Role, null=True)

    class Meta:
       db_table = "p2e"

    def __unicode__ (self):
       if self.role:
          role = " (as " + self.role.name + ")"
       else:
          role = ""
     
       return unicode (self.person) + " " + self.value + " " + unicode (self.event) + role

class Assertion_Assertion (GeneaproModel):
    original = models.ForeignKey (Assertion, related_name="leads_to")
    deduction = models.ForeignKey (Assertion, related_name="deducted_from")
    sequence_number = models.IntegerField (default=1)

    class Meta:
       ordering = ("sequence_number",)
       db_table = "assertion_assertion"

## This is used to help write custom SQL queries without hard-coding
## table or field names

def sql_table_name (cls):
    return connection.ops.quote_name (cls._meta.db_table)

def sql_field_name (cls, field_name):
    """Help write custom SQL queries"""
    if field_name == "pk":
       f = cls._meta.pk
    else:
       f = cls._meta.get_field (field_name)
    return "%s.%s" % (
       sql_table_name (cls), connection.ops.quote_name (f.column))

all_fields = {
   'char_part.name': sql_field_name (Characteristic_Part, "name"),
   'char_part':      sql_table_name (Characteristic_Part),
   'assert':         sql_table_name (Assertion),
   'p2c':     sql_table_name (P2C_Assertion),
   'p2e':     sql_table_name (P2E_Assertion),
   'char_part.char': sql_field_name (Characteristic_Part, "characteristic"),
   'assert.pk':      sql_field_name (Assertion, "pk"),
   'p2e.pk':  sql_field_name (P2E_Assertion, "pk"),
   'p2c.pk':  sql_field_name (P2C_Assertion, "pk"),
   'p2c.char': sql_field_name (P2C_Assertion, "characteristic"),
   'p2c.person': sql_field_name (P2C_Assertion, "person"),
   'p2e.person': sql_field_name (P2E_Assertion, "person"),
   'p2e.event':  sql_field_name (P2E_Assertion, "event"),
   'p2e.role':  sql_field_name (P2E_Assertion, "role"),
   'char_part.type': sql_field_name (Characteristic_Part, "type"),
   'persona.id'    : sql_field_name (Persona, "pk"),
   'assert.value'  : sql_field_name (Assertion, "value"),
   'event.date'    : sql_field_name (Event, "date"),
   'event':          sql_table_name (Event),
   'event.id':       sql_field_name (Event, "pk"),
   'event.type':     sql_field_name (Event, "type"),
}


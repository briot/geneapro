from django.db import models
import django.utils.timezone

from .base import GeneaProveModel, Part_Type
from .place import Place
from .repository import Repository
from .researcher import Researcher


class Source(GeneaProveModel):
    """
    A collection of data useful for genealogical research, such as a book,
    a compiled genealogy, an electronic database,... Generally, a
    source will have one or more documents, such as specific wills inside
    a book. Such a document is represented as another source, which
    points to the book. This provides better sharing of common information.
    """

    repositories = models.ManyToManyField(
        Repository,
        related_name="sources",
        through="Repository_Source")
    higher_source = models.ForeignKey(
        "self", related_name="lower_sources", null=True)
    subject_place = models.ForeignKey(
        Place, null=True, related_name="sources",
        help_text="Where the event described in the source takes place")
    jurisdiction_place = models.ForeignKey(
        Place, null=True,
        related_name="jurisdiction_for",
        help_text="Example: a record in North Carolina describes a person"
        " and their activities in Georgia. Georgia is the subject"
        " place, whereas NC is the jurisdiction place")
    researcher = models.ForeignKey(Researcher, null=False)
    subject_date = models.CharField(
        max_length=100, null=True,
        help_text="the date of the subject. Note that the dates might be" +
        " different for the various levels of source (a range of" +
        " dates for a book, and a specific date for an extract for" +
        " instance). This field contains the date as found in the" +
        " original document. subject_date_sort stores the actual" +
        " computed from subject_date, for sorting purposes")
    subject_date_sort = models.CharField(
        max_length=100, null=True,
        help_text="Date parsed automatically")
    medium = models.TextField(
        null=True,
        help_text="""The type of the source, used to construct the citation.
The value for this field is the key into the citations.py dictionary that
documents the citation styles.""")
    title = models.TextField(
        null=True,
        default='Untitled',
        help_text="The (possibly computed) full citation for this source")
    abbrev = models.TextField(
        null=True,
        default='Untitled',
        help_text="An (possibly computed) abbreviated citation")
    biblio = models.TextField(
        null=True,
        default='Untitled',
        help_text="Full citation for a bibliography")

    comments = models.TextField(null=True)

    last_change = models.DateTimeField(default=django.utils.timezone.now)

    class Meta:
        """Meta data for the model"""
        db_table = "source"

    def to_json(self):
        return {
            "higher_source_id": self.higher_source_id,
            "subject_place": self.subject_place,
            "jurisdiction_place": self.jurisdiction_place,
            "researcher": self.researcher_id,
            "subject_date": self.subject_date,
            "medium": self.medium,
            "title": self.title,
            "id": self.id,
            "abbrev": self.abbrev,
            "biblio": self.biblio,
            "last_change": self.last_change,
            "comments": self.comments}

    def compute_medium(self):
        """
        Return the medium type for Self. This could be inherited from higher
        sources.
        """
        if self.medium:
            return self.medium
        elif self.higher_source:
            # ??? bug in pylint
            # pylint: disable=no-member
            return self.higher_source.compute_medium()
        else:
            return ""

    def get_asserts(self):
        """
        Return all assertions related to the given source.
        Only the id is retrieved for some related fields like persons and
        events. Further queries are needed to retrieve them.
        """
        from .asserts import Assertion, P2P, P2C, P2E, P2G
        if self.id == -1:
            return []
        asserts = []
        schemes = set()
        for table in (P2E, P2C, P2P, P2G):
            for c in table.objects.select_related(
                *table.related_json_fields()
            ).filter(source=self):
                asserts.append(c)
                schemes.add(c.surety.scheme_id)
        return asserts

    def get_citations(self):
        """
        :return: {name: (value, fromHigher) }
           A dict of all the parts of the source citation, including those
           of the higher-level source.
           `from_higher` is true when the part comes from a higher-level
           source and was not overridden.
        """

        if self.higher_source:
            result = {
                k: {"value": v, "fromHigh": True}
                for k, v in self.higher_source.get_citations().items()}
        else:
            result = {}

        for part in self.parts.select_related(*Citation_Part.related_json_fields()).all():
            result[part.type.name] = {"value": part.value, "fromHigh": False}

        return result

    def get_citations_as_list(self):
        """
        :return: [{name:..., value:..., fromHigh:...}]
           Similar to get_citations, but returns a sorted list
        """
        parts = self.get_citations()
        return sorted(dict(name=k, **v)
                      for k, v in parts.items())

    def get_representations(self):
        """
        :return: [models.Representation]
           The list of media objects for that source
        """
        from .representation import Representation
        return Representation.objects.filter(source=self)

    def get_higher_sources(self):
        """
        :return: the list of higher level sources, recursively.
           The first element is the direct parent, the last is the top-most
           source.
        """
        if self.higher_source is not None:
            a = [self.higher_source]

            # ??? bug in pylint
            # pylint: disable=no-member
            a.extend(self.higher_source.get_higher_sources())
            return a
        return []


class Citation_Part_Type(Part_Type):
    """
    The type of elements associated with a citation
    """

    class Meta:
        """Meta data for the model"""
        db_table = "citation_part_type"


class Citation_Part(GeneaProveModel):
    """
    Stores the citation for a source, such as author, title,...
    """

    source = models.ForeignKey(Source, related_name='parts')
    type = models.ForeignKey(Citation_Part_Type)
    value = models.TextField()

    class Meta:
        """Meta data for the model"""
        db_table = "citation_part"

    @staticmethod
    def related_json_fields():
        """What select_related() to use to export to JSON"""
        return ['type']

    def to_json(self):
        return {
            "type": self.type.name,
            "value": self.value,
        }

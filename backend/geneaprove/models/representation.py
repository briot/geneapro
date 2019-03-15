from django.db import models
from .base import GeneaProveModel
from .source import Source


class Representation(GeneaProveModel):
    """
    Contains the representation of a source in various formats.
    A given source can have multiple representations
    """

    mime_type = models.CharField(max_length=40)
    source = models.ForeignKey(Source, related_name="representations", on_delete=models.CASCADE)
    file = models.TextField(null=True)
    comments = models.TextField(null=True)

    class Meta:
        """Meta data for the model"""
        db_table = "representation"

    def url(self):
        """
        :return: a string
           The URL that should be used to access the media on the disk,
           from a web browser.
        """
        return f'/data/repr/{self.id}'

    def to_json(self):
        return {
            "id": self.id,
            "url": self.url(),
            "comments": self.comments,
            "file": self.file,
            "source_id": self.source_id,
            "mime": self.mime_type}

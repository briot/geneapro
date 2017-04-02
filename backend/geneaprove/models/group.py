from django.db import models
from .place import Place
from .base import GeneaProveModel, compute_sort_date, Part_Type


class Group_Type(Part_Type):
    """
    A group is any way in which persons might be grouped: students from
    the same class, members of the same church, an army regiment,...
    Each member in a group might have a different role, which is
    described by a Group_Type_Role
    """

    class Meta:
        """Meta data for the model"""
        db_table = "group_type"


class Group_Type_Role(GeneaProveModel):
    """
    The role a person can have in a group
    """

    type = models.ForeignKey(Group_Type, related_name="roles")
    name = models.CharField(max_length=200)
    sequence_number = models.IntegerField(default=1)

    class Meta:
        """Meta data for the model"""
        ordering = ("sequence_number", "name")
        db_table = "group_type_role"


class Group(GeneaProveModel):
    """
    The groups as found in our various sources
    """

    type = models.ForeignKey(Group_Type)
    place = models.ForeignKey(Place, null=True)
    name = models.CharField(max_length=200)
    date = models.CharField(
        max_length=100, null=True,
        help_text="Date, as found in original source")
    date_sort = models.CharField(
        max_length=100, null=True,
        help_text="Date, parsed automatically")
    criteria = models.TextField(
        null=True,
        help_text="The criteria for admission in a group. For instance, one"
        " group might be all neighbors listed in a particular"
        " document, and another group might be a similar group"
        " listed in another document, or same document at a"
        " different time")

    class Meta:
        """Meta data for the model"""
        db_table = "group"

    def save(self, **kwargs):
        self.date_sort = compute_sort_date(self.date)
        super(Group, self).save(**kwargs)

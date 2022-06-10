from typing import List, Optional


class GedcomRecord:
    """
    Result of parsing one block of gedcom.
    """

    def __init__(
            self,
            line: int,
            tag: str,
            id: str = None,
            value: str = '',
            fields: List["GedcomRecord"] = None,
            ):
        self.line = line
        self.tag = tag
        self.value = value
        self.fields = [] if fields is None else fields
        self.xref = None   # points to one of the dict(), used to resolve xref
        self.id = id

    def __repr__(self):
        return f"GedcomRecord(tag={self.tag},line={self.id})"

    def get(self, field: str) -> Optional["GedcomRecord"]:
        """
        Retrieve a specific field by name
        """
        for f in self.fields:
            if f.tag == field:
                return f
        return None

    def as_xref(self) -> Optional[str]:
        """
        Report the ID of the object that self points to, or None.
        The caller is responsible for knowing whether this point to an INDI,
        a SOUR,...
        """
        if self.value and self.value[0] == '@':
            return self.value
        return None

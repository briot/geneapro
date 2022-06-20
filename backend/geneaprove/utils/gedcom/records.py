from typing import List, Optional, Generator, Tuple


class GedcomRecord:
    """
    Result of parsing one block of gedcom.
    """

    __slot__ = [
        "line", "tag", "__value", "fields", "xref", "id", "__value_imported",
    ]

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
        self.__value = value
        self.fields = [] if fields is None else fields
        self.xref = None   # points to one of the dict(), used to resolve xref
        self.id = id
        self.__value_imported = False

    def __repr__(self):
        return f"GedcomRecord({self.tag}:{self.id})"

#    def get(self, field: str) -> Optional["GedcomRecord"]:
#        """
#        Retrieve a specific field by name
#        """
#        for f in self.fields:
#            if f.tag == field:
#                return f
#        return None

    @property
    def value(self) -> str:
        """
        Return the value, and mark it as imported (assuming that if we have
        read it once, we have done something with the value)
        """
        self.__value_imported = True
        return self.__value

    def report_not_imported(
            self,
            prefix: str = "",
            ) -> Generator[Tuple["GedcomRecord", str], None, None]:
        """
        Report all unimported fields
        """
        if not self.__value_imported and self.__value:
            yield self, f"{prefix}{self.tag} ({self.__value})"

        pr = (
            prefix
            if not self.tag
            else f"{prefix}{self.tag}."
        )
        for f in self.fields:
            yield from f.report_not_imported(prefix=pr)

    def as_xref(self) -> Optional[str]:
        """
        Report the ID of the object that self points to, or None.
        The caller is responsible for knowing whether this point to an INDI,
        a SOUR,...
        """
        if self.__value and self.__value[0] == '@':
            return self.value    # and mark as imported
        return None

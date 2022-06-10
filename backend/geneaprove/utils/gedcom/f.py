from typing import List, Optional, Dict
from .lexical import Lexical, Lexical_Line
from .records import GedcomRecord


unlimited = -1


class F:
    """
    Describes one field of the grammar
    """

    def __init__(
            self,
            tag: str,
            min: int,
            max: int,
            text="",
            children: List["F"] = None,
            ):
        """
        :param str tag: the tag found at the beginning of the line.
        :param int min: the minimal number of occurrences within parent
        :param int max: the maximum number of occurrences within parent
        :param str|None text:
            None indicates that no text value is expected
            "Y" indicates that the only valid values are "Y" or null,
              to indicate that an event took place, with no additional info
            "" indicates that some textual value is expected
            "INDI" indicates an xref to an INDI field is expected, or inline
               textual value
            "SUBM" indicates an xret to a SUBM
        :param None|list children:
            list of F objects that can be found as children. You can also
            use tag names instead of F objects, they will be looked up
            later.
            CONT and CONC children are always handled automatically and do
            not need to appear in this grammar.
        """
        assert isinstance(min, int)
        assert isinstance(max, int)
        assert children is None or isinstance(children, list)

        self.tag = tag
        self.min = min
        self.max = max
        self.text = text

        assert self.text in (
                None, "Y", "", "INDI", "SUBM", "SUBN", "NOTE",
                "OBJE", "SOUR", "NOTE", "FAM", "REPO"
            ), f"Invalid {self.text}"

        if children is None:
            self.children = None
        else:
            self.children = {c.tag: c for c in children}

    def parse(self, lexical: Lexical) -> Optional[GedcomRecord]:
        """
        Read current line from lexical parser, and process it.
        This doesn't modify self, and is fully reentrant
        """

        if self.tag:
            p = lexical.consume()
            assert p is not None
            assert p.tag == self.tag, f'{p.tag} != {self.tag}'
        else:
            # special case for toplevel FILE
            p = Lexical_Line(
                linenum=0,
                xref_id=None,
                value='',
                tag='',
                level=-1,
            )

        tags: Dict[str, int] = {}  # tag -> number of times children were seen
        val = p.value
        has_xref = False

        if self.text is None:
            if p.value:
                lexical.error(
                    f"Unexpected text value after {p.tag}",
                    line=p.linenum,
                    fatal=False)
            val = ''

        elif self.text == "Y":
            # Gedcom standard says value must be "Y", but PAF also uses "N".
            # The tag should simply not be there in this case
            if p.value and p.value not in ("Y", "N"):
                lexical.error(
                    f"Unexpected text value after {p.tag}, expected 'Y'",
                    line=p.linenum,
                    fatal=False)

        elif self.text == "":
            pass   # allow any text

        else:
            has_xref = p.value != ''

        r = GedcomRecord(
            id=p.xref_id,
            line=p.linenum,
            tag=p.tag,
            value=val,
        )

        while True:
            peeked = lexical.peek()
            assert peeked is not None
            if peeked.level <= p.level:
                break

            cdescr = (
                None
                if self.children is None
                else self.children.get(peeked.tag, None)
            )
            count = tags[peeked.tag] = tags.setdefault(peeked.tag, 0) + 1
            reflevel = peeked.level

            if cdescr is None:
                if peeked.tag[0] == '_':
                    # A custom tag is allowed, and should accept anything
                    # ??? Wrong, the warning should be displayed elsewhere
                    lexical.error(
                        f"Custom tag ignored: {peeked.tag}",
                        line=peeked.linenum)
                else:
                    lexical.error(
                        f"Unexpected tag: {self.tag or 'root'} > {peeked.tag}",
                        line=peeked.linenum,
                        fatal=True)

                # skip this record
                while True:
                    lexical.consume()
                    peeked = lexical.peek()
                    assert peeked is not None
                    if peeked.level <= reflevel:
                        break

            else:
                if cdescr.max != unlimited and cdescr.max < count:
                    lexical.error(
                        f'Too many {peeked.tag} in {p.tag} (skipped)',
                        line=peeked.linenum,
                        fatal=False)
                c = cdescr.parse(lexical)  # read until end of child record
                if c is not None:
                    r.fields.append(c)

        # We have parsed all children, make sure we are not missing any

        if self.children is not None and not has_xref:
            # Not an xref, check we have the right children
            for ctag, cdescr in self.children.items():
                if tags.get(ctag, 0) < cdescr.min:
                    ptag = p.tag if p.tag else "file"
                    count = cdescr.min - tags.get(ctag, 0)
                    if ptag[0] != "_":
                        lexical.error(
                            f'Missing {count} occurrence of {ctag} in {ptag}',
                            line=p.linenum,
                            fatal=True,
                        )
                    else:
                        lexical.error(
                            f'Skipping {ptag}, missing {count}'
                            f' occurrence of {ctag}',
                            line=p.linenum,
                            fatal=False,
                        )
                    return None

        return r

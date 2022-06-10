from typing import Optional, Callable
from .exceptions import Invalid_Gedcom
from .file import File


class Lexical_Line:
    __slots__ = ("linenum", "level", "tag", "xref_id", "value")

    def __init__(
            self,
            linenum: int,
            level: int,
            tag: str,
            xref_id: Optional[str],
            value: str,
            ):
        self.linenum = linenum
        self.level = level
        self.tag = tag.upper()
        self.xref_id = xref_id
        self.value = value


class Lexical:
    """
    Return lines of the GEDCOM file, taking care of concatenation when
    needed, and potentially skipping levels
    """

    def __init__(
            self,
            stream: File,
            print_warning: Callable[[str], None],
            ):
        """
        Lexical parser for a GEDCOM file. This returns lines one by one,
        after splitting them into components. This automatically groups
        continuation lines as appropriate
        """
        self.file = stream
        self.level = 0     # Level of the current line
        self.line = 0      # Current line
        self.print_warning = print_warning

        self.encoding = 'iso_8859_1'
        self.decode = self.decode_any

        line = self.file.readline()
        assert line is not None

        if self.line == 1 and line[0: 3] == b"\xEF\xBB\xBF":
            self.encoding = 'utf-8'
            line = line[3:]

        # current line, after resolving CONT and CONC
        self.current: Optional[Lexical_Line] = None

        self.prefetch = self._parse_line(line)
        if (
                self.prefetch is None
                or self.prefetch.level != 0
                or self.prefetch.tag != 'HEAD'
           ):
            self.error(
                "Invalid gedcom file, first line must be '0 HEAD'"
                f" got {line!r}",
                fatal=True,
            )

        self._readline()

    def decode_heredis_ansi(self, value: bytes) -> str:
        value = value.replace(bytes([135]), bytes([225]))  # a-acute
        value = value.replace(bytes([141]), bytes([231]))  # c-cedilla
        return value.decode('iso-8859-1', "replace")

    def decode_any(self, value: bytes) -> str:
        return value.decode(self.encoding, "replace")

    def error(self, msg: str, fatal=False, line: int = None) -> None:
        m = f"{self.file.name}:{line or self.line} {msg}"
        if fatal:
            raise Invalid_Gedcom(m)
        else:
            self.print_warning(m)

    def _parse_line(self, raw_line: Optional[bytes]) -> Optional[Lexical_Line]:
        """
        Parse one line into its components
        """
        self.line += 1
        if not raw_line:
            return None

        # The standard limits the length of lines, but some software ignore
        # that, like Reunion on OSX for instance (#20)
        # The call to split gets rid of leading and trailing whitespaces

        line = self.decode(raw_line).split('\n')[0]
        g = line.split(None, 2)   # Extract first three fields
        if len(g) < 2:
            self.error(f"Invalid line '{line}'", fatal=True)

        if g[1][0] == '@':
            # "1 @I0001@ INDI"
            # "1 @N0001@ NOTE value"
            tag_and_val = g[2].split(None, 1)
            r = Lexical_Line(
                linenum=self.line,
                level=int(g[0]),
                tag=tag_and_val[0],
                xref_id=g[1],
                value=tag_and_val[1] if len(tag_and_val) == 2 else '',
            )
        else:
            # "2 RESI where"
            r = Lexical_Line(
                linenum=self.line,
                level=int(g[0]),
                tag=g[1],
                xref_id=None,
                value=g[2] if len(g) == 3 else '',
            )

        if r.level == 1 and r.tag == "CHAR":
            if r.value == "ANSEL":
                self.encoding = "iso-8859-1"
                self.decode = self.decode_any
            elif r.value == "ANSI":
                # ??? Heredis specific
                self.encoding = "heredis-ansi"
                self.decode = self.decode_heredis_ansi
            elif r.value == "UNICODE":
                self.encoding = "utf-16"
                self.decode = self.decode_any
            elif r.value == "UTF-8":
                self.encoding = "utf-8"
                self.decode = self.decode_any
            elif r.value == "ASCII":
                self.encoding = "ascii"
                self.decode = self.decode_any
            else:
                self.error(f'Unknown encoding {r.value}')

        return r

    def peek(self) -> Optional[Lexical_Line]:
        return self.current

    def consume(self) -> Optional[Lexical_Line]:
        c = self.current
        self._readline()
        return c

    def _readline(self) -> None:
        if not self.prefetch:
            self.current = Lexical_Line(
                linenum=self.line + 1,
                level=-1,
                tag='',
                xref_id=None,
                value='',
            )
            return

        result = self.prefetch
        value = result.value
        self.prefetch = self._parse_line(self.file.readline())

        while self.prefetch:
            if self.prefetch.tag == "CONT":
                value += "\n"
                value += self.prefetch.value
            elif self.prefetch.tag == "CONC":
                value += self.prefetch.value
            else:
                break

            self.prefetch = self._parse_line(self.file.readline())

        # It seems that tags are case insensitive
        self.current = Lexical_Line(
            linenum=result.linenum,
            level=result.level,
            tag=result.tag,
            xref_id=result.xref_id,
            value=value,
        )

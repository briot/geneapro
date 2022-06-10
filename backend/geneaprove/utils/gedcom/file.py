from typing import Optional, BinaryIO, Union


class File:
    """
    Represents a gedcom file to be imported.
    The filename could be either the path to a file on the disk (for instance
    when running from 'manage.py'), or actual binary data uploaded by the user.
    """

    def __init__(self, filename: Union[str, BinaryIO]):
        if isinstance(filename, str):
            # Do not assume a specific encoding, so read as bytes
            with open(filename, "rb") as f:
                self.buffer: bytes = f.read()
            self.name = filename
        else:
            self.buffer = filename.read()
            self.name = '<stdin>'

        self.pos: Optional[int] = 0

    def readline(self) -> Optional[bytes]:
        """
        Return the next line, omitting the \n, \r or \r\n terminator
        """
        p = self.pos
        if p is None or p >= len(self.buffer):
            return None

        while True:
            c = self.buffer[p]
            if c == 10:
                result = self.buffer[self.pos:p]
                self.pos = p + 1
                return result
            elif c == 13:
                result = self.buffer[self.pos:p]
                self.pos = p + 1
                if self.pos < len(self.buffer) and self.buffer[self.pos] == 10:
                    self.pos += 1
                return result
            p += 1
            if p >= len(self.buffer):
                result = self.buffer[self.pos:]
                self.pos = None
                return result

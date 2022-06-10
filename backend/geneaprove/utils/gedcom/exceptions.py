class Invalid_Gedcom(Exception):

    def __init__(self, msg: str):
        super().__init__(self)
        self.msg = msg

    def __repr__(self):
        return self.msg

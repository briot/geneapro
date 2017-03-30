from geneaprove import models
from string import Template
import re


class Citation_Style(object):
    """This object describes a full citation for a source."""

    def __init__(self, category, type, biblio, full, short):
        """
        :param category: a translatable string that describes the category
           for the source.
        :param type: a translatable string that describes the specific type
           of source.
        :param biblio: a template that describes how to generate the citation
           from the citation parts. This is suitable for display in a list of
           sources or bibliography.
        :param full: a template that describes how to display the initial
           citation for a source, the first time that particular reference is
           citated.
        :param short: a template that describes how to display the subsequent
           citations for the source.
        """
        self.category = category
        self.type = type
        self.biblio = biblio
        self.full = full
        self.short = short

    def cite(self, source, unknown_as_text=True):
        """
        Compute the citation for a source. This function does not use the
        computed name from the database, but recompute its from the citation
        parts.
    
        :param source: a models.Source or a dictionary of (key,value) for the
           citation parts.
        :return: a Source_Citation.
        """

        subst = {}
        for part in self.required_parts():
            subst[part] = 'unknown %s' % part if unknown_as_text else ''

        if isinstance(source, models.Source):
            subst['_title'] = source.title
            subst['_abbrev'] = source.abbrev
            subst['_biblio'] = source.biblio
            for part in source.parts.select_related('type__name').all():
                subst[part.type.name] = part.value
        elif isinstance(source, dict):
            for k, v in source.items():
                if v != '':
                    subst[k] = v
        else:
            raise Exception("Invalid parameter to cite()")

        def __repl(repl):
            return subst[repl.group(1)]

        # An unknown type ? use the explicit title from the user

        if self.biblio == "":
            full = subst.get('_title', '')
            abbrev = subst.get('_abbrev', '')
            return Source_Citation(full, full, abbrev)

        # Otherwise, only take those parts that are necessary
        else:
            r = re.compile("\$\{([^}]+)\}")
            return Source_Citation(
                r.sub(__repl, self.biblio),
                r.sub(__repl, self.full),
                r.sub(__repl, self.short))

    def required_parts(self):
        """Return the set of citation parts that are necessary to build the
           citation.
        """
        parts = set()
        r = re.compile("\$\{([^}]+)\}")

        for word in r.findall(self.biblio):
            parts.add(word)
        for word in r.findall(self.full):   # Should be subset of biblio
            parts.add(word)
        for word in r.findall(self.short):  # Should be subset of biblio
            parts.add(word)

        return parts


No_Citation_Style = Citation_Style("", "", "", "", "")


class Source_Citation(object):
    """The citation for a source. This is the result of the expansion of
       a Citation_Style object."""

    def __init__(self, biblio, full, short):
        self.biblio = biblio
        self.full = full
        self.short = short

    def to_json(self):
        return {'biblio': self.biblio,
                'full': self.full,
                'short': self.short}



from geneaprove import models
from . import evidence_style
from . import style


class Citations(object):
    # The chosen style of citations
    style_guide = evidence_style.evidence_style

    @staticmethod
    def get_citation(type):
        """
        :param type: a string, the type of the source.
        :return: the Citation_Type corresponding to type in the current style.
        """
        c = Citations.style_guide.get(type, None)
        if c is None:
            return style.No_Citation_Style
        else:
            return c

    @staticmethod
    def source_types():
        """
        Return the list of all known source types.
        """
        d = [{'id': key, 'type': t.type, 'category': t.category}
             for key, t in Citations.style_guide.items()]
        return sorted(d, key=lambda e: (e['category'], e['type']))

"""
Source-related views
"""

import os
from django.conf import settings
from geneaprove.views.to_json import JSONView
from geneaprove import models
from geneaprove.utils.citations import Citations


def get_source(id):
    # pylint: disable=redefined-builtin
    """
    Get source information for a single source.
    This also gets information for related fields like repositories
    and researcher.
    :param int id: the id of the source to get, or -1 for a new source
    """

    if id == -1:
        s = models.Source()

        # ??? Should get the researcher from the logged person
        s.researcher = models.Researcher.objects.get(id=1)
        return s

    else:
        return models.Source.objects.select_related(
            'researcher').get(pk=id)


class CitationModel(JSONView):
    """
    Return the citation model for a given id
    """

    def get_json(self, params, model_id):
        # pylint: disable=arguments-differ
        citation = Citations.get_citation(model_id)
        return {
            'biblio': citation.biblio,
            'full': citation.full,
            'abbrev': citation.short
        }


class CitationModels(JSONView):
    """
    Return the list of all known citation models
    """

    def get_json(self, params):
        return {
            'repository_types': models.Repository_Type.objects.all(),
            'source_types': Citations.source_types()
        }


class SourceCitation(JSONView):
    """
    Return the citation parts for a source
    """

    def get_json(self, params, id):
        # pylint: disable=arguments-differ
        # pylint: disable=redefined-builtin
        return {
            'parts': get_source(id).get_citations_as_list()
        }


class SourceView(JSONView):
    """
    View a specific source by id
    """

    def get_json(self, params, id):
        # pylint: disable=arguments-differ
        # pylint: disable=redefined-builtin
        source = get_source(id)
        return {
            'source':  source,
            'higher_sources': source.get_higher_sources(),
            'asserts': source.get_asserts(),
            'repr':    source.get_representations(),
        }


class EditSourceCitation(JSONView):
    """
    Perform some changes in the citation parts for a source, and returns a
    JSON similar to SourceCitation
    """

    def post_json(self, params, id):
        # pylint: disable=arguments-differ
        # pylint: disable=redefined-builtin
        if id == -1:
            src = get_source(id=-1)
            src.save()
        else:
            src = models.Source.objects.get(id=id)

        new_type = params.get('medium')

        src.parts.all().delete()

        if src.medium != new_type:
            parts = Citations.get_citation(new_type).required_parts()
        else:
            parts = None

        for key, value in params.items():
            if key in ('csrfmiddlewaretoken', 'sourceId'):
                continue
            elif key == 'medium':
                # Only set the medium if different from the parent. Otherwise,
                # leave it null, so that changing the parent also changes the
                # lower level sources

                # ??? bug in pylint
                # pylint: disable=no-member
                if src.higher_source is None \
                   or src.higher_source.medium != value:
                    src.medium = value
                else:
                    src.medium = None
            elif key == 'comments':
                src.comments = value
            elif key == 'abbrev':
                src.abbrev = value
            elif key == 'biblio':
                src.biblio = value
            elif key == 'title':
                src.title = value
            elif key == 'subject_date':
                src.subject_date = value
            elif key == 'subject_place':
                pass
                # src.subject_place = value
            elif key == 'jurisdiction_place':
                pass
                # src.jurisdiction_place = value
            elif key == 'higher_source_id':
                src.higher_source_id = int(value)
            elif key[0] == '_':
                raise Exception('Field not processed: %s' % key)
            elif value and (parts is None or key in parts):
                # A citation part
                try:
                    type = models.Citation_Part_Type.objects.get(name=key)
                except models.Citation_Part_Type.DoesNotExist:
                    type = models.Citation_Part_Type.objects.create(name=key)

                p = models.Citation_Part.objects.create(
                    type=type, value=value, source_id=src.id)
                src.parts.add(p)

        src.save()

        return SourceCitation().get_json(params, id=src.id)


class SourcesList(JSONView):
    """
    View the list of all sources
    """

    def get_json(self, params):
        return models.Source.objects.order_by(
            'abbrev', 'title').select_related(
                'researcher', 'subject_place', 'jurisdiction_place')


class SourceRepresentations(JSONView):
    """
    Return the list of representations for a source
    """

    def get_json(self, params, id):
        # pylint: disable=arguments-differ
        # pylint: disable=redefined-builtin
        source = get_source(id)
        return {
            'source':  source,
            'repr':    source.get_representations()
        }


class AddSourceRepr(JSONView):
    """
    Adding a new representation to a source.
    """

    def post_json(self, params, id):
        # pylint: disable=arguments-differ
        # pylint: disable=redefined-builtin
        source = get_source(id)

        files = params.files.getlist('file')
        dir = os.path.join(settings.MEDIA_ROOT, 'S%s' % id)
        try:
            os.makedirs(dir)
        except OSError:
            pass

        for f in files:
            # Find a unique name
            name = os.path.join(dir, f.name)
            index = 1
            while os.path.isfile(name):
                name, ext = os.path.splitext(name)
                if index == 1:
                    name = '%s_%s%s' % (name, index, ext)
                else:
                    name = '%s_%s%s' % (name[0:name.rfind('_')], index, ext)
                index += 1

            with open(name, "w") as w:
                for c in f.chunks():
                    w.write(c)

            r = models.Representation.objects.create(
                source=source,
                mime_type=f.content_type,
                file=name)
            r.save()

        return SourceRepresentations().get_json(None, id=id)


class DelSourceRepr(JSONView):
    """
    Deleting a representation from a source
    """

    def post_json(self, params, id, repr_id):
        # pylint: disable=arguments-differ
        # pylint: disable=redefined-builtin
        ondisk = params.get('ondisk', False)

        error = ""
        repr = models.Representation.objects.get(id=int(repr_id))
        if ondisk:
            try:
                os.unlink(repr.file)
            except IOError:
                error = "Could not delete %s" % (repr.file)

        repr.delete()

        data = SourceRepresentations().get_json(None, id=id)
        if error:
            data['error'] = error
        return data
"""
Representation-related views
"""

from django.http import HttpResponse
from django.shortcuts import render_to_response
from django.template import RequestContext
from geneaprove import models
import os.path


def create_resized_image(image_name, original_location,
                         xconstrain=200, yconstrain=200):
    """
    Takes an input URL for an image, a name for the image for it to be saved
    as, and the optional xconstrain and yconstrain options, which are used to
    define the constraints to resize the image to. If these are not specified,
    they will default to 200px each. Returns the path to the image.
    Adapted from http://djangosnippets.org/snippets/53/
    """
    from PIL import Image, ImageOps
    import urllib
    import os
    from django.conf import settings

    # Ensure a resized image doesn't already exist in the default
    # MEDIA_ROOT/images/resized

    dir = '%s/images/%d-%d' % (settings.MEDIA_ROOT, xconstrain, yconstrain)
    try:
        os.mkdir(dir)
    except OSError:
        pass

    name = '%s/%s' % (dir, image_name)

    if not os.path.exists(name):
        unsized_image = urllib.urlretrieve(str(original_location))
        unsized_image = Image.open(unsized_image[0])
        unsized_image = unsized_image.convert("RGB")
        unsized_image.thumbnail((xconstrain, yconstrain), Image.ANTIALIAS)
        unsized_image.save(name)

    return name


def view(request, size, repr_id):
    """Return a specific representation"""

    repr = models.Representation.objects.get(id=repr_id)

    try:
        f = repr.file

        if size != 'full':
            f = create_resized_image(f.replace("/","__"), repr.file,
                                     xconstrain=int(size),
                                     yconstrain=int(size))

        response = HttpResponse(open(f).read(), mimetype=repr.mime_type)
        response['Content-Disposition'] = 'attachment; filename=%s' % (
            os.path.basename (repr.file))
        return response

    except Exception, e:
        print "Got exception", e

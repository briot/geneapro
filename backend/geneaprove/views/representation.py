"""
Representation-related views
"""

import urllib.request
import os
from PIL import Image      # type: ignore
from django.conf import settings
from django.http import HttpResponse
from geneaprove import models


def create_resized_image(
        image_name: str,
        original_location: str,
        xconstrain=200,
        yconstrain=200,
        ) -> str:
    """
    Takes an input URL for an image, a name for the image for it to be saved
    as, and the optional xconstrain and yconstrain options, which are used to
    define the constraints to resize the image to. If these are not specified,
    they will default to 200px each. Returns the path to the image.
    Adapted from http://djangosnippets.org/snippets/53/
    """
    # Ensure a resized image doesn't already exist in the default
    # MEDIA_ROOT/images/resized

    dir = f'{settings.MEDIA_ROOT}/images/{xconstrain}-{yconstrain}'
    try:
        os.mkdir(dir)
    except OSError:
        pass

    name = f'{dir}/{image_name}'

    if not os.path.exists(name):
        unsized_image = urllib.request.urlretrieve(str(original_location))
        img = Image.open(unsized_image[0])
        img = img.convert("RGB")
        img.thumbnail((xconstrain, yconstrain), Image.ANTIALIAS)
        img.save(name)

    return name


def view(request, id, size=None):
    """Return a specific representation"""
    # pylint: disable=unused-argument

    repr = models.Representation.objects.get(id=id)
    f = repr.file

    if size:
        f = create_resized_image(f.replace("/", "__"), repr.file,
                                 xconstrain=int(size),
                                 yconstrain=int(size))

    try:
        bin = open(f, "rb").read()
    except FileNotFoundError:
        bin = ''

    response = HttpResponse(bin, content_type=repr.mime_type)
    response['Content-Disposition'] = (
        f'attachment; filename={os.path.basename(repr.file)}'
    )
    return response

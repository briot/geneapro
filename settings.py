# Django settings for mysites project.
import os.path

DEBUG = True
TEMPLATE_DEBUG = DEBUG

ADMINS = (
	('Emmanuel Briot', 'briot@adacore.com'),
)

MANAGERS = ADMINS

DATABASE_ENGINE='postgresql'
DATABASE_NAME='geneapro'
DATABASE_USER='briot'
DATABASE_PASSWORD=''
DATABASE_HOST=''
DATABASE_PORT=''

#DATABASE_ENGINE = 'sqlite3'    # or 'mysql'
#DATABASE_NAME = 'database.db'  # Or path to database file if using sqlite3.

# Local time zone for this installation. Choices can be found here:
# http://en.wikipedia.org/wiki/List_of_tz_zones_by_name
# although not all choices may be available on all operating systems.
# If running in a Windows environment this must be set to the same as your
# system time zone.
TIME_ZONE = 'America/Vancouver'

# Language code for this installation. All choices can be found here:
# http://www.i18nguy.com/unicode/language-identifiers.html
LANGUAGE_CODE = 'en-us'

SITE_ID = 1

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# Absolute path to the directory that holds media.
# Example: "/home/media/media.lawrence.com/"
MEDIA_ROOT = os.path.join (os.path.dirname (__file__),	"resources/media/")

# URL that handles the media served from MEDIA_ROOT. Make sure to use a
# trailing slash if there is a path component (optional in other cases).
# Examples: "http://media.lawrence.com", "http://example.com/media/"
MEDIA_URL = '/media/'

# URL prefix for admin media -- CSS, JavaScript and images. Make sure to use a
# trailing slash.
# Examples: "http://foo.com/media/", "/media/".
ADMIN_MEDIA_PREFIX = '/media-admin/'

# Make this unique, and don't share it with anybody.
SECRET_KEY = 'oow@*jaewp$qa0@wmy*(=c9sm0dlx^y!z%5=+ied!()1$+n-!4'

# List of callables that know how to import templates from various sources.
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.load_template_source',
    'django.template.loaders.app_directories.load_template_source',
#     'django.template.loaders.eggs.load_template_source',
)

TEMPLATE_CONTEXT_PROCESSORS = (
	"django.core.context_processors.auth",  # Adds "user", "messages", "perms"
	"django.core.context_processors.debug", # Adds "debug", "sql_queries"
	"django.core.context_processors.i18n",  # Adds "LANGUAGES", "LANGUAGE_CODE"
	"django.core.context_processors.media", # Adds "MEDIA_URL"
)

MIDDLEWARE_CLASSES = (
    'django.middleware.gzip.GZipMiddleware',
    'mysites.middleware.simple_exception.AJAXSimpleExceptionResponse',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
)

INTERNAL_IPS = ('192.168.1.102','127.0.0.1',)

ROOT_URLCONF = 'mysites.urls'

TEMPLATE_DIRS = (
    # Always use forward slashes, even on Windows.
    # Don't forget to use absolute paths, not relative paths.
    os.path.join (os.path.dirname (__file__),	"resources/"),
)

INSTALLED_APPS = (
    'django.contrib.auth',          # Authentication system
    'django.contrib.contenttypes',  # Framework for content types
    'django.contrib.sessions',      # Session framework
	'django.contrib.admin',         # Admin page
	#'django.contrib.admindocs',     # Admin documentation (/admin/doc/)
    'django.contrib.sites',         # Managing multiple sites with one install
	'mysites.geneapro',

   # 'extensions',  # old name for django extensions (opensuse)
    'django_extensions', # new name for django extensions
)

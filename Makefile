PYTHONPATH:=/home/briot/genealogy/geneapro/:$(PYTHONPATH)
export PYTHONPATH

DJANGO_SETTINGS_MODULE=mysites.settings
export DJANGO_SETTINGS_MODULE

test:
	./manage.py test --verbosity=1 --settings=testsettings
test_verbose:
	./manage.py test --verbosity=2 --settings=testsettings

reset:
	./manage.py reset --noinput geneapro
	./manage.py loaddata geneapro/initial_data.json

import:
	python -c "from mysites.geneapro.importers.gedcomimport import test;test()"

dump:
	./manage.py dumpdata --format=xml geneapro > dump.xml
	./manage.py dumpdata --format=json geneapro > dump.json

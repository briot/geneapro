# Need to install node modules
all:
	npm install

test:
	./manage.py test --verbosity=1 --settings=testsettings
test_verbose:
	./manage.py test --verbosity=2 --settings=testsettings

syncdb:
	./manage.py syncdb

dump:
	./manage.py dumpdata --format=xml geneaprove > dump.xml
	./manage.py dumpdata --format=json geneaprove | python -mjson.tool > dump.json

## The following require the django extensions and graphviz
## See the list of installed apps in settings.py

graph:
	./manage.py graph_models auth geneaprove |dot -Tpng -o test.png
shell:
	./manage.py shell_plus
run:
	./manage.py runserver_plus

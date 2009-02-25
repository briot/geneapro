test:
	./manage.py test --verbosity=1 --settings=testsettings
test_verbose:
	./manage.py test --verbosity=2 --settings=testsettings

reset:
	./manage.py reset --noinput geneapro
	./manage.py loaddata geneapro/initial_data.json

syncdb:
	./manage.py syncdb

full_reset: syncdb reset

dump:
	./manage.py dumpdata --format=xml geneapro > dump.xml
	./manage.py dumpdata --format=json geneapro > dump.json

## The following require the django extensions and graphviz
## See the list of installed apps in settings.py

graph:
	./manage.py graph_models auth geneapro |dot -Tpng -o test.png
shell:
	./manage.py shell_plus
run:
	./manage.py runserver_plus

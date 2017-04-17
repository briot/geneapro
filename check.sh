files=`find backend/geneaprove -name '*py' | \
   grep -v -e evidence_style.py -e migrations | \
   grep -v gedcomimport.py`

echo $files | xargs pep8

pylint --rcfile=backend/pylint.rc --reports=n $files

#for f in $files ; do
#   echo "============ $f ==============="
#   pylint --rcfile=backend/pylint.rc --reports=n $f
#done


# Setup geneaprove for developers

PYTHON=${PYTHON:-python}
VIRTUALENV=${VIRTUALENV:-virtualenv}
NODE=${NODE:-node}
NPM=${NPM:-npm}

######################
# Check requirements #
######################

$PYTHON --version 2>&1 | grep " 2.7" >/dev/null
if [ $? != 0 ]; then
   echo "Python not found (needs 2.7)"
   exit 1
fi

${VIRTUALENV} --python="$PYTHON" --quiet --version >/dev/null
if [ $? != 0 ]; then
   echo "Virtualenv not found"
   exit 1
fi

${NODE} -v 2>/dev/null | grep v7.7 >/dev/null
if [ $? != 0 ]; then
   echo "nodejs 7.7 not found"
   exit 1
fi

${NPM} -v 2>/dev/null | fgrep 4.2. >/dev/null
if [ $? != 0 ]; then
   echo "npm 4.2 not found"
   exit 1
fi

#########################
# Front-end development #
#########################

# package.json has already been created. It was created with the following
# steps:
#
#   In a new directory:
#      mkdir angular-cli
#      cd angular-cli
#      npm install @angular/cli@latested
#      export PATH=`pwd`/node_modules/.bin:$PATH
#
#   In another directory (but not a subdirectory of the above):
#      mkdir geneaprove
#      cd geneaprove
#      ng new --style=sass geneaprove

# Now make sure we have all required node modules

${NPM} install

########################
# Back-end development #
########################

if [ ! -d python_env ]; then
   ${VIRTUALENV} --python="$PYTHON" --relocatable python_env
fi

source python_env/bin/activate

pip install django
pip install pillow

# The actual layout of the sources was created with:
#     django-admin startproject backend
#     cd backend
#     ./manage.py startapp geneaprove

#########################################
# Generate the sources and start server #
#########################################

sh ./tmux.sh

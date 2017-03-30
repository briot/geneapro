# Setup geneaprove for developers

# Which python interpreter to use (need python 3)
# Only needed when no virtualenv has been setup yet
PYTHON=${PYTHON:-python}

VIRTUALENV=${VIRTUALENV:-virtualenv}
NODE=${NODE:-node}
NPM=${NPM:-npm}

######################
# Check requirements #
######################

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
   $PYTHON --version 2>&1 | grep " 3.6" >/dev/null
   if [ $? != 0 ]; then
      echo "Python not found (needs 3.6)"
      exit 1
   fi
   
   ${VIRTUALENV} --python="$PYTHON" --quiet --version >/dev/null
   if [ $? != 0 ]; then
      echo "Virtualenv not found"
      exit 1
   fi

   ${VIRTUALENV} --python="$PYTHON" python_env
   source python_env/bin/activate

else
   # Check installed python version
   source python_env/bin/activate

   python --version 2>&1 | grep " 3.6" >/dev/null
   if [ $? != 0 ]; then
      echo "Incorrect python version in python_env/: needs 3.6"
      echo "Remove python_env/ and rerun $0"
      exit 1
   fi
fi

pip install django
pip install pillow

# The actual layout of the sources was created with:
#     django-admin startproject backend
#     cd backend
#     ./manage.py startapp geneaprove

###################
# Create database #
###################

#########################################
# Generate the sources and start server #
#########################################

sh ./tmux.sh

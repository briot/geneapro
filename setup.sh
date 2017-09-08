# Setup geneaprove for developers

# Which python interpreter to use (need python 3)
# Only needed when no virtualenv has been setup yet
PYTHON=${PYTHON:-python3.6}

VIRTUALENV=${VIRTUALENV:-virtualenv}
NODE=${NODE:-node}

######################
# Check requirements #
######################

${NODE} -v 2>/dev/null | grep v7.10.1 >/dev/null
if [ $? != 0 ]; then
   echo "nodejs 7.10.1 not found"
   exit 1
fi

#########################
# Front-end development #
#########################

yarn install

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

pip install django pillow pylint pylint-django pep8 autopep8

# The actual layout of the sources was created with:
#     django-admin startproject backend
#     cd backend
#     ./manage.py startapp geneaprove

###################
# Create database #
###################

(
   cd backend
   dir=`./manage.py showconf | grep dir= | cut -d= -f2`
   mkdir -p "$dir"
   ./manage.py migrate
)

#########################################
# Generate the sources and start server #
#########################################

sh ./tmux.sh

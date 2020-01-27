# Setup geneaprove for end-users and developers

DEVELOPER=${DEVELOPER:-no}
VENV=python_env

#########################
# Front-end development #
#########################

npm install

########################
# Back-end development #
########################

if [ ! -d python_env ]; then
   python3 -m venv python_env
fi

${VENV}/bin/python -c \
   'import sys; v = sys.version_info; assert v.major==3 and v.minor>=7' \
   2>/dev/null
if [ $? != 0 ]; then
   echo "Incorrect python version in python_env/: needs at least 3.7"
   echo "Remove python_env/ and rerun $0"
   exit 1
fi

${VENV}/bin/pip install       \
   appdirs==1.4               \
   django==3.0.2              \
   django_extensions==2.2.6   \
   django-cors-headers==3.2.1 \
   grandalf==0.6              \
   pillow==6.1                \
   psycopg2-binary==2.8

if [ "$DEVELOPER" != "no" ]; then
   # Some useful tools for developers. 
   ${VENV}/bin/pip install \
      autopep8             \
      cprofilev            \
      pep8                 \
      pyinstaller          \
      pylint               \
      pylint-django
fi

# The actual layout of the sources was created with:
#     django-admin startproject backend
#     cd backend
#     ./manage.py startapp geneaprove

###################
# Create database #
###################

MANAGE_PY="${VENV}/bin/python backend/manage.py"
(
   dir=`${MANAGE_PY} showconf | grep dir= | cut -d= -f2`
   mkdir -p "backend/$dir"
   ${MANAGE_PY} makemigrations
   ${MANAGE_PY} migrate
)

#########################################
# Generate the sources and start server #
#########################################

if [ "$DEVELOPER" = "no" ]; then
   # Non-developers will use a static version of JS and CSS.
   # They should connect directly to the server on the :8002 port
   npm run build     # create static version of site

   echo "---------------------------------------------------------"
   echo "Geneaprove: next time, you can simply run 'sh ./server.sh'"
   echo "Connect to localhost:8002"
   echo "---------------------------------------------------------"
   sh ./server.sh    # run the server
else
   # Developers should connect to the node server, which will proxy to the
   # django server as needed. This means javascript files will be recompiled
   # as they are modified.
   # They should connect to localhost:3000, which will be opened automatically
   # by npm.
   #   (
   #      rm -rf build/

   #      # run both in parallel. When the server is killed with ctrl-c, bring
   #      # client to the foreground so that it can also be killed with ctrl-c
   #      npm run start &
   #      sh ./server.sh && fg
   #   )
   echo
fi

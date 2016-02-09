# -*- mode: python -*-

# Spec for pyinstaller 2016-02-08
# pyinstaller does not work out of the box with django 1.7, so we have
# to manually add a number of packages here.
# On El Capitan, it was necessary to modify
#  PyInstaller/building/api.py
# and comment out the call to shutil.copystat

block_cipher = None

# Parse settings.py to find required modules and static files
# Future versions of pyinstaller might do that on their own, I guess.
# ??? Would be cleaner to implement as pyinstaller hooks

import os.path
import sys
path = '/Users/briot/genealogy/mysites/'
sys.path = [path] + sys.path
import mysites.settings as appsettings

hiddenimports = [
    '.'.join(klass.split('.')[:-1])
   for klass in appsettings.MIDDLEWARE_CLASSES]
datas = [
    # Extract the directory name, but dir might end with '/'
    (dir, os.path.basename(os.path.dirname(dir + '/')))
    for dir in appsettings.TEMPLATE_DIRS]

hiddenimports += [app + ".apps" for app in appsettings.INSTALLED_APPS]
hiddenimports += [
   'django.contrib.sessions.serializers']


a = Analysis([path + 'geneaprove.py'],
             pathex=[path + 'pyinstaller/geneaprove'],
             binaries=None,
             datas=datas,
             hiddenimports=hiddenimports,
             hookspath=[],
             runtime_hooks=[],
             excludes=[],
             win_no_prefer_redirects=False,
             win_private_assemblies=False,
             cipher=block_cipher)
pyz = PYZ(a.pure, a.zipped_data,
             cipher=block_cipher)
exe = EXE(pyz,
          a.scripts,
          exclude_binaries=True,
          name='geneaprove',
          debug=False,
          strip=False,
          upx=True,
          console=True )
coll = COLLECT(exe,
               a.binaries,
               a.zipfiles,
               a.datas,
               strip=False,
               upx=True,
               name='geneaprove')

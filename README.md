This is GeneaProve, a web-based genealogical software.
This README is organized as a FAQ, hopefully this will make it more readable.

Q. What do I need to install first ?

   Compiling and running geneaprove requires the following packages:
       python 3.6
       django >= 1.10.x
       sqlite >= 3.6
       nodejs >= 7.7.3
       npm >= 4.2.0
       tmux

   We know that things will not work as well with older versions, and the
   current priority of the project is to implement new features rather than
   support obsolete versions of these tools.

   The only database backend that has been tested so far is sqlite, although
   Django is such that it might work with other backends.

Q. How do I start the server ?

   Run the following:

       sh ./setup.sh

   This command will download required nodejs and python dependencies (which
   might take a while the first time), and then start the server.

   This command also creates an empty database if none exists yet.

   Once the second window shows that all web resources have been compiled,
   open a web browser and connect to:

      http://127.0.0.1:8000/

   Tested web browers include Safari, Firefox and Chrome.

Q. How do I import my GEDCOM data ?

   Currently, GeneaProve is a read-only view. You should therefore
   have a GEDCOM file created by another genealogy software.

   Once you have this file, you can click on "Import" in your web
   browser to import it into GeneaProve.

Q. Why did you implement this as a web server ?

   A traditional GUI (based on a native API like gtk+, QT or Win32)
   provide greater efficiency and flexibility in a lot of cases. However,
   web technologies are far more portable. In particular, since the server
   is written using a standard python framework (django), you could
   install it at your ISP, and then access your genealogy from anywhere
   using a mobile device. Since GeneaProve is implemented using standard
   web technologies (as opposed to Flash), this also increases its
   portability.

Q. What is the data model used in the database ?

   Although this should be transparent to the end user, the data model
   is almost a 1-to-1 mapping of the GenTech datamodel, which is based
   on assertions and avoids any limitations like a unique birth date per
   person for instance. Technically, you could also store negative
   assertions ("this person is _not_ born on that date"), which might be
   useful later on.

Q. What is the license ?

   This is GPL version 2 software, copyright Emmanuel Briot.

   (we kept version 2 for compatibility with Gramps, so that code from
   GeneaProve could eventually be of interest there)

#!/bin/sh

files=geneapro

pylint --variable-rgx="[a-z_][a-z0-9_]{0,30}$" \
       --init-hook='sys.path = sys.path + ["'`pwd`'/.."]' \
       --indent-string="   " \
       --min-public-methods=1 \
       --max-attributes=9 \
       --output-format=colorized \
       --disable-report=R0001,R0002,R0003,R0101,R0401,R0701,R0801 \
       "$files"

       #--disable-msg-cat=R \

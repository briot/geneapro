/**
 * Decorates a <canvas> element to show a pedigree view
 * @param {Element} canvas   The DOM element to decorate.
 * @param {} data   Sent by the server.
 * @extends {Canvas}
 */

function PedigreeCanvas(canvas, data) {
    AbstractPedigree.call(this, canvas /* elem */, data /* data */);
    this.setSameSize(false, true /* norefresh */);

    var f = this;  //  closure for callbacks
    $("#settings input[name=sameSize]")
       .change(function() { f.setSameSize(this.checked)});
    $("#settings #hspace")
       .slider({"min": 0, "max": 40,
                "change": function() {f.horizPadding = $(this).slider("value");
                                      f.setNeedLayout();
                                      f.refresh()}});
    $("#settings #vspace")
       .slider({"min": 0, "max": 20,
                "change": function() {f.vertPadding = $(this).slider("value");
                                      f.setNeedLayout();
                                      f.refresh()}});
    this.showSettings();
}
inherits(PedigreeCanvas, AbstractPedigree);

/**
 * Whether all boxes have the same size. Else the size decreases with the
 * generation.
 */
PedigreeCanvas.prototype.sameSize = true;

/**
 * Size of the boxes.
 * This is set automatically when calling setSameSize.
 */
PedigreeCanvas.prototype.boxWidth;
PedigreeCanvas.prototype.boxHeight;

/**
 * Padding on the side of each boxes.
 * This is set automatically when calling setSameSize.
 */
PedigreeCanvas.prototype.horizPadding;

/**
 * Minimal vertical space between two boxes
 */
PedigreeCanvas.prototype.vertPadding = 2;

/**
 * Size ratio from generation n to n + 1, until generation maxGenForRatio
 */
PedigreeCanvas.prototype.ratio;
PedigreeCanvas.prototype.wratio;
PedigreeCanvas.prototype.maxGenForRatio = 12;

/**
 * Change the value of this.sameSize.
 * @param {boolean} sameSize   Whether all boxes have the same size.
 * @param {boolean=} norefresh If true, do not refresh the canvas.
 */

PedigreeCanvas.prototype.setSameSize = function(sameSize, norefresh) {
    this.sameSize = sameSize;

    if (sameSize) {
        this.ratio = 1.0;
        this.wratio = 1.0;
        this.boxWidth = 200;
        this.boxHeight = 75;
        this.horizPadding = 20;
        this.maxFontSize = 15;
        this.maxGenForRatio = 0;
    } else {
        this.boxWidth = 300;
        this.horizPadding = 20;
        this.boxHeight = 40;
        this.ratio = 0.75;
        this.wratio = 0.75;
        this.maxFontSize = 20;

        // Keep reducing size until we reach 10% of the original size
        this.maxGenForRatio = Math.log(0.1) / Math.log(this.ratio);
    }

    this.setNeedLayout();

    if (!norefresh) {
        this.refresh();
    }
};

/** @inheritDoc */

PedigreeCanvas.prototype.personAtCoordinates = function(mx, my) {
    var selected = null;

    this.forEachVisiblePerson(
        function(indiv) {
           if (this.pointInBox(indiv.box_, mx, my)) {
                selected = indiv;
                return true;
            }
        });
    return selected;
};

/** @inheritDoc */

PedigreeCanvas.prototype.isVisible = function(person, box) {
   return AbstractPedigree.prototype.isVisible.call(this, person, box) && 
      this.boxIntersect(person.box_, box);
};

/**
 * Return the y position for a link to or form the person's box.
 * @return {number}
 * @private
 */

PedigreeCanvas.prototype.linkY_ = function(indiv) {
   if (this.colorScheme_ == AbstractPedigree.colorScheme.WHITE) {
      return indiv.box_.y + indiv.box_.fontSize;
   } else {
      return indiv.box_.y + indiv.box_.h / 2;
   }
};

/** @overrides */

PedigreeCanvas.prototype.onDraw = function(e, screenBox) {
    var ctx = this.ctx;
    var d = this.data;

    // First draw all lines, as a single path for more efficiency.

    ctx.beginPath();

    this.forEachVisiblePerson(
        function(indiv) {
           var x = indiv.box_.x;
           var w = indiv.box_.w;
           var linkY = this.linkY_(indiv);

           if (indiv.sosa <= 0) { // a descendant of decujus
               if (this.colorScheme_ == AbstractPedigree.colorScheme.WHITE) {
                  var x6 = x;
               } else {
                  var x6 = x + w;  //  left end of the link (child side)
               }

               var yForChild = this.linkY_(indiv.parent_);
               ctx.moveTo(x6, linkY);
               ctx.lineTo((x + w + indiv.parent_.box_.x) / 2, linkY);
               ctx.lineTo((x + w + indiv.parent_.box_.x) / 2, yForChild);
               ctx.lineTo(indiv.parent_.box_.x, yForChild);
           }
           else if (indiv.generation < this.gens) {
               var father = d.sosa[2 * indiv.sosa];
               var mother = d.sosa[2 * indiv.sosa + 1];
               if (father || mother) {
                  var x2 = (father || mother).box_.x; // left edge of parent
                  var x3 = x + w;  // right edge for current gen

                  // x5=right end of the link to the parent
                  // x6=left end of the link (child-side)
                  if (this.colorScheme_ == AbstractPedigree.colorScheme.WHITE) {
                     var x5 = x2 + (father || mother).box_.w;
                     var x6 = x;
                  } else {
                     var x5 = x2;
                     var x6 = x3;
                  }

                  var x4 = (x2 + x3) / 2; // half way between two boxes

                  ctx.moveTo(x6, linkY);
                  ctx.lineTo(x4, linkY);

                  if (father) {
                     var y1 = this.linkY_(father);
                     ctx.lineTo(x4, y1);
                     ctx.lineTo(x5, y1);
                  }

                  if (mother) {
                     var y1 = this.linkY_(mother);
                     ctx.moveTo(x4, linkY);
                     ctx.lineTo(x4, y1);
                     ctx.lineTo(x5, y1);
                  }
               }
           }
        });

    ctx.strokeStyle = "black";
    ctx.stroke();

    this.forEachVisiblePerson(
        function(indiv) {
           this.drawPersonBox(
               indiv /* person */,
               indiv.box_.x /* x */,
               indiv.box_.y /* y */,
               indiv.box_.w /* width */,
               indiv.box_.h /* height */,
               indiv.box_.fontSize /* fontsize */);

           if (indiv.box_.parentsMarriageFontSize > this.minFontSize
               && d.marriage[2 * indiv.sosa])
           {
               ctx.save();
               ctx.textBaseline = 'middle';
               ctx.fillStyle = "black";
               ctx.font = indiv.box_.parentsMarriageFontSize +
                  "px " + this.fontName;
               ctx.fillText(
                  event_to_string(d.marriage[2 * indiv.sosa]),
                  indiv.box_.parentsMarriageX,
                  this.linkY_(indiv));
               ctx.restore();
           }
        });
};

/** @inheritDoc */

PedigreeCanvas.prototype.showSettings = function() {
   // ??? Changing the maximum number of generations results in a double
   // recomputation of the layout, because the slider also receives a
   // changed event.
   AbstractPedigree.prototype.showSettings.call(
         this,
         this.layoutScheme_ == AbstractPedigree.layoutScheme.EXPANDED ?
             10 : MAXGENS /* maxGens */
         );

   $("#settings input[name=sameSize]").attr('checked', this.sameSize);
   $("#settings #hspace").slider({"value": this.horizPadding});
   $("#settings #vspace").slider({"value": this.vertPadding});
};

/** @inheritDoc
 *
 *  Compute display data for all boxes, given the number of generations
 *  to display. This is only recomputed when the number of generations
 *  has changed.
 *  For each person, adds an extra field box_ containing display information:
 *      {x:number, y:number,    // top-left coordinate for the box
 *       w:number, h:number,    // dimensions of the box
 *       fontSize:number,       // size of the font
 *       parentsMarriageX:number,
 *       parentsMarriageFontSize:number,
 *      }
 */

PedigreeCanvas.prototype.computeBoundingBox = function() {
    var d = this.data;

    // Store display info for a person
    function setupIndivBox(indiv, y, h) {
       if (indiv) {
          var g = Math.abs(indiv.generation);
          h = h || heights[g];
          indiv.box_ = {
             x: left[indiv.generation],
             y: y,
             w: widths[g],
             h: h,
             fontSize: fs[g],
             parentsMarriageX: left[indiv.generation + 1],
             parentsMarriageFontSize: fs[g + 1]};
       }
    }

    // Move a person's ancestors boxes up by a given offset
    function moveAncestors(sosa, offset) {
       var father = d.sosa[sosa * 2];
       if (father) {
          father.box_.y += offset;
          moveAncestors(father.sosa, offset);
       }
       var mother = d.sosa[sosa * 2 + 1];
       if (mother) {
          mother.box_.y += offset;
          moveAncestors(mother.sosa, offset);
       }
    }

    var left = [];    //  left coordinate for each generation
    var heights = []; //  box height for each generation
    var widths = [];  //  box width for each generation
    var fs = [];      //  fontSize for each generation

    // Compute sizes for each generation
    heights[0] = heights[-1] = this.boxHeight;
    fs[0] = fs[-1] = this.lineHeight * this.ratio;
    widths[0] = widths[-1] = this.boxWidth;

    var padding = this.horizPadding;
    var paddings = [];
    paddings[0] = padding;
    var maxgen = Math.max(this.gens, this.descendant_gens);
    for (var gen = 1; gen <= maxgen + 1; gen++) {
       if (gen <= this.maxGenForRatio) {
          heights[gen] = heights[gen - 1] * this.ratio;
          widths[gen] = widths[gen - 1] * this.wratio;
          fs[gen] = Math.round(Math.min(this.maxFontSize, fs[gen - 1] * this.ratio));
          if (gen < this.maxGenForRatio) {
             padding = padding * this.wratio;
          }
          paddings[gen] = padding;
       } else {
          heights[gen] = heights[gen - 1];
          widths[gen] = widths[gen - 1];
          fs[gen] = fs[gen - 1];
          paddings[gen] = paddings[gen - 1];
       }
    }

    // X coordinates are computed once we know the sizes. Left-most coordinate
    // is always 0
    left[-this.descendant_gens] = 0;
    for (var gen = -this.descendant_gens + 1; gen <= this.gens + 1; gen++) {
       left[gen] = left[gen - 1] + widths[Math.abs(gen - 1)] + paddings[Math.abs(gen)];
    }

    var minX = left[0];
    var minY = 0;
    var maxY = 0;
    var canvas = this;

    switch(this.layoutScheme_) {

    case AbstractPedigree.layoutScheme.EXPANDED:
       function doLayout(gen, sosa) {
          if (gen < canvas.gens) {
             var fy = doLayout(gen + 1, 2 * sosa);
             var my = doLayout(gen + 1, 2 * sosa + 1);
             var y = (fy + my + heights[gen + 1] - heights[gen]) / 2;
          } else {
             y = maxY + canvas.vertPadding;
          }
          maxY = Math.max(maxY, y + heights[gen]);
          if (d.sosa[sosa]) {
             setupIndivBox(d.sosa[sosa], y);
          }
          return y;
       }
       doLayout(0, 1);
       break;

    case AbstractPedigree.layoutScheme.COMPACT:
       // For the last generation, place each boxes as close as possible.
       // Then when we add the previous generation, we might move some of
       // the boxes from the previous generation downward to make space for
       // persons with no ancestors.
       
       function doLayout(indiv) {
          var gen = indiv.generation;
          if (gen < canvas.gens) {
             var father = d.sosa[2 * indiv.sosa];
             var mother = d.sosa[2 * indiv.sosa + 1];
          } else {
             father = mother = undefined;
          }
          if (father && mother) {
             doLayout(father);
             doLayout(mother);
             // center the box on its parents
             var y = (father.box_.y + mother.box_.y + heights[gen + 1]
                  - heights[gen]) / 2;
             var h = (canvas.colorScheme_ == AbstractPedigree.colorScheme.WHITE) ?
                mother.box_.y + heights[gen + 1] - y : undefined;
             setupIndivBox(indiv, y, h);

          } else if (father || mother) {
             // center on the existing parent
             var p = (father || mother);
             doLayout(p);
             var y = p.box_.y + (heights[gen + 1] - heights[gen]) / 2;
             var h = (canvas.colorScheme_ == AbstractPedigree.colorScheme.WHITE) ?
                 p.box_.y + heights[gen + 1] - y : undefined;
             setupIndivBox(indiv, y, h);

          } else {
             var y = maxY + canvas.vertPadding;
             setupIndivBox(indiv, y, heights[gen]);
          }
          maxY = Math.max(maxY, y + indiv.box_.h);
       }
       doLayout(d.sosa[1]);
       break;
    }

    // For children, the COMPACT and EXPANDED modes are the same since we can't
    // know the theoritical number of children.

    function doLayoutChildren(indiv) {
       var gen = Math.abs(indiv.generation);

       if (gen < canvas.descendant_gens) {
          var nextGen = indiv.children || [];
       } else {
          nextGen = [];
       }

       if (nextGen.length == 0) {
          var y = maxChildY + canvas.vertPadding;
          setupIndivBox(indiv, y, heights[gen]);
       } else {
          var first = undefined;
          var last = undefined;
          for (var n = 0 ; n < nextGen.length; n++) {
             if (nextGen[n]) {
                doLayoutChildren(nextGen[n]);
                if (first === undefined) {
                   first = n;
                }
                last = n;
             }
          }
          // Center the box on the next gen's boxes
          var y = (nextGen[first].box_.y +
                   nextGen[last].box_.y + nextGen[last].box_.h -
                   heights[gen]) / 2;

          // In some modes, we leave as much height as possible to the box
          var h = (canvas.colorScheme_ == AbstractPedigree.colorScheme.WHITE) ?
             nextGen[last].box_.y + nextGen[last].box_.h - y : undefined;
          setupIndivBox(indiv, y, h);
       }
       maxChildY = Math.max(maxChildY, y + indiv.box_.h);
       minX = Math.min(minX, indiv.box_.x);
    }

    // We'll need to adjust the offsets so that the coordinates of decujus
    // computed after parent and children layouts match
    var yAfterParent = d.sosa[1].box_.y;
    var maxChildY = 0;
    doLayoutChildren(d.sosa[1]);

    // Apply the offset (to the children, since in general we will have more
    // ancestors displayed). At this point, we know the parents extend from
    // minY..maxY, so we adjust minY and maxY as needed
    var offset = yAfterParent - d.sosa[1].box_.y;
    function doOffsetChildren(indiv) {
       indiv.box_.y += offset;
       minY = Math.min(minY, indiv.box_.y);
       maxY = Math.max(maxY, indiv.box_.y + indiv.box_.h);
       if (Math.abs(indiv.generation) < canvas.descendant_gens) {
          var children = indiv.children || [];
          for (var n = 0; n < children.length; n++) {
             if (children[n]) {
                doOffsetChildren(children[n]);
             }
          }
       }
    }
    doOffsetChildren(d.sosa[1]);

    this.box_ = {width: left[this.gens + 1] - minX, height: maxY - minY,
                 x: minX, y: minY};
};

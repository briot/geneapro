/**
 * Decorates a <canvas> element to show a pedigree view
 * @param {Element} canvas   The DOM element to decorate.
 * @param {} data   Sent by the server.
 * @extends {Canvas}
 */

function PedigreeCanvas(canvas, data) {
    AbstractPedigree.call(this, canvas /* elem */, data /* data */);
    this.lineHeight = $.detectFontSize(this.baseFontSize, this.fontName);
    this.setSameSize(false, true /* norefresh */);
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
 * @enum {number}
 */
PedigreeCanvas.layoutScheme = {
   EXPANDED: 0,
   COMPACT: 1
};
PedigreeCanvas.prototype.layoutScheme_ = PedigreeCanvas.layoutScheme.COMPACT;

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

    if (!norefresh) {
        this.refresh();
    }
};

/**
 * Return the id of the selected persona
 */

PedigreeCanvas.prototype.getSelected = function(e) {
    var off = this.canvas.offset();
    var mx = this.toAbsX(e.pageX - off.left);
    var my = this.toAbsY(e.pageY - off.top);
    var selected = null;

    this.forEachBox(
        undefined /* box */,
        function(indiv) {
           var x = indiv.box_.x;
           var y = indiv.box_.y;
           var w = indiv.box_.w;
           var h = indiv.box_.h;
            if (x <= mx && mx <= x + w && y <= my && my <= y + h) {
                selected = indiv;
                return true;
            }
        });
    return selected;
};

/**
 * @param {{x,y,w,h:number}=}  box
 *    Area to refresh (all of them if undefined).
 * @param {function(indiv)} callback
 *    'this' is the same as the caller of forEachBox.
 *    Called for each person within the box.
 *    Boxes are returned in no particular order.
 */

PedigreeCanvas.prototype.forEachBox = function(box, callback) {
   function isVisible(indiv) {
      return (!box ||
              !(indiv.box_.x + indiv.box_.w < box.x || 
                indiv.box_.x > box.x + box.w ||
                indiv.box_.y + indiv.box_.h < box.y ||
                indiv.box_.y > box.y + box.h));
   }

    var d = this.data.sosa;
    for (var sosa in d) {
       if (isVisible(d[sosa]) && callback.call(this, d[sosa])) {
           return;
       }
    }

    d = this.data.children;
    if (d) {
        for (var c = 0, len = d.length; c < len; c++) {
            if (isVisible(d[c]) && 
                callback.call(this, d[c]))
            {
                break;
            }
        }
    }
};

/** @overrides */

PedigreeCanvas.prototype.onCtrlClick = function(e) {
    var selected = this.getSelected(e);
    if (selected) {
        window.location = "/pedigree/" + selected.id +
            "?gens=" + this.gens;
        return true;
    }
};

/** @overrides */

PedigreeCanvas.prototype.onDblClick = function(e) {
    var selected = this.getSelected(e);
    if (selected) {
        window.location = "/persona/" + selected.id;
        return true;
    }
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
    var yForChild = this.linkY_(d.sosa[1]);

    // First draw all lines, as a single path for more efficiency.

    ctx.beginPath();

    this.forEachBox(
        screenBox,
        function(indiv) {
           var x = indiv.box_.x;
           var w = indiv.box_.w;
           var linkY = this.linkY_(indiv);

           if (indiv.sosa <= 0) { // a child
               if (this.colorScheme_ == AbstractPedigree.colorScheme.WHITE) {
                  var x6 = x;
               } else {
                  var x6 = x + w;  //  left end of the link (child side)
               }

               ctx.moveTo(x6, linkY);
               ctx.lineTo((x + w + d.sosa[1].box_.x) / 2, linkY);
               ctx.lineTo((x + w + d.sosa[1].box_.x) / 2, yForChild);

               if (indiv.sosa == 0) {
                   ctx.lineTo(d.sosa[1].box_.x, yForChild);
               }
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

    this.forEachBox(
        screenBox /* box */,
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
   var f = this;  //  closure for callbacks
   AbstractPedigree.prototype.showSettings.call(
         this,
         this.layoutScheme_ == PedigreeCanvas.layoutScheme.EXPANDED ?
             10 : MAXGENS /* maxGens */
         );

   $("#settings input[name=sameSize]")
      .change(function() { f.setSameSize(this.checked) })
      .attr('checked', this.sameSize);
   $("#settings select[name=layout]")
      .change(function() {f.layoutScheme_ = Number(this.value);
                          f.showSettings();
                          f.refresh()})
      .val(this.layoutScheme_);
   $("#settings #hspace")
      .slider({"min": 0, "max": 40,
               "value": this.horizPadding,
               "change": function() {f.horizPadding = $(this).slider("value");
                                     f.__layout = undefined;
                                     f.refresh()}});
   $("#settings #vspace")
      .slider({"min": 0, "max": 20,
               "value": this.vertPadding,
               "change": function() {f.vertPadding = $(this).slider("value");
                                     f.__layout = undefined;
                                     f.refresh()}});

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

    if (this.__gens == this.gens
        && this.__layout == this.layoutScheme_
        && this.__colors == this.colorScheme_
        && this.__ratio == this.ratio)
    {
        return; // nothing to do
    }
    this.__gens = this.gens;
    this.__ratio = this.ratio;
    this.__layout = this.layoutScheme_;
    this.__colors = this.colorScheme_;

    // Store display info for a person
    function setupIndivBox(indiv, y, h) {
       if (indiv) {
          indiv.box_ = {
             x: left[indiv.generation],
             y: y,
             w: widths[indiv.generation],
             h: h || heights[indiv.generation],
             fontSize: fs[indiv.generation],
             parentsMarriageX: left[indiv.generation + 1],
             parentsMarriageFontSize: fs[indiv.generation + 1]};
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

    // Compute x coordinates for each generation
    left[-1] = 0;
    left[0] = d.children ? this.boxWidth + this.horizPadding + 10 : 0;
    heights[0] = heights[-1] = this.boxHeight;
    fs[0] = fs[-1] = this.lineHeight * this.ratio;
    widths[0] = widths[-1] = this.boxWidth;

    var padding = this.horizPadding;
    for (var gen = 1; gen <= this.gens + 1; gen++) {
       if (gen <= this.maxGenForRatio) {
          left[gen] = left[gen - 1] + widths[gen - 1] + padding;
          heights[gen] = heights[gen - 1] * this.ratio;
          widths[gen] = widths[gen - 1] * this.wratio;
          fs[gen] = Math.round(Math.min(this.maxFontSize, fs[gen - 1] * this.ratio));
          if (gen < this.maxGenForRatio) {
             padding = padding * this.wratio;
          }
       } else {
          heights[gen] = heights[gen - 1];
          widths[gen] = widths[gen - 1];
          fs[gen] = fs[gen - 1];
          left[gen] = left[gen - 1] + widths[gen - 1] + padding;
       }
    }

    var maxY = 0;
    var canvas = this;

    switch(this.layoutScheme_) {

    case PedigreeCanvas.layoutScheme.EXPANDED:
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

    case PedigreeCanvas.layoutScheme.COMPACT:
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
             var y = (p.box_.y + heights[gen + 1] - heights[gen]) / 2;
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

    // Position children
    var childHeight = (this.vertPadding + this.boxHeight);
    var childrenHeight = d.children.length * childHeight - this.vertPadding;
    var minY = 0;
    y = d.sosa[1].box_.y + this.boxHeight / 2 - childrenHeight / 2;
    for (var c = 0, len = d.children.length; c < len; c++) {
       setupIndivBox(d.children[c], y);
       minY = Math.min(minY, y);
       maxY = Math.max(maxY, y + d.children[c].box_.h);
       y += childHeight;
    }
 
    this.box_ = {width: left[this.gens + 1], height: maxY - minY, x: 0, y: minY};
};

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
 * Size ratio from generation n to n + 1
 */
PedigreeCanvas.prototype.ratio;
PedigreeCanvas.prototype.wratio;

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
    } else {
        this.boxWidth = 300;
        this.horizPadding = 20;
        this.boxHeight = 40;
        this.ratio = 0.75;
        this.wratio = 0.75;
        this.maxFontSize = 20;
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
 */

PedigreeCanvas.prototype.forEachBox = function(box, callback) {
   function isVisible(indiv) {
      return (!box ||
              !(indiv.box_.x + indiv.box_.w < box.x || 
                indiv.box_.x > box.x + box.w ||
                indiv.box_.y + indiv.box_.h < box.y ||
                indiv.box_.y > box.y + box.h));
   }

    var d = this.data;
    for (var sosa = Math.pow(2, d.generations + 1) - 1; sosa >= 1; sosa--) {
       if (d.sosa[sosa] &&
           isVisible(d.sosa[sosa]) &&
           callback.call(this, d.sosa[sosa]))
       {
           return;
       }
    }

    if (d.children) {
        for (var c = 0, len = d.children.length; c < len; c++) {
            if (isVisible(d.children[c]) && 
                callback.call(this, d.children[c]))
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
            "?gens=" + this.data.generations;
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
           else if (indiv.generation < d.generations) {
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
   AbstractPedigree.prototype.showSettings.call(this);

   $("#settings input[name=sameSize]")
      .change(function() { f.setSameSize(this.checked) })
      .attr('checked', this.sameSize);
   $("#settings select[name=layout]")
      .change(function() {f.layoutScheme_ = Number(this.value); f.refresh()})
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

    if (this.__gens == d.generations
        && this.__layout == this.layoutScheme_
        && this.__colors == this.colorScheme_
        && this.__ratio == this.ratio)
    {
        return; // nothing to do
    }
    this.__gens = d.generations;
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

    for (var gen = 1; gen <= d.generations + 1; gen++) {
       left[gen] = left[gen - 1] +
          (this.boxWidth + this.horizPadding) * Math.pow(this.wratio, gen - 1);
       heights[gen] = heights[gen - 1] * this.ratio;
       widths[gen] = widths[gen - 1] * this.wratio;
       fs[gen] = Math.round(Math.min(this.maxFontSize, fs[gen - 1] * this.ratio));
    }

    switch(this.layoutScheme_) {

    case PedigreeCanvas.layoutScheme.EXPANDED:
       var tops = []; //  Pixel coordinates, indexed on sosa
       var gen = d.generations;
       var threshold = Math.pow(2, gen) - 1;
       for (var sosa = Math.pow(2, gen + 1) - 1; sosa >= 1; sosa--) {
          if (sosa == threshold) {
             gen --;
             threshold = Math.pow(2, gen) - 1;
          }
          if (gen == d.generations) {
             tops[sosa] = (heights[gen] + this.vertPadding) * (sosa - threshold);
          } else {
             tops[sosa] = (tops[2 * sosa] + tops[2 * sosa + 1] +
                  heights[gen + 1] - heights[gen]) / 2;
          }
          setupIndivBox(d.sosa[sosa], tops[sosa]);
       }
       break;

    case PedigreeCanvas.layoutScheme.COMPACT:
       // For the last generation, place each boxes as close as possible.
       // Then when we add the previous generation, we might move some of
       // the boxes from the previous generation downward to make space for
       // persons with no ancestors.

       var y = 0;
       var gen = d.generations;
       var threshold = Math.pow(2, gen) - 1;
       var groupMinY = []  // min Y for a sosa and all its ancestors
       var prevSosa = 0;   // sosa of last displayed indiv for current gen
       var maxYPrevGen = 0;  // maximal value for Y at the previous gen.
       var maxYCurrentGen = 0;  //  maximal Y at current gen

       for (var sosa = Math.pow(2, gen + 1) - 1; sosa >= 1; sosa--) {
          if (sosa == threshold) {
             gen --;
             threshold = Math.pow(2, gen) - 1;
             prevSosa = 0;
             maxYPrevGen = maxYCurrentGen;
             maxYCurrentGen = 0;
          }
          var indiv = d.sosa[sosa];
          if (indiv) {
             if (gen == d.generations) {
                setupIndivBox(indiv, y);
                groupMinY[sosa] = y
                y -= (heights[gen] + this.vertPadding);
             } else {
                var father = d.sosa[2 * sosa];
                var mother = d.sosa[2 * sosa + 1];

                if (father && mother) {
                   // center the box on its parents
                   var y = (father.box_.y + mother.box_.y + heights[gen + 1]
                       - heights[gen]) / 2;
                   if (this.colorScheme_ == AbstractPedigree.colorScheme.WHITE) {
                      var h = mother.box_.y + heights[gen + 1] - y;
                   } else {
                      h = undefined;
                   }
                   groupMinY[sosa] = Math.min(y, groupMinY[father.sosa]);
                   setupIndivBox(indiv, y, h);

                } else if (father || mother) {
                   // center on the existing parent
                   var p = (father || mother);
                   var y = (p.box_.y + heights[gen + 1] - heights[gen]) / 2;
                   if (this.colorScheme_ == AbstractPedigree.colorScheme.WHITE) {
                      var h = p.box_.y + heights[gen + 1] - y;
                   } else {
                      h = undefined;
                   }
                   groupMinY[sosa] = Math.min(y, groupMinY[p.sosa]);
                   setupIndivBox(indiv, y, h);

                } else {
                   // No parent, put this box close to the previous box at the
                   // same level, moving ancestors as needed.

                   if (prevSosa == 0) {
                      var y = maxYPrevGen;
                   } else {
                      var y = groupMinY[prevSosa] -
                         this.vertPadding - heights[gen];
                   }

                   groupMinY[sosa] = y;   //  a new group
                   setupIndivBox(indiv, y);

                   // Move up all ancestors of remaining persons in this gen
                   for (var sosa2 = sosa - 1; sosa2 > threshold; sosa2--) {
                      moveAncestors(sosa2, -this.vertPadding - heights[gen]); 
                   }

                }
             }
             maxYCurrentGen = Math.max(maxYPrevGen, indiv.box_.y + heights[gen]);
             prevSosa = sosa;
          }
       }
       break;
    }

    // Recompute the bounding box, since ancestors have been moved
    var minY = d.sosa[1].box_.y;
    var maxY = minY;
    for (var sosa = Math.pow(2, d.generations + 1) - 1; sosa >= 1; sosa--) {
       if (d.sosa[sosa]) {
          minY = Math.min(minY, d.sosa[sosa].box_.y);
          maxY = Math.max(maxY, d.sosa[sosa].box_.y + d.sosa[sosa].box_.h);
       }
    }

    // Position children
    var childHeight = (this.vertPadding + this.boxHeight);
    var childrenHeight = d.children.length * childHeight - this.vertPadding;
    y = d.sosa[1].box_.y + this.boxHeight / 2 - childrenHeight / 2;
    for (var c = 0, len = d.children.length; c < len; c++) {
       setupIndivBox(d.children[c], y);
       minY = Math.min(minY, y);
       maxY = Math.max(maxY, y + d.children[c].box_.h);
       y += childHeight;
    }
 
    this.box_ = {width: left[d.generations + 1], height: maxY - minY, x: 0, y: minY};
};

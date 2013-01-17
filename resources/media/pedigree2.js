/** Maximum number of generations that can be displayed */
var MAXGENS = 13;

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

/** for each box, calls 'callback' (indiv).
 * 'this' is preserved when calling callback.
 */

PedigreeCanvas.prototype.forEachBox = function(callback) {
    var d = this.data;
    for (var sosa = Math.pow(2, d.generations + 1) - 1; sosa >= 1; sosa--) {
       if (d.sosa[sosa] && callback.call(this, d.sosa[sosa])) {
           return;
       }
    }

    if (d.children) {
        for (var c = 0, len = d.children.length; c < len; c++) {
            if (callback.call(this, d.children[c])) {
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

/** @overrides */

PedigreeCanvas.prototype.onDraw = function(e, screenBox) {
    var ctx = this.ctx;
    var d = this.data;
    var yForChild = d.sosa[1].box_.y + d.sosa[1].box_.h / 2;

    // First draw all lines, as a single path for more efficiency.

    ctx.beginPath();

    this.forEachBox(
        function(indiv) {
           var x = indiv.box_.x;
           var y = indiv.box_.y;
           var w = indiv.box_.w;
           var h = indiv.box_.h;

            if (indiv.sosa <= 0) { // a child
                ctx.moveTo(x + w, y + h / 2);
                ctx.lineTo((x + w + d.sosa[1].box_.x) / 2, y + h / 2);
                ctx.lineTo((x + w + d.sosa[1].box_.x) / 2, yForChild);

                if (indiv.sosa == 0) {
                    ctx.lineTo(d.sosa[1].box_.x, yForChild);
                }
            }
            else if (indiv.generation < d.generations) {
                var father = d.sosa[2 * indiv.sosa];
                var mother = d.sosa[2 * indiv.sosa + 1];
                if (father || mother) {
                    var x2 = (father || mother).box_.x;
                    // x2=left edge of parent gen
                    var x3 = x + w;  // right edge for current gen
                    var y2 = y + h / 2; // middle of current box
                    var x4 = (x2 + x3) / 2; // half way between two boxes

                    ctx.moveTo(x3, y2);
                    ctx.lineTo(x4, y2);

                    if (father) {
                        var y1 = father.box_.y + father.box_.h / 2;
                        ctx.lineTo(x4, y1);
                        ctx.lineTo(x2, y1);
                    }

                    if (mother) {
                        var y1 = mother.box_.y + mother.box_.h / 2;
                        ctx.moveTo(x4, y2);
                        ctx.lineTo(x4, y1);
                        ctx.lineTo(x2, y1);
                    }
                }
            }
        });

    ctx.strokeStyle = "black";
    ctx.stroke();

    this.forEachBox(
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
                  indiv.box_.y + indiv.box_.h / 2);
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
};

/** @inheritDoc
 *
 *  Compute display data for all boxes, given the number of generations
 *  to display. This is only recomputed when the number of generations
 *  has changed.
 *  For each person, adds an extra field box_ containing display information:
 *      {x:number, y:number,    // top-left coordinate for the box
 *       w:number, h:number,    // dimensions of the box
 *       fontsize:number,       // size of the font
 *       parentsMarriageX:number,
 *       parentsMarriageFontSize:number,
 *      }
 */

PedigreeCanvas.prototype.computeBoundingBox = function() {
    var d = this.data;

    if (this.__gens == d.generations
        && this.__layout == this.layoutScheme_
        && this.__ratio == this.ratio)
    {
        return; // nothing to do
    }
    this.__gens = d.generations;
    this.__ratio = this.ratio;
    this.__layout = this.layoutScheme_;

    // Store display info for a person
    function setupIndivBox(indiv, y) {
       if (indiv) {
          indiv.box_ = {
             x: left[indiv.generation],
             y: y,
             w: widths[indiv.generation],
             h: heights[indiv.generation],
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
                   var y = (father.box_.y + mother.box_.y + mother.box_.h
                       - heights[gen]) / 2;
                   groupMinY[sosa] = Math.min(y, groupMinY[father.sosa]);
                   setupIndivBox(indiv, y);

                } else if (father || mother) {
                   // center on the existing parent
                   var p = (father || mother);
                   var y = (p.box_.y + p.box_.h - heights[gen]) / 2;
                   groupMinY[sosa] = Math.min(y, groupMinY[p.sosa]);
                   setupIndivBox(indiv, y);

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
                      moveAncestors(sosa2, -this.vertPadding - indiv.box_.h); 
                   }

                }
             }
             maxYCurrentGen = Math.max(maxYPrevGen, indiv.box_.y + indiv.box_.h);
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

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
    var mx = e.pageX - off.left;
    var my = e.pageY - off.top;
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
    for (var sosa = Math.pow(2, d.generations) - 1; sosa >= 1; sosa--) {
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
            else if (indiv.generation < d.generations - 1) {
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
 *
 *  Sets 'canvas.__gens'.
 *
 *  Start with the last generation first: the height of boxes depends on the
 *  generation number. Depending on this height, we compute how much
 *  information should be displayed in the boxes. We display at most five
 *  lines of info (name, birth date and place, death date and place), so
 *  we round up as needed. And we want at least 1 pixel displayed.
 *  We then compute the scaling to display that many lines. For instance,
 *  if we wanted to display only one line (the minimum), say 10px, but only
 *  have 1px max, the scaling is 1/10. This scaling will also be applied to
 *  the width of the box. We do not compute the scaling based on the
 *  maximum number of lines (5), since otherwise the box would become too
 *  narrow, and the text unreadable even for early generations.
 *  The padding between the boxes is only dependent on the generation.
 */

PedigreeCanvas.prototype.computeBoundingBox = function() {
    var d = this.data;

    if (this.__gens == d.generations
        && this.__ratio == this.ratio)
    {
        return; // nothing to do
    }

    this.__gens = d.generations;
    this.__ratio = this.ratio;

    var lastgen = d.generations - 1;
    var maxBoxes = Math.pow(2, d.generations-1);// max boxes at last generation
    var totalBoxes = Math.pow  (2, d.generations) - 1; // geometrical summation
    var genscale = Math.pow(this.ratio, lastgen);
    var tops = new Array(totalBoxes); //  Pixel coordinates, indexed on sosa
    var left = new Array(lastgen + 1);    //  left coordinate for each generation
    var maxY = 0;
    var minY = 0;

    // Compute x coordinates for each generation
    left[0] = d.children ? this.boxWidth + this.horizPadding + 10 : 0;
    for (var gen = 1; gen <= lastgen + 1; gen++) {
       left[gen] = left[gen - 1] +
          (this.boxWidth + this.horizPadding) * Math.pow(this.wratio, gen - 1);
    }

    // Start at last generation

    var y = 0;
    var h = this.boxHeight * genscale;
    for (var index = totalBoxes; index >= totalBoxes - maxBoxes + 1; index--) {
       tops[index] = y;
       if (d.sosa[index]) {
           d.sosa[index].box_ = {x: left[lastgen],
                                 y: y,
                                 w: left[lastgen + 1] - left[lastgen],
                                 h: h,
                                 fontSize: this.lineHeight * genscale,
                                 parentsMarriageX: undefined,
                                 parentsMarriageFontSize: undefined};
           minY = Math.min(minY, y);
           maxY = Math.max(maxY, y + h);
       }
       y += h + this.vertPadding;
    }

    var prevHeight = this.boxHeight * genscale;

    for (var gen = lastgen - 1; gen >= 0; gen --) {
        var baseRatio = Math.pow(this.ratio, gen);
        var w = this.boxWidth * Math.pow(this.wratio, gen);
        var height = this.boxHeight * baseRatio;

        var firstSosa = Math.pow(2, gen);
        for (; index >= firstSosa; index--) {
          tops[index] = (tops[2 * index] + tops[2 * index + 1]
               + prevHeight - height) / 2;
          if (d.sosa[index]) {
              d.sosa[index].box_ = {
                 x: left[gen],
                 y: tops[index],
                 w: w,
                 h: height,
                 fontSize: this.lineHeight * baseRatio,
                 parentsMarriageX: left[gen + 1],
                 parentsMarriageFontSize: Math.round(Math.min(
                          this.maxFontSize, height * baseRatio))};
          }
        }
        prevHeight = height;
    }

    // Position children boxes
    var childHeight = (20 + this.boxHeight);
    var childrenHeight = d.children.length * childHeight - 20;
    y = d.sosa[1].box_.y + this.boxHeight / 2 - childrenHeight / 2;
    for (var c = 0, len = d.children.length; c < len; c++) {
       d.children[c].box_ = {x: 0,
                             y: y,
                             w: this.boxWidth,
                             h: this.boxHeight,
                             fontSize: this.lineHeight,
                             parentsMarriageX: left[0],
                             parentsMarriageFontSize: undefined};
       y += childHeight;
    }
 
    // Autoscaling will not work, since the above computation already depends
    // on the current scale anyway.
    this.box_ = {width: left[lastgen + 1],
                 height: maxY - minY,
                 x: 0,
                 y: minY};
};

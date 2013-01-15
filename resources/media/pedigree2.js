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
 * Whether to draw a box when a person is unknown
 */
PedigreeCanvas.prototype.showUnknown = false;

/**
 * Padding on the side of each boxes.
 * This is set automatically when calling setSameSize.
 */
PedigreeCanvas.prototype.horizPadding;
PedigreeCanvas.prototype.vertPadding;

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
        this.vertPadding = 2;
        this.horizPadding = 20;
        this.maxFontSize = 15;
    } else {
        this.boxWidth = 300;
        this.horizPadding = 20;
        this.boxHeight = 40;
        this.vertPadding = 2;
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
        function(indiv, x, y, w, h) {
            if (x <= mx && mx <= x + w && y <= my && my <= y + h) {
                selected = indiv;
                return true;
            }
        });
    return selected;
};

/** for each box, calls 'callback' (indiv, x, y, w, h).
 * 'this' is preserved when calling callback.
 *
 * 'box' can be specified and indicates the pixels coordinates of the
 * region we want to traverse (default is all canvas).
 * Traversing stops when 'callback' returns true.
 */

PedigreeCanvas.prototype.forEachBox = function(callback, box) {
    var tops = this.tops;
    var d = this.data;
    var baseY = this.toPixelY(0);
    var startX = this.toPixelX(
        d.children ? this.boxWidth + this.horizPadding + 10 : 0);
    var index = 0;
    var x = startX;

    if (!this.boxheights) {
        return;
    }

    for (var gen = 0; gen < d.generations; gen++) {
        var w = this.boxWidth * this.boxheights[gen][2];
        var h = this.boxheights[gen][0];
        var x2 = x + w + this.horizPadding * this.boxheights[gen][2];

        if (box && (x > box.x + box.w || x + w < box.x)) { // clipping generation
            index += Math.pow(2, gen);

        } else {
            for (var b = Math.pow(2, gen); b >= 1; b--) {
                var sosa = index + 1;
                var ti = tops[index] + baseY;

                if (!box || (ti < box.y + box.h && ti + h > box.y)) { // clipping
                   if (callback.call(this, d.sosa[sosa], x, ti, w, h)) {
                      gen = 99999;
                      break;
                   }
                }
                index ++;
            }
        }

        x = x2;
    }

    if (gen != 99999 && d.children) {
        var space = 20 * this.scale;
        var childHeight = this.scale * (space + this.boxHeight);
        var halfHeight = this.scale * this.boxHeight / 2;
        var childrenHeight = d.children.length * childHeight - space;
        var x = this.toPixelX(0);
        var y = baseY + tops[0] + halfHeight - childrenHeight / 2;

        for (var c = 0, len = d.children.length; c < len; c++) {
            if (callback.call(
                this, d.children[c], x, y,
                this.boxWidth * this.scale, 2 * halfHeight))
            {
                break;
            }
            y += childHeight;
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
    var tops = this.tops;
    var mariageHeight = this.mariageHeight;
    var d = this.data;
    var startX = this.toPixelX(
        d.children ? this.boxWidth + this.horizPadding + 10 : 0);
    var baseY = this.toPixelY(0);
    var boxes = [];
    var text = [];
    var halfHeight = this.scale * this.boxHeight / 2;
    var yForChild = baseY + tops[0] + halfHeight;
    var seenChild = false;

    // First draw all lines, as a single path for more efficiency.
    // Compute the list of boxes at the same time, so that we can display
    // them afterward without recomputation

    ctx.beginPath();
    ctx.strokeStyle = "black";

    this.forEachBox(
        function(indiv, x, y, w, h) {
            if (indiv.sosa <= 0) { // a child
                ctx.moveTo (x + w, y + h / 2);
                ctx.lineTo ((x + w + startX) / 2, y + h / 2);
                ctx.lineTo ((x + w + startX) / 2, yForChild);

                if (!seenChild) {
                    seenChild = true;
                    ctx.lineTo (startX, yForChild);
                }
                indiv.generation = 0;
            }
            else if (indiv.generation < d.generations - 1) {
                if (this.showUnknown ||
                    d.sosa[2 * indiv.sosa] || d.sosa[2 * indiv.sosa + 1])
                {
                    var x2 = x + w + this.horizPadding * this.boxheights[indiv.generation][2];
                    // x2=left edge of parent gen
                    var x3 = x + w;  // right edge for current gen
                    var y2 = y + h / 2; // middle of current box
                    var x4 = (x2 + x3) / 2; // half way between two boxes

                    // At least one of the parents ?
                    ctx.moveTo(x3, y2);
                    ctx.lineTo(x4, y2);

                    if (this.showUnknown || d.sosa[2 * indiv.sosa]) {
                        var y1 = baseY + tops[2 * indiv.sosa - 1]
                            + this.boxheights[indiv.generation + 1][0] / 2;
                        ctx.lineTo(x4, y1);
                        ctx.lineTo(x2, y1);
                    }

                    if (this.showUnknown || d.sosa[2 * indiv.sosa + 1]) {
                        var y1 = baseY + tops[2 * indiv.sosa]
                            + this.boxheights[indiv.generation+1][0] / 2;
                        ctx.moveTo(x4, y2);
                        ctx.lineTo(x4, y1);
                        ctx.lineTo(x2, y1);
                    }

                    if (mariageHeight[indiv.generation] > this.minFontSize
                        && indiv.generation < d.generations - 1
                        && d.marriage[2 * indiv.sosa])
                    {
                        var mar = event_to_string(d.marriage[2 * indiv.sosa]);
                        text.push([mariageHeight[indiv.generation], x2 + 3, y + h /2, mar]);
                    }
                }
            }
            boxes.push([indiv, x, y, w, h]);
        });

    ctx.stroke();

    ctx.textBaseline = 'top';
    for (var b=boxes.length - 1; b >= 0; b--) {
        var bo = boxes[b];
        if (this.showUnknown || bo[0]) {
           this.drawPersonBox(
               bo[0] /* person */,
               bo[1] /* x */,
               bo[2] /* y */,
               bo[3] /* width */,
               bo[4] /* height */,
               this.lineHeights[bo[0].generation] /* fontsize */);
        }
    }

    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = "black";
    var prev=0;
    for (var t=text.length - 1; t >= 0; t--) {
        var te = text[t];
        if (te[0] != prev) {
            prev = te[0];
            ctx.font = Math.round(Math.min(this.maxFontSize, te[0]))
                + "px " + this.fontName;
        }
        ctx.fillText(te[3], te[1], te[2]);
    }
    ctx.restore();
};

/** @inheritDoc */

PedigreeCanvas.prototype.showSettings = function() {
   var f = this;  //  closure for callbacks
   AbstractPedigree.prototype.showSettings.call(this);

   $("#settings input[name=sameSize]")
      .change(function() { f.setSameSize(this.checked) })
      .attr('checked', this.sameSize);
   $("#settings input[name=showUnknown]")
      .change(function() { f.showUnknown = this.checked; f.refresh()})
      .attr('checked', this.showUnknown);
};

/** @inheritDoc
 *
 *  Compute display data for all boxes, given the number of generations
 * to display. This is only recomputed when the number of generations
 *  has changed.
 *  Sets 'canvas.boxheights', 'canvas.tops' and 'canvas.__gens'.
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
        && this.__scale == this.scale
        && this.__ratio == this.ratio)
    {
        return; // nothing to do
    }

    this.boxheights = new Array(d.generations); //[height, lines, wscale]
    this.tops = new Array(totalBoxes); //  Pixel coordinates
    this.mariageHeight = new Array(d.generations);
    this.lineHeights = new Array(d.generations); // font size at each gen
    this.__gens = d.generations;
    this.__scale = this.scale;
    this.__ratio = this.ratio;

    var lastgen = d.generations - 1;
    var maxBoxes = Math.pow(2, d.generations-1);// max boxes at last generation
    var totalBoxes = Math.pow  (2, d.generations) - 1; // geometrical summation
    var genscale = Math.pow(this.ratio, lastgen);
    var wscale   = Math.pow(this.wratio, lastgen) * this.scale;
    var spacing  = (this.boxHeight + this.vertPadding) * genscale; // at scale 1.0

    this.boxheights[lastgen] =
        [this.boxHeight * genscale * this.scale, 1, wscale];
    this.mariageHeight[lastgen] = 0;  // Can't display marriage for last

    // Compute spacing between boxes at the last generation. We try to make the
    // tree nicer by using the whole canvas height, at least (in particular
    // useful when displaying few generations.

    var canvas_height = this.canvas[0].height;
    var margin = 30;
    if ((totalBoxes - maxBoxes) * spacing < canvas_height - margin) {
        spacing = (canvas_height - margin) / (totalBoxes - maxBoxes);
    }

    // Start at last generation

    var y = 0;
    spacing = spacing * this.scale;  //  at current scale, for last generation
    for (var index = totalBoxes - maxBoxes; index < totalBoxes; index++) {
        this.tops[index] = y;
        y += spacing;
    }

    this.lineHeights[lastgen] = this.lineHeight * genscale;

    index = totalBoxes - maxBoxes - 1;

    for (var gen = lastgen - 1; gen >= 0; gen --) {
        var baseRatio = Math.pow(this.ratio, gen);
        genscale  = baseRatio * this.scale;
        wscale   = Math.pow(this.wratio, gen) * this.scale;
        var height = this.boxHeight * genscale;

        this.boxheights[gen] = [height, 1, wscale];
        this.mariageHeight[gen] = height * genscale;
        this.lineHeights[gen] = this.lineHeight * baseRatio;

        //  Compute positions for boxes in this generation
        var lastIndex = index - Math.pow (2, gen);
        for (; index > lastIndex; index--) {
            this.tops[index] = (
                this.tops [2*index+1]
                    + this.tops[2*index + 2] + this.boxheights[gen+1][0]
                    - height) / 2;
        }
    }

    // Autoscaling will not work, since the above computation already depends
    // on the current scale anyway.
    this.box_ = {width: 0,
                 height: 0,
                 x: 0,
                 y: 0};
};

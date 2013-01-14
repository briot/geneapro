
var PI_HALF = Math.PI / 2;
var PI_TWO  = Math.PI * 2;

/**
 * @param {Element} canvas  A DOM element that contains the canvas.
 * @param {} data           The data returned by the server.
 */

function FanchartCanvas(canvas, data) {
    Canvas.call(this, canvas /* elem */);

    this.data = data;
    this.lineHeight = $.detectFontSize(this.baseFontSize, this.fontName);
    this.decujusx = this.boxWidth + this.horizPadding;
    this.decujusy = 0;  // computes later

    this.setTotalAngle(340);
    this.setShowMarriage(true);
    this.showSettings();
}
inherits(FanchartCanvas, Canvas);

/**
 * @enum {number}
 */

FanchartCanvas.colorScheme = {
   RULES: 0,
   //  color of a person's box is computed on the server, depending on the
   //  highlighting rules defined by the user
   
   PEDIGREE: 1
   //  The color of a person's box depends on its location in the pedigree
};

/** Color scheme to apply to boxes
 * @type {FanchartCanvas.colorScheme}
 * @private
 */

FanchartCanvas.prototype.colorScheme_ = FanchartCanvas.colorScheme.PEDIGREE;

/**
 * Describes how the boxes are displayed.
 * @enum {number}
 */

FanchartCanvas.appearance = {
   FLAT: 0,
   GRADIENT: 1
};

/** @private */
FanchartCanvas.prototype.appearance_ = FanchartCanvas.appearance.GRADIENT;

/** Height of a generation in the fanchart
 * @type {number}
 */

FanchartCanvas.prototype.rowHeight = 60;

/** Generation number after which the text is rotated 90 degrees to
 * make it more readable
 */
FanchartCanvas.prototype.genThreshold = 4;

/* Extra blank spaces between layers rings. This is used to display
   marriage information (if 0, no marriage info is displayed) */
DEFAULT_SEP_BETWEEN_GENS = 20;
FanchartCanvas.prototype.sepBetweenGens = DEFAULT_SEP_BETWEEN_GENS;

/* row height for generations >= genThreshold */
FanchartCanvas.prototype.rowHeightAfterThreshold = 100;

/* Height of the inner (white) circle. This height is substracted from
   rowHeight for the parent's row */
FanchartCanvas.prototype.innerCircle = 10;

/* Start and End angles, in radians, for the pedigree view.
 * This is clockwise, starting from the usual 0 angle!
 */
FanchartCanvas.prototype.minAngle;
FanchartCanvas.prototype.maxAngle;

/* Separator (in radians) between couples. Setting this to 0.5 or more will
   visually separate the couples at each generation, possibly making the
   fanchart more readable for some users */
FanchartCanvas.prototype.separator = 0.0 * Math.PI / 180.0;

/* If true, the names on the lower half of the circle are displayed
   so as to be readable. Otherwise they are up-side down */
FanchartCanvas.prototype.readable_names = true;

/* Generation at which we stop displaying names */
FanchartCanvas.prototype.textThreshold = 10;

/* Width of boxes for children */
FanchartCanvas.prototype.boxWidth = 200;
FanchartCanvas.prototype.boxHeight = 60;

/* Horizontal padding between the children and the decujus */
FanchartCanvas.prototype.horizPadding = 30;
FanchartCanvas.prototype.vertPadding = 20;

/* Animation delay (moving selected box to decujus' position */
FanchartCanvas.prototype.delay = 200;

/** @inheritDoc */

FanchartCanvas.prototype.onClick = function(e) {
/*
    var box = evt.target;
    var d = this.data;
    if (box.getAttribute("sosa") != 1) {
        var num = box.getAttribute("sosa");
        var id = (num < 0) ? d.children[-1 - num].id : d.sosa[num].id;
        var targetX = this.decujusx + this.canvas.offset().left;
        var targetY = this.decujusy + this.canvas.offset().top;
        var transform = "translate(";
        transform += (targetX - evt.pageX) + ",";
        transform += (targetY - evt.pageY) + ")";
        $(box).animate({'svg-transform':transform}, config.delay);
        $(box).animate({'svg-opacity':0}, config.delay);
        setTimeout (function() {
            window.location = "/fanchart/" + id + "?gens=" + data.generations},
                    config.delay);
    }
*/
};

/** @overrides */

FanchartCanvas.prototype.onDraw = function(evt, screenBox) {
    var d = this.data;
    var childrenHeight = d.children
        ? d.children.length * (this.boxHeight + this.vertPadding)
        : 0;
    var dimensions = this.chartDimensions();
    var maxHeight = Math.max(childrenHeight, dimensions.height);
    var maxWidth = this.boxWidth + this.horizPadding + dimensions.width;
    var centerx = this.decujusx + dimensions.centerX;
    var centery = dimensions.centerY;

    this.decujusy = centery - 5;

    this.drawPersonBox(
        d.sosa[1] /* person */,
        this.decujusx /* x */,
        this.decujusy - this.boxHeight / 2 /* y */,
        this.boxWidth /* width */,
        this.boxHeight /* height */,
        this.baseFontSize /* fontsize */);

    if (d.children) {
        var y = (maxHeight - childrenHeight) / 2;
        for (var c = 0; c < d.children.length; c++) {
            this.drawPersonBox(
                d.children[c] /* person */,
                1 /* x */,
                y /* y */,
                this.boxWidth /* width */,
                this.boxHeight /* height */,
                this.baseFontSize /* fontsize */);
            y += this.boxHeight + this.vertPadding;
        }
    }

    this.drawFan_(centerx, centery);
};

/** @inheritDoc */

FanchartCanvas.prototype.getStyle_ = function(
      person, gen, angle, minRadius, maxRadius)
{
   if (this.colorScheme_ == FanchartCanvas.colorScheme.RULES) {
      var st = this.data.styles[person.y];
      st.stroke = 'gray';

   } else if (this.colorScheme_ == FanchartCanvas.colorScheme.PEDIGREE) {
      //  Avoid overly saturated colors when displaying only few generations
      //  (i.e. when boxes are big)
      var maxGen = Math.max(12, this.data.generations - 1);
      var rgb = this.hsvToRgb(angle * 180 / Math.PI, gen / maxGen, 1.0);
      var c = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";

      if (this.appearance_ == FanchartCanvas.appearance.GRADIENT) {
         var gr = this.ctx.createRadialGradient(0, 0, minRadius,
                                                0, 0, maxRadius);
         gr.addColorStop(0, c);

         rgb = this.hsvToRgb(angle * 180 / Math.PI, gen / maxGen, 0.8);
         var c2 = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
         gr.addColorStop(1, c2);
         var st = {'stroke': 'black', 'fill': gr};
      } else {
         var st = {'stroke': 'black', 'fill': c};
      }
   }
   return st;
};

/**
 * Change the appearance of the fanchart
 *   @type {FanchartCanvas.appearance} appearance   .
 */

FanchartCanvas.prototype.setAppearance = function(appearance) {
   this.appearance_ = appearance;
   this.refresh();
};

/**
 * Change the color scheme for the fanchart
 *   @type {FanchartCanvas.colorScheme}  scheme   The scheme to apply.
 */

FanchartCanvas.prototype.setColorScheme = function(scheme) {
   this.colorScheme_ = scheme;
   this.refresh();
};

/**
 * Canvas needs to be refreshed afterwards
 * @param {Boolean} show  Whether to display marriage information.
 */

FanchartCanvas.prototype.setShowMarriage = function(show) {
   this.sepBetweenGens = (show ? DEFAULT_SEP_BETWEEN_GENS : 0);
   return this;
};

/**
 * Canvas needs to be refreshed afterwards
 * @param {Number} angle  Sets the opening angle (90 to 360 degrees).
 */

FanchartCanvas.prototype.setTotalAngle = function(angle) {
   var half = angle / 2 * Math.PI / 180.0;
   this.minAngle = -half;
   this.maxAngle = half;
   return this;
};

/**
 * Update the settings box (from fanchart.html) to reflect current settings,
 * and so that changing the settings also updates the fanchart.
 */

FanchartCanvas.prototype.showSettings = function() {
   var f = this;
   $("#settings select[name=generations]").val(this.data.generations);
   $("#settings select[name=colors]")
      .val(this.colorScheme_)
      .change(function() { f.setColorScheme(this.value)});
   $("#settings input[name=marriages]")
      .change(function() { f.setShowMarriage(this.checked).refresh() })
      .attr('checked', this.sepBetweenGens != 0);
   $("#settings select[name=appearance]")
      .change(function() { f.setAppearance(this.value)})
      .val(this.appearance_);
   $("#settings select[name=size]")
      .change(function() { f.setTotalAngle(this.value).refresh() })
      .val(Math.round((this.maxAngle - this.minAngle) * 180 / Math.PI));
};

/**
 * Draw the fanchart for the global variables sosa, based on the
 *configuration.
 * This does not draw the decujus or its children
 */

FanchartCanvas.prototype.drawFan_ = function(centerx, centery) {
    var d = this.data;
    var margin = this.separator;
    var ctx = this.ctx;

    function doPath_(minRadius, maxRadius, maxAngle, minAngle) {
        ctx.beginPath();
        ctx.arc(0, 0, maxRadius, maxAngle, minAngle, true);

        if (minRadius != maxRadius) {
            ctx.arc(0, 0, minRadius, minAngle, maxAngle, false);
            ctx.closePath();
        }
    }

    /** Draws a slice of the fanchart, clockwise */
    function createPath(p, minRadius, maxRadius, maxAngle, minAngle, gen) {
        doPath_(minRadius, maxRadius, maxAngle, minAngle);
        if (p) {
            var st = this.getStyle_(
                  p, gen, (minAngle + maxAngle) / 2, minRadius, maxRadius);
            this.drawPath(st);

            if (gen < this.textThreshold) {
                ctx.save();

                // unfortunately we have to recreate the path, at least until the
                // Path object from the canvas API is implemented everywhere.
                doPath_(minRadius, maxRadius, maxAngle, minAngle);
                ctx.clip();

                var a = minAngle + (maxAngle - minAngle) / 2;
                var c = Math.cos(a);
                var s = Math.sin(a);

                // Draw person name along the curve, and clipped. For late
                // generations, we rotate the text since there is not enough
                // horizontal space anyway

                if (gen >= this.genThreshold) {
                    if (this.readable_names && Math.abs(a) >= PI_HALF) {
                        var r = maxRadius - 4;
                        ctx.translate(r * c, r * s);
                        ctx.rotate(a + Math.PI);

                    } else {
                        var r = minRadius + 4;
                        ctx.translate(r * c, r * s);
                        ctx.rotate(a);
                    }

                    this.drawPersonText(
                        person, 0, 0,
                        2 * fontSize /* height */, fontSize /* fontsize */);

                } else {
                    //  ??? Upcoming HTML5 canvas will support text on path

                    if (minAngle < 0 || !this.readable_names) {
                        var r = (minRadius + maxRadius) / 2;
                        ctx.translate(r * c, r * s);
                        ctx.rotate((minAngle + maxAngle) / 2 + Math.PI / 2);
                    } else {
                        var r = minRadius + 2;
                        ctx.translate(r * c, r * s);
                        ctx.rotate((minAngle + maxAngle) / 2 - Math.PI / 2);
                    }

                    this.drawPersonText(
                        person, -60, 0,
                        2 * fontSize/* height */, fontSize /* fontsize */);


                }
                ctx.restore();
            }
        } else {
            //ctx.stroke();
        }
    }

    ctx.save();
    var fontSize = 14;
    ctx.font = fontSize + "px Arial";
    ctx.translate(centerx, centery);

    var rowHeight = this.rowHeight + this.sepBetweenGens;
    var rowHeightAfterThreshold = this.rowHeightAfterThreshold +
       this.sepBetweenGens;

    for (var gen = d.generations - 1; gen >= 1; gen--) {
        if (gen < this.genThreshold) {
            var minRadius = rowHeight * (gen - 1) || this.innerCircle;
            var maxRadius = minRadius + rowHeight;
            if (gen == 1) maxRadius -= this.innerCircle;
        } else {
            var minRadius = rowHeight * (this.genThreshold - 1)
                + (gen - this.genThreshold) * rowHeightAfterThreshold;;
            var maxRadius = minRadius + rowHeightAfterThreshold;
        }

        if (gen <= 7) {
            minRadius += this.sepBetweenGens;
        }

        var minIndex = Math.pow(2, gen); /* first SOSA in that gen, and number
                                            of persons in that gen */
        var angleInc = (this.maxAngle - this.minAngle) / minIndex;
        var medRadius = (minRadius + maxRadius) / 2;

        for (var id = 0; id < minIndex; id++) {
            var num = minIndex + id;
            var person = d.sosa [num];
            var minAngle = this.minAngle + id * angleInc;
            var maxAngle = minAngle + angleInc;

            if (id % 2 == 0)
                maxAngle -= margin;
            else
                minAngle += margin;

            createPath.call(
                this, person, minRadius, maxRadius, maxAngle, minAngle, gen);

            if (person) {
                if (num % 2 == 0 && this.sepBetweenGens > 10
                    && d.marriage[num] && gen <= 7)
                {
                    var mar = event_to_string(d.marriage [num]);
                    var attr = {"stroke": "black"};

                    if (gen == 1) {
                        this.text(-rowHeight, -10, mar, attr);
                    } else {
                        var a = minAngle + (maxAngle - minAngle) / 2;
                        var c = Math.cos(a);
                        var s = Math.sin(a);

                        ctx.save();

                        if (minAngle < 0 || !this.readable_names) {
                            var r = minRadius - 2; //this.sepBetweenGens;
                            ctx.translate(r * c, r * s);
                            ctx.rotate((minAngle + maxAngle) / 2 + Math.PI / 2);
                        } else {
                            var r = minRadius - fontSize - 2; //this.sepBetweenGens;
                            ctx.translate(r * c, r * s);
                            ctx.rotate((minAngle + maxAngle) / 2 - Math.PI / 2);
                            ctx.translate(-30, 0);
                        }

                        this.text(0, 0, mar, attr);
                        ctx.restore();
                    }
                }
            }
        }
    }

    ctx.restore();
};

/**
 * Compute the dimensions of the chart.
 * @return {{width:number, height:number,
 *           centerX: number, centerY: number}}  The dimensions.
 */

FanchartCanvas.prototype.chartDimensions = function() {
    var d = this.data;
    var rowHeight = this.rowHeight + this.sepBetweenGens;
    var rowHeightAfterThreshold = this.rowHeightAfterThreshold +
       this.sepBetweenGens;

    if (d.generations < this.genThreshold) {
        var radius = d.generations * rowHeight;
    } else {
        var radius = (this.genThreshold - 1) * rowHeight
            + (d.generations - this.genThreshold)
            * rowHeightAfterThreshold;
    }

    if (this.maxAngle - this.minAngle >= PI_TWO) { //  full circle
        return {width: 2 * radius,
                height:2 * radius,
                centerX: 0,
                centerY: 0};
    } else {
        var minA = (this.minAngle + PI_TWO) % PI_TWO;  // 0 to 360deg
        var maxA = minA + (this.maxAngle - this.minAngle); // minA to 719deg

        // If going from min to max includes 0, the max is 1, otherwise it is
        // the max of the two cosine

        var max = (maxA < PI_TWO ?
                   Math.max(Math.cos(minA), Math.cos(maxA)) : 1);

        // If going from min to max includes PI the min is -1, otherwise it is
        // the min of the two cosine

        var min = ((minA <= Math.PI && maxA >= Math.PI) ||
                   (minA >= Math.PI && maxA < 3 * Math.PI)) ?
            Math.min(Math.cos(minA), Math.cos(maxA)) : -1;

        var width = radius * (max - min);
        var centerX = -min * radius;

        // same for height
        max = ((minA > Math.PI / 2 && maxA < 2.5 * Math.PI) ||
               (minA < PI_HALF && maxA < PI_HALF)) ?
            Math.max(Math.sin(minA), Math.sin(maxA)) : 1;

        min =  ((minA < 1.5 * Math.PI && maxA < 1.5 * Math.PI) ||
                (minA > 1.5 * Math.PI && maxA < 3.5 * Math.PI)) ?
            Math.min(Math.sin(minA), Math.sin(maxA)) : -1;

        var height = radius * (max - min);
        return {width: width,
                height: height,
                centerX: centerX,
                centerY: height + min * radius};
    }
};

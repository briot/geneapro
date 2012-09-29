
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
    this.rowHeight += this.sepBetweenGens;
    this.decujusx = this.boxWidth + this.horizPadding;
    this.decujusy = 0;  // computes later
}
inherits(FanchartCanvas, Canvas);

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
FanchartCanvas.prototype.sepBetweenGens = 20;

/* row height for generations >= genThreshold */
FanchartCanvas.prototype.rowHeightAfterThreshold = 120;

/* Height of the inner (white) circle. This height is substracted from
   rowHeight for the parent's row */
FanchartCanvas.prototype.innerCircle = 10;

/* Start and End angles, in radians, for the pedigree view.
 * This is clockwise, starting from the usual 0 angle!
 */
FanchartCanvas.prototype.minAngle = -170.0 * Math.PI / 180.0;
FanchartCanvas.prototype.maxAngle = 170.0 * Math.PI / 180.0;

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

/** @overrides */

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
        12 /* fontsize */,
        5 /* linesCount */);

    if (d.children) {
        var y = (maxHeight - childrenHeight) / 2;
        for (var c = 0; c < d.children.length; c++) {
            this.drawPersonBox(
                d.children[c] /* person */,
                1 /* x */,
                y /* y */,
                this.boxWidth /* width */,
                this.boxHeight /* height */,
                12 /* fontsize */,
                5 /* linesCount */);
            y += this.boxHeight + this.vertPadding;
        }
    }

    this.drawFan_(centerx, centery);
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
            var st = this.data.styles[p.y];
            st.stroke = 'gray';
            this.drawPath(st);

            if (gen < this.textThreshold) {
                ctx.save();

                // unfortunately we have to recreate the path, at least until the
                // Path object from the canvas API is implemented everywhere.
                doPath_(minRadius, maxRadius, maxAngle, minAngle);
                ctx.clip();

                var txt = person.surn + " " + person.givn +
                    "\n" + (event_to_string (person.b) || "?") +
                    "-" + (event_to_string (person.d) || "?");

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

                    this.text(0, 0, txt, this.data.styles[person.y],
                              fontSize /* lineSpacing */);

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
                    this.text(-60, 0, txt, this.data.styles[person.y],
                                fontSize /* lineSpacing */);


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

    for (var gen = d.generations - 1; gen >= 1; gen--) {
        if (gen < this.genThreshold) {
            var minRadius = this.rowHeight * (gen - 1) || this.innerCircle;
            var maxRadius = minRadius + this.rowHeight;
            if (gen == 1) maxRadius -= this.innerCircle;
        } else {
            var minRadius = this.rowHeight * (this.genThreshold - 1)
                + (gen - this.genThreshold) * this.rowHeightAfterThreshold;;
            var maxRadius = minRadius + this.rowHeightAfterThreshold;
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
                        this.text(-this.rowHeight, -10, mar, attr);
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

    if (d.generations < this.genThreshold) {
        var radius = d.generations * this.rowHeight;
    } else {
        var radius = (this.genThreshold - 1) * this.rowHeight
            + (d.generations - this.genThreshold)
            * this.rowHeightAfterThreshold;
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

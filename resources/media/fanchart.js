
var PI_HALF = Math.PI / 2;
var PI_TWO  = Math.PI * 2;

/**
 * @param {Element} canvas  A DOM element that contains the canvas.
 * @param {} data           The data returned by the server.
 */

function FanchartCanvas(canvas, data) {
    AbstractPedigree.call(this, canvas /* elem */, data /* data */);

    this.lineHeight = $.detectFontSize(this.baseFontSize, this.fontName);
    this.setTotalAngle(340);
    this.setShowMarriage(false);
    this.setCoupleSeparator(0);
    this.showSettings();
}
inherits(FanchartCanvas, AbstractPedigree);

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
FanchartCanvas.prototype.sepBetweenGens = 0;

/* row height for generations >= genThreshold */
FanchartCanvas.prototype.rowHeightAfterThreshold = 100;

/** Height of the inner (white) circle. */
FanchartCanvas.prototype.innerCircle = 20;

/* Start and End angles, in radians, for the pedigree view.
 * This is clockwise, starting from the usual 0 angle!
 */
FanchartCanvas.prototype.minAngle;
FanchartCanvas.prototype.maxAngle;

/* Separator (in radians) between couples. Setting this to 0.5 or more will
   visually separate the couples at each generation, possibly making the
   fanchart more readable for some users */
FanchartCanvas.prototype.separator = 0;

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
    this.drawPersonBox(
        d.sosa[1] /* person */,
        this.box_.childX + this.boxWidth + this.horizPadding /* x */,
        this.box_.centerY - this.boxHeight / 2 /* y */,
        this.boxWidth /* width */,
        this.boxHeight /* height */,
        this.baseFontSize /* fontsize */);

    if (d.children) {
        var childrenHeight =
            d.children.length * (this.boxHeight + this.vertPadding);
        var y = this.box_.centerY - childrenHeight / 2;
        for (var c = 0; c < d.children.length; c++) {
            this.drawPersonBox(
                d.children[c] /* person */,
                this.box_.childX /* x */,
                y /* y */,
                this.boxWidth /* width */,
                this.boxHeight /* height */,
                this.baseFontSize /* fontsize */);
            y += this.boxHeight + this.vertPadding;
        }
    }

    this.drawFan_();
};

/**
 * Canvas needs to be refreshed afterwards
 * @param {Boolean} show  Whether to display marriage information.
 */

FanchartCanvas.prototype.setShowMarriage = function(show) {
   this.sepBetweenGens = (show ? 20 : 0);
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
 * @param {Number} angle  Sets the extra angle (degrees) separator between
 *   couples.
 * Canvas needs to be refreshed afterwards
 */

FanchartCanvas.prototype.setCoupleSeparator = function(angle) {
   this.separator = angle * Math.PI / 180.0;
   return this;
};

/** @inheritDoc */

FanchartCanvas.prototype.showSettings = function() {
   var f = this;  //  closure for callbacks

   AbstractPedigree.prototype.showSettings.call(this);  //  inherited

   $("#settings #separator")
      .slider({"min": 0, "max": 50,
               "value": Math.round(this.separator * 180 / Math.PI) * 10,
               "change": function() {
                  f.setCoupleSeparator($(this).slider("value") / 10).refresh(); }});
   $("#settings input[name=marriages]")
      .change(function() { f.setShowMarriage(this.checked).refresh() })
      .attr('checked', this.sepBetweenGens != 0);
   $("#settings #size")
      .slider({"min": 90, "max": 360,
               "value": Math.round((this.maxAngle - this.minAngle) * 180 / Math.PI),
               "change": function() { f.setTotalAngle($(this).slider("value")).refresh() }});
};

/**
 * Draw the fanchart for the global variables sosa, based on the
 *configuration.
 * This does not draw the decujus or its children
 */

FanchartCanvas.prototype.drawFan_ = function() {
    var d = this.data;
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
    function createPath(p, minRadius, maxRadius, maxAngle, minAngle) {
        doPath_(minRadius, maxRadius, maxAngle, minAngle);
        var st = this.getStyle_(p, minRadius, maxRadius);
        this.drawPath(st);

        if (p.generation < this.textThreshold) {
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

            if (p.generation >= this.genThreshold) {
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
    }

    ctx.save();
    var fontSize = 14;
    ctx.font = fontSize + "px Arial";
    ctx.translate(this.box_.centerX, this.box_.centerY);

    var radiuses = this.computeRadius_();

    for (var gen = 1; gen <= this.gens; gen++) {
        var minIndex = Math.pow(2, gen); /* first SOSA in that gen, and number
                                            of persons in that gen */
        var radius = radiuses[gen];
        var angle = this.minAngle + this.separator / 2;

        for (var id = 0; id < minIndex; id++) {
            var person = d.sosa[minIndex + id];
            var maxAngle = angle + radius.boxAngle;

            if (person) {
                createPath.call(
                    this, person, radius.min, radius.max, maxAngle, angle);

                if (person.sosa % 2 == 0 && this.sepBetweenGens > 10
                    && d.marriage[person.sosa] && gen <= 7)
                {
                    var mar = event_to_string(d.marriage [person.sosa]);
                    var attr = {"stroke": "black"};

                    if (gen == 1) {
                        this.text(-(radius.max - radius.min), -10, mar, attr);
                    } else {
                        var a = angle + radius.boxAngle / 2;
                        var c = Math.cos(a);
                        var s = Math.sin(a);

                        ctx.save();
                        var r = radius.min - fontSize + 2;
                        ctx.translate(r * c, r * s);

                        if (angle < 0 || !this.readable_names) {
                            ctx.rotate((angle + maxAngle) / 2 + Math.PI / 2);
                        } else {
                            ctx.rotate((angle + maxAngle) / 2 - Math.PI / 2);
                            ctx.translate(-30, 0);
                        }

                        this.text(0, 0, mar, attr);
                        ctx.restore();
                    }
                }
            }
            angle = maxAngle + (radius.seps[id] || 0);
        }
    }

    ctx.restore();
};

/** Compute the inner and outer radius for all generations, as well as
 * the angle opening for a box.
 * This function also computes, if necessary, the separators between persons.
 * These separators vary from generation to generation, since otherwise there
 * is proportionally too much span between persons at later generations.
 *     sep(n+1) = sep(n) / 2;
 * As a result, at generation 1 (parents of decujus) we have the following
 * separator list (where p<sosa> is a person):
 *     [p2, sep(1), p3]
 * Then at generation 2 we have:
 *     [p4, sep(2), p5, sep(1), p6, sep(2), p7]
 * At generation 3 we have:
 *     [p8, sep(3), p9, sep(2), p10, sep(3), p11, sep(1), ...]
 *
 * @typedef {{min:number,max:number,boxAngle:number,seps:Array.<number>}} data
 * @return {Array.<data>}  the data.
 *  @private
 */

FanchartCanvas.prototype.computeRadius_ = function() {
   var d = this.data;

   var prev = {min: 0,
               max: this.innerCircle,
               seps: [],
               boxAngle: (this.maxAngle - this.minAngle) - this.separator};
   var result = [prev];
   var sep = this.separator;

   for (var gen = 1; gen <= this.gens; gen++) {
      var minRadius = (gen == 1) ? prev.max : prev.max + this.sepBetweenGens;
      var maxRadius = minRadius +
         (gen < this.genThreshold ? this.rowHeight : this.rowHeightAfterThreshold);

      var seps = [];
      for (var p = 0; p < prev.seps.length; p++) {
         seps.push(sep);
         seps.push(prev.seps[p]);
      }
      seps.push(sep);
      
      sep *= 0.5;
      prev = {min: minRadius,
              max: maxRadius,
              seps: seps,
              boxAngle: prev.boxAngle / 2 - sep};
      result.push(prev);
   }

   return result;
};

/** @inheritDoc */

FanchartCanvas.prototype.computeBoundingBox = function() {
    var d = this.data;

    // Compute the bounding box for the fan itself, as if it was
    // centered on (0, 0).
    var minX = 0;
    var minY = 0;
    var maxX = 0;
    var maxY = 0;
    var radiuses = this.computeRadius_();

    for (var gen = this.gens; gen > 0; gen--) {
       var personsInGen = Math.pow(2, gen);  // Number of persons in that gen.
       var radius = radiuses[gen];
       var angle = this.minAngle + this.separator / 2;

       for (var p = 0; p < personsInGen; p++) {
          var person = d.sosa[personsInGen + p];
          var maxAngle = angle + radius.boxAngle;

          if (person) {
             //  ??? We should also check at each of the North,West,South,East
             //  points, since these can also intersect the bounding box. We
             //  need to check whether any of these is within the arc though.
             var x1 = radius.max * Math.cos(angle);
             var y1 = radius.max * Math.sin(angle);
             var x2 = radius.max * Math.cos(maxAngle);
             var y2 = radius.max * Math.sin(maxAngle);
             minX = Math.min(minX, x1, x2);
             maxX = Math.max(maxX, x1, x2);
             minY = Math.min(minY, y1, y2);
             maxY = Math.max(maxY, y1, y2);
          }
          angle = maxAngle + radius.seps[p];
       }
    }

    var width = maxX - minX;
    var height = maxY - minY;

    // The space there should be after the decujus box so that the fanchart
    // does not hide it partially.
    //      angle = from maxAngle to minAngle (blank slice)
    //      tan(angle / 2) = (boxHeight / 2) / minDist
    // so
    //     minDist = (boxHeight / 2) / tan(angle / 2)

    var angle = PI_TWO - (this.maxAngle - this.minAngle);
    var minDist;  // distance between left side of decujus box and fan center
    if (angle >= Math.PI) {
       minDist = 0;
    } else if (angle <= 0) {
       minDist = width; // fullCircle
    } else {
       minDist = this.boxHeight / 2 / Math.tan(angle / 2) + this.horizPadding;
    }
    // Don't put the fanchart too far (when the blank slice is small)
    minDist = Math.min(minDist, width / 2 + this.horizPadding);

    var centerXRel = //  position of fan center relative to left side
       this.boxWidth * 2 + this.horizPadding + minDist;
    var offsetX =  //  offset so that the fan fits in the box
       Math.min(centerXRel + minX, 0);
    this.box_ = {x: 0, y: 0,
                 centerX: centerXRel - offsetX,
                 centerY: -minY,
                 childX: -offsetX,
                 width: centerXRel + maxX - offsetX,
                 height: height};
};


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

    var f = this;  //  closure for callbacks
    $("#settings #separator")
      .slider({"min": 0, "max": 100,
               "change": function() {
                  f.setCoupleSeparator($(this).slider("value") / 10).refresh(); }});
    $("#settings input[name=marriages]")
       .change(function() { f.setShowMarriage(this.checked).refresh() });
    $("#settings #size")
       .slider({"min": 90, "max": 360,
                "change": function() { f.setTotalAngle($(this).slider("value")).refresh() }});
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

/** @inheritDoc */

FanchartCanvas.prototype.personAtCoordinates = function(x, y) {
   var radius = Math.sqrt(
         (x - this.box_.centerX) * (x - this.box_.centerX) +
         (y - this.box_.centerY) * (y - this.box_.centerY));
   var angle = Math.atan2(y - this.box_.centerY, x - this.box_.centerX);

   var selected = null;
   this.forEachVisiblePerson(
         function(person) {
            if (person.box_.minRadius <= radius &&
                radius <= person.box_.maxRadius &&
                person.box_.minAngle <= angle &&
                angle <= person.box_.maxAngle)
            {
               selected = person;  // an ancestor
               return true;

            } else if (!person.box_.minRadius &&
               this.pointInBox(person.box_, x, y)) 
            {
               selected = person;  //  a child
               return true;
            }
         });
   return selected;
};

/** @inheritDoc */

FanchartCanvas.prototype.onDraw = function(evt, screenBox) {
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

    this.forEachVisiblePerson(
        function(person) {
           if (person.generation <= 0) {
              var b = person.box_;
              this.drawPersonBox(person, b.x, b.y, b.w, b.h, b.fs);
              return false;
            }

            ctx.save();
            ctx.translate(this.box_.centerX, this.box_.centerY);

            var minAngle = person.box_.minAngle;
            var maxAngle = person.box_.maxAngle;
            var minRadius = person.box_.minRadius;
            var maxRadius = person.box_.maxRadius;

            doPath_(minRadius, maxRadius, maxAngle, minAngle);
            var st = this.getStyle_(person, minRadius, maxRadius);

            if (this.isSelected(person)) {
               ctx.lineWidth = 3;
            }
            this.drawPath(st);

            var fontSize = person.box_.fontSize;
            ctx.font = fontSize + "px Arial";

            if (person.generation < this.textThreshold &&
                fontSize * this.scale >= 2)
            {
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

                if (person.generation >= this.genThreshold) {
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

            if (person.sosa % 2 == 0 && this.sepBetweenGens > 10
                && d.marriage[person.sosa] && person.generation <= 7
                && fontSize * this.scale >= 2)
            {
                var mar = event_to_string(d.marriage [person.sosa]);
                var attr = {"stroke": "black"};

                if (person.generation == 1) {
                    this.text(-(maxRadius - minRadius), -10, mar, attr);
                } else {
                    var a = (minAngle + maxAngle) / 2;
                    var c = Math.cos(a);
                    var s = Math.sin(a);

                    ctx.save();
                    var r = minRadius - fontSize + 2;
                    ctx.translate(r * c, r * s);

                    if (a < 0 || !this.readable_names) {
                        ctx.rotate((minAngle + maxAngle) / 2 + Math.PI / 2);
                    } else {
                        ctx.rotate((minAngle + maxAngle) / 2 - Math.PI / 2);
                        ctx.translate(-30, 0);
                    }

                    this.text(0, 0, mar, attr);
                    ctx.restore();
                }
            }
            ctx.restore();
        });

    ctx.restore();
};

/**
 * Canvas needs to be refreshed afterwards
 * @param {Boolean} show  Whether to display marriage information.
 */

FanchartCanvas.prototype.setShowMarriage = function(show) {
   this.sepBetweenGens = (show ? 20 : 0);
   this.setNeedLayout();
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
   this.setNeedLayout();
   return this;
};

/**
 * @param {Number} angle  Sets the extra angle (degrees) separator between
 *   couples.
 * Canvas needs to be refreshed afterwards
 */

FanchartCanvas.prototype.setCoupleSeparator = function(angle) {
   this.separator = angle * Math.PI / 180.0;
   this.setNeedLayout();
   return this;
};

/** @inheritDoc */

FanchartCanvas.prototype.showSettings = function() {
   AbstractPedigree.prototype.showSettings.call(this);  //  inherited

   $("#settings #separator")
      .slider({"value": Math.round(this.separator * 180 / Math.PI) * 10});
   $("#settings input[name=marriages]")
      .attr('checked', this.sepBetweenGens != 0);
   $("#settings #size")
      .slider({"value": Math.round((this.maxAngle - this.minAngle) * 180 / Math.PI)});
};

/** @inheritDoc
 *  For each person, sets a box_ field containing display information:
 *    {minAngle:number, maxAngle:number,   // angles for that person
 *     minRadius, maxRadius:number,        // inner and outer radius
 *     fontSize:number
 *    }
 */

FanchartCanvas.prototype.computeBoundingBox = function() {
    var d = this.data;

    // Compute the radius for each generation
    var minRadius = [0];
    var maxRadius = [this.innerCircle];
    var fs = [this.lineHeight];

    for (var gen = 1; gen <= this.gens; gen++) {
       var m = maxRadius[gen - 1] + ((gen == 1) ? 0 : this.sepBetweenGens); 
       fs.push(fs[gen - 1] * 0.9);
       minRadius.push(m);
       maxRadius.push(
          m + (gen < this.genThreshold ?
            this.rowHeight : this.rowHeightAfterThreshold));
    }

    // Compute the bounding box for the fan itself, as if it was
    // centered on (0, 0).
    var minX = 0;
    var minY = 0;
    var maxX = 0;
    var maxY = 0;
    var canvas = this;

    /** Register the layout information for a given individual
     *  ??? We should also check at each of the North,West,South,East
     *  points, since these can also intersect the bounding box. We
     *  need to check whether any of these is within the arc though.
     */
    function setupIndivBox(indiv, minAngle, maxAngle) {
       var maxR = maxRadius[indiv.generation];
       var x1 = maxR * Math.cos(minAngle);
       var y1 = maxR * Math.sin(minAngle);
       var x2 = maxR * Math.cos(maxAngle);
       var y2 = maxR * Math.sin(maxAngle);
       minX = Math.min(minX, x1, x2);
       maxX = Math.max(maxX, x1, x2);
       minY = Math.min(minY, y1, y2);
       maxY = Math.max(maxY, y1, y2);
       indiv.box_ = {minAngle: minAngle,
                     maxAngle: maxAngle,
                     minRadius: minRadius[indiv.generation],
                     maxRadius: maxR,
                     fontSize: fs[indiv.generation]};
    }

    switch (this.layoutScheme_) {
    case AbstractPedigree.layoutScheme.EXPANDED:
       function doLayout(indiv, minAngle, maxAngle, separator) {
          setupIndivBox(indiv, minAngle, maxAngle);

          if (indiv.generation < canvas.gens) {
             var half = (minAngle + maxAngle) / 2;
             var father = d.sosa[indiv.sosa * 2];
             var mother = d.sosa[indiv.sosa * 2 + 1];

             if (father) {
                doLayout(father, minAngle, half - separator / 2, separator / 2);
             } 
             if (mother) {
                doLayout(mother, half + separator / 2, maxAngle, separator / 2);
             }
          }
       }
       break;

    case AbstractPedigree.layoutScheme.COMPACT:
       function doLayout(indiv, minAngle, maxAngle, separator) {
          setupIndivBox(indiv, minAngle, maxAngle);

          if (indiv.generation < canvas.gens) {
             var father = d.sosa[indiv.sosa * 2];
             var mother = d.sosa[indiv.sosa * 2 + 1];

             if (father && mother) {
                var half = (minAngle + maxAngle) / 2;
                doLayout(father, minAngle, half - separator / 2, separator / 2);
                doLayout(mother, half + separator / 2, maxAngle, separator / 2);
             } else if (father) {
                var tenth = minAngle + maxAngle * 0.9;
                doLayout(father, minAngle, tenth - separator / 2, separator / 2);
             } else if (mother) {
                var tenth = minAngle + maxAngle * 0.1;
                doLayout(mother, tenth + separator / 2, maxAngle, separator / 2);
             }
          }
       }
       break;
    }

    doLayout(d.sosa[1], this.minAngle + this.separator / 2,
             this.maxAngle - this.separator / 2, this.separator);

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

    // Compute the position for the children and decujus

    d.sosa[1].box_ = {
       x: this.box_.childX + this.boxWidth + this.horizPadding,
       y: this.box_.centerY - this.boxHeight / 2,
       w: this.boxWidth,
       h: this.boxHeight,
       fs: this.baseFontSize};

    var children = d.sosa[1].children;
    if (children) {
       var childrenHeight = children.length * (this.boxHeight + this.vertPadding);
       var y = this.box_.centerY - childrenHeight / 2;
       this.box_.y = Math.min(this.box_.y, y);
       for (var c = 0; c < children.length; c++) {
          children[c].box_ = {
             x: this.box_.childX,
             y: y,
             w: this.boxWidth,
             h: this.boxHeight,
             fs: this.baseFontSize};
          y += this.boxHeight + this.vertPadding;
       }
       this.box_.height = Math.max(this.box_.height, y - this.box_.y);
    }
};

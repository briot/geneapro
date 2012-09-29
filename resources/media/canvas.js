/* @requires: mouse_events.js */
/* @requires: rtree.js */

/**
 * A canvas class that provides various higher-level services.
 * It can be zoomed and scrolled with the mouse.
 *
 * @param {Element} elem   The DOM element to decorate.
 */

function Canvas(elem) {
    this._disableClicks = false; // If true, disable click events

    this.ctx = elem.getContext("2d");
    this.ctx.textBaseline = 'top';

    this.canvas = $(elem);
    this.canvas
        .start_drag($.proxy(this.onStartDrag, this))
        .in_drag($.proxy(this.onInDrag, this))
        .wheel($.proxy(this.onWheel, this))
        .bind("draw", $.proxy(this.onDraw, this))
        .click($.proxy(this.onClick, this))
        .dblclick(
            $.proxy(
                function(e) {this.ifnotDisabled_(e, this.onDblClick)},
                this))
        .ctrl_click(
            $.proxy(
                function(e) {this.ifnotDisabled_(e, this.onCtrlClick)},
                this));

    $(window).resize($.proxy(this.onResize, this));

    /*       this.actions = {};  // "name":function,  for methods to add to the object
    // When function is called, THIS is the instance of Canvas
    for (var a in options.actions) {
    elem[a] = $.proxy(options.actions[a], this);
    }
    */
}

/** Current scale factor of the canvas
 * @type {number}
 */

Canvas.prototype.scale = 1.0;

/** Current scrolling position of the canvas, in absolute coordinates.
 * @type {number}
 */
Canvas.prototype.left = 0.0;
Canvas.prototype.top = 0.0;

/** Multiplier when zooming */

Canvas.prototype.scaleStep = 1.1;

/** Whether to draw a box when a parent is unknown */

Canvas.prototype.showUnknown = false;

/** Base font size, in pixels */

Canvas.prototype.baseFontSize = 16;

/** No need to draw text below this size */

Canvas.prototype.minFont = 5;

/** Default font */

Canvas.prototype.fontName = "sans";

/** Whether refresh() should set the transformation matrix automatically.
 * This is the default, but might result in lower quality rendering because
 * fonts should be resized appropriately. Also, you might want to disable
 * this if you display more data when zooming in.
 */

Canvas.prototype.autoZoom = true;

/**
 * Called when the canvas needs redrawing (for instance after a resize
 * or its contents was changed).
 * Do not call this function directly, but use this.refresh() instead.
 *
 * When this.autoZoom is true, the transformation matrix has already been
 * set.
 *
 * This function is always executed within a save()..restore() block.
 *
 * @protected
 */

Canvas.prototype.onDraw = function() {};


/**
 * Called when the user is clicking on the canvas
 * @protected
 */

Canvas.prototype.onClick = function() {};

/**
 * Called when the user is double-clicking on the canvas
 * @protected
 */

Canvas.prototype.onDblClick = function() {};

/**
 * Called when the user control-clicks in the canvas.
 * @protected
 */

Canvas.prototype.onCtrlClick = function() {};

/**
 * Set the context's transformation matrix based on current scale and scroll.
 */

Canvas.prototype.setTransform = function() {
    this.ctx.setTransform(
        this.scale, 0, 0,
        this.scale, -this.scale * this.left, -this.scale * this.top);
};

/**
 * Clear the canvas area.
 * @param {} box   The area to clear, defaults to whole canvas
 */

Canvas.prototype.clear = function(box) {
    if (!box) {
        box = {x:0, y:0, w:this.canvas[0].width, h:this.canvas[0].height};
    }
    try {
        this.ctx.save();
        this.ctx.setTransform(
            1, 0, 0,
            1, 0, 0);
        this.ctx.clearRect(box.x, box.y, box.w, box.h);
    } finally {
        this.ctx.restore();
    }
};

/**
 * Force a refresh of the canvas (clears it and sends the "draw" signal).
 * @param {} box   The area to refresh, defaults to whole canvas.
 */

Canvas.prototype.refresh = function (box) {
    if (!box) {
        box = {x:0, y:0, w:this.canvas[0].width, h:this.canvas[0].height};
    }

    this._disableClicks = false;

    this.clear(box);

    try {
        this.ctx.save();

        if (this.autoZoom) {
            this.setTransform();
            this.canvas.trigger("draw", box);
        }
    } finally {
        this.ctx.restore();
    }
};

/**
 * The visible area, in absolute coordinates
 * @return {Rect}
 */

Canvas.prototype.visibleAreaAbs = function() {
    return new Rect(
        this.left, this.top,
        this.toAbsLength(this.canvas[0].width),
        this.toAbsLength(this.canvas[0].height));
};

/**
 * @param {number} length   The length to convert.
 * @return {number}  The same length at zoom 1:1.
 */

Canvas.prototype.toPixelLength = function(length) {
    return length * this.scale;
};

/**
 * @param {number} length   The length at zoom 1:1
 * @return {number}  The same length at current zoom level.
 */

Canvas.prototype.toAbsLength = function(length) {
    return length / this.scale;
};

/**
 * @param {number} xabs   X coordinate at zoom 1:1
 * @return {number}  The same coordinate at current zoom level.
 */

Canvas.prototype.toPixelX = function(xabs) {
    return (xabs - this.left) * this.scale;
};

/**
 * @param {number} yabs   Y coordinate at zoom 1:1
 * @return {number}  The same coordinate at current zoom level.
 */

Canvas.prototype.toPixelY = function(yabs) {
    return (yabs - this.top) * this.scale;
};

/**
 * @param {number} xpixel   X coordinate at current zoom level.
 * @return {number}  The same coordinate at zoom 1:1.
 */

Canvas.prototype.toAbsX = function(xpixel) {
    return xpixel / this.scale + this.left;
};

/**
 * @param {number} ypixel   Y coordinate at current zoom level.
 * @return {number}  The same coordinate at zoom 1:1.
 */

Canvas.prototype.toAbsY = function(ypixel) {
    return ypixel / this.scale + this.top;
};

/**
 * Called when the canvas has been resized.
 * @protected
 */

Canvas.prototype.onResize = function() {
    //  Changing the attributes on the canvas also sets the coordinate space We
    //  always want a 1 to 1 mapping between canvas coordinates and pixels, so
    //  that text is drawn sharp.
    var elem = this.canvas[0];
    elem.width  = this.canvas.width();
    elem.height = this.canvas.height();
    this.refresh();
};

/**
 * Called when starting a drag operation on the canvas background (to scroll).
 * @protected
 */

Canvas.prototype.onStartDrag = function(e, dragdata) {
    dragdata.offset = {left: this.left, top: this.top};
    dragdata.scale  = 1 / -this.scale;
    dragdata.weight = 400;  //  Only throwing when in background
};

/**
 * Called during a scroll operation
 * @protected
 */

Canvas.prototype.onInDrag = function(e, dragdata) {
    this.left = dragdata.offset.left;
    this.top = dragdata.offset.top;
    this.refresh ();
};

/**
 * Display text at the given coordinates, using the given attributes.
 *
 * @param {} attr Can be used to specify the style: 'attr.fill',
 *    'attr.font-weight' and 'attr.stroke', in particular.
 */

Canvas.prototype.text = function(x, y, text, attr, lineSpacing) {
    if (attr && attr["font-weight"]) {
        this.ctx.font = attr["font-weight"] + " " + this.fontName;
    }

    this.ctx.fillStyle = (attr && attr.color) || "black";

    var txt = text.split('\n');
    for (var t in txt) {
        this.ctx.fillText(txt[t], x, y);
        y += (lineSpacing || 12);
    }
};

/** Stroke or fill the current path, with the given attributes.
 *  In particular 'attr.fill', 'attr.stroke' and 'attr.shadow'. The
 *  latter is a boolean that indicates if a shadow should be added.
 */

Canvas.prototype.drawPath = function(attr) {
    var c = this.ctx;
    if (attr.shadow){
        c.save();
        c.fillStyle = 'transparent';
        c.shadowOffsetX = 3;
        c.shadowOffsetY = 3;
        c.shadowBlur    = 10;
        c.shadowColor   = 'rgba(00,00,00,0.4)';
        c.fill();
        c.restore();
    }
    if (attr.fill) {
        c.fillStyle = attr.fill || 'white';
        c.fill ();
    }
    if (attr.stroke) {
        c.strokeStyle = attr.stroke;
        c.stroke ();
    }
};

/** Draw a rectangle with the given attributes */

Canvas.prototype.rect = function(x, y, width, height, attr) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.drawPath(attr);
};

/** Draw a rounded rectangle with the given attributes */

Canvas.prototype.roundedRect = function(x, y, width, height, attr, radius) {
    var c = this.ctx;
    radius = radius || 6;
    c.beginPath ();
    c.moveTo(x + radius, y);
    c.lineTo(x + width - radius, y);
    c.quadraticCurveTo(x + width, y, x + width, y + radius);
    c.lineTo(x + width, y + height - radius);
    c.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    c.lineTo(x + radius, y + height);
    c.quadraticCurveTo(x, y + height, x, y + height - radius);
    c.lineTo(x, y + radius);
    c.quadraticCurveTo(x, y, x + radius, y);
    c.closePath();
    this.drawPath (attr);
};

/**
 * Update the scale of the canvas, keeping (xoffs, yoffs) in place.
 */

Canvas.prototype.updateZoom = function(newScale, xoffs, yoffs) {
    var old_scale = this.scale;
    var offset = this.canvas.offset();
    var xabs = this.toAbsX(xoffs - offset.left);
    var yabs = this.toAbsY(yoffs - offset.top);

    this.scale = newScale;

    // Keep the mouse position constant on the screen (ie do not move the
    // pixel we are pointing to).
    // if mx is screen coordinate of mouse, this must remain constant.
    //   mx = (mxabs - oldx) * oldz
    //      = (mxabs - this.left) * this.scale
    //   => this.left = mxabs - (mxabs - oldx) * oldz / this.scale

    this.left = xabs - (xabs - this.left) * old_scale / this.scale;
    this.top = yabs - (yabs - this.top) * old_scale / this.scale;
    this.refresh();
};

/**
 * Called when the user uses the mouse wheel to zoom in or out
 * @protected
 */

Canvas.prototype.onWheel = function(e) {
    if (e.delta > 0) {
        this.updateZoom(this.scale * this.scaleStep, e.clientX, e.clientY);
    } else {
        this.updateZoom(this.scale / this.scaleStep, e.clientX, e.clientY);
    }
    return false;  //  prevent main window from scrolling
};

/**
 * Calls 'callback' if the click events are not disabled for the canvas
 * @private
 */

Canvas.prototype.ifnotDisabled_ = function(evt, callback) {
    if (!this._disableClicks) {
        try {
            this.checked._disableClicks = true;
            var ret = callback.call(this, evt);
        } finally {
            this._disableClicks = false;
        }
        return ret;
    }
};

/**
 * Draw a rectangular box for a person, at the given coordinates.
 * The box allows for up to linesCount of text.
 * (x,y) are specified in pixels, so zooming and scrolling must have been
 * applied first.
 */

Canvas.prototype.drawPersonBox = function(
    person, x, y, width, height, fontsize, linesCount)
{
    if (person) {
        var attr = this.data.styles[person.y];
        attr.shadow = (height > 2); // force shadow
        this.roundedRect (x, y, width, height, attr);

        if (fontsize >= this.minFont && linesCount >= 1) {
            var font = this.fontsize + "px " + this.fontName;
            var c = this.ctx;
            c.textBaseline = 'top';
            c.save ();
            c.clip ();
            c.translate(x, y);
            c.font = font;
            this.text(1, 0, person.surn + " " + person.givn, attr);

            if (linesCount >= 2 && linesCount < 5) {
                var birth = event_to_string (person.b),
                death = event_to_string (person.d);
                c.fillText(birth + " - " + death, 1, fontsize);

            } else if (linesCount > 2) {
                var birth = event_to_string(person.b);
                var death = event_to_string(person.d);
                var birthp = person.b ? person.b[1] || "" : "";
                var deathp = person.d ? person.d[1] || "" : "";
                if (linesCount >= 2) {
                    c.fillText("b:", 1, fontsize);
                }
                if (linesCount >= 4) {
                    c.fillText("d:", 1, 3 * fontsize);
                }

                c.font = "italic " + font;
                if (linesCount >= 2 && birth)  {
                    c.fillText(birth,  fontsize, fontsize);
                }
                if (linesCount >= 3 && birthp) {
                    c.fillText(birthp, fontsize, 2 * fontsize);
                }
                if (linesCount >= 4 && death) {
                    c.fillText(death,  fontsize, 3 * fontsize);
                }
                if (linesCount >= 5 && deathp) {
                    c.fillText(deathp, fontsize, 4 * fontsize);
                }
            }
            c.restore (); // unset clipping mask and font
        }
    } else if (this.showUnknown) {
        this.roundedRect(
            x, y, width, height, {fill:"white", stroke:"black"});
    }
};

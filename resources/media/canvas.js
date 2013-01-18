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
        .mousewheel($.proxy(this.onWheel, this))
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

/** Whether to automatically scale to show the whole bounding box.
 * Automatic scaling is automatically disabled if computeBoundingBox returns
 * a 0 width.
 * @private
 */

Canvas.prototype.autoScale_ = true;

/** Base font size, in pixels */

Canvas.prototype.baseFontSize = 16;

/** No need to draw text below this size (in pixels) */

Canvas.prototype.minFontSize = 5;

/**
 * Maximum fontSize (in pixels). After this, we start displaying more lines.
 */
Canvas.prototype.maxFontSize = 15;

/** Default font */

Canvas.prototype.fontName = "sans";

/** Whether refresh() should set the transformation matrix automatically.
 * This is the default, but might result in lower quality rendering because
 * fonts should be resized appropriately. Also, you might want to disable
 * this if you display more data when zooming in.
 */

Canvas.prototype.autoZoom = true;

/**
 * Size of the display (not the size of the canvas itself)
 * @private
 */ 

Canvas.prototype.size_ = {width: 0, height: 0};

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
 * @param {{x,y,w,h:number}} box
 *    The area (absolute coordinates) to refresh.
 *
 * @protected
 */

Canvas.prototype.onDraw = function(e, box) {};


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
 * @param {} box   The area to refresh in absolute coordinates,
 *    defaults to whole canvas.
 */

Canvas.prototype.refresh = function (box) {
    this._disableClicks = false;

    this.clear(box);

    try {
        this.ctx.save();
        this.computeBoundingBox();

        if (this.autoScale_ && this.box_.width != 0) {
           this.left = this.box_.x;
           this.top = this.box_.y;
           this.scale = Math.min(
              this.canvas[0].width / this.box_.width,
              this.canvas[0].height / this.box_.height);
        }

        if (!box) {
            box = {x: this.toAbsX(0),
                   y: this.toAbsY(0),
                   w: this.toAbsLength(this.canvas[0].width),
                   h: this.toAbsLength(this.canvas[0].height)};
        }

        if (this.autoZoom) {
            this.setTransform();
        }

        this.canvas.trigger("draw", box);
    } finally {
        this.ctx.restore();
    }
};

/**
 * Update the settings box to reflect the current settings, and so that
 * changing the settings also updates the fanchart.
 */

Canvas.prototype.showSettings = function() {
   var f = this;  //  closure for callbacks
   $("#settings input[name=autoScale]")
      .change(function() { f.setAutoScale(this.checked); f.refresh()})
      .attr('checked', this.autoScale_);
};

/**
 * Compute the dimensions of the object to display.
 * Sets this.box_.
 * @return {{width:number, height:number, x:number, y:number}}  The position
 *   of the bounding box in absolute coordinates. The returned object might
 *   contain extra fields cached by the specific canvas implementation.
 */

Canvas.prototype.computeBoundingBox = function() {
   this.box_ = {width: 0, height: 0, x: 0, y: 0};
};

/**
 * Whether the scaling factor should be computed automatically when the
 * canvas is refreshed, to show the whole area.
 */

Canvas.prototype.setAutoScale = function(autoScale) {
   if (autoScale != this.autoScale_) {
      this.autoScale_ = autoScale;
      $("#settings input[name=autoScale]").attr('checked', this.autoScale_);
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
    this.setAutoScale(false);
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
    this.ctx.fillStyle = (attr && attr['color']) || "black";

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
        c.fillStyle = attr['fill'] || 'white';
        c.fill ();
    }
    if (attr.stroke) {
        c.strokeStyle = attr['stroke'];
        c.stroke ();
    }
};

/** Draw a text along a arc of circle.
 * ??? This would be more efficient and nicer looking when using HTML5
 * canvas capabilities, when they are supported by browsers.
 * See http://www.html5canvastutorials.com/labs/html5-canvas-text-along-arc-path/
 */

Canvas.prototype.textAlongArc = function(str, radius, minAngle, maxAngle, attr) {
   var centerX = 0;
   var centerY = 0;

   /* Code below does not work in fact, letters are way too spaced */
/*
   if (attr && attr["font-weight"]) {
        this.ctx.font = attr["font-weight"] + " " + this.fontName;
   }
   this.ctx.fillStyle = (attr && attr.color) || "black";

   var len = str.length;
   this.ctx.save();
   this.ctx.translate(centerX, centerY);
   this.ctx.rotate(-1 * angle / 2);
   this.ctx.rotate(-1 * (angle / len) / 2);
   for (var n = 0; n < len; n++) {
      this.ctx.rotate(angle / len);
      this.ctx.save();
      this.ctx.translate(0, -1 * radius);
      this.ctx.fillText(str[n], 0, 0);
      this.ctx.restore();
   }
   this.ctx.restore();
   */

   var a = minAngle + (maxAngle - minAngle) / 2;
   this.ctx.save();
   this.ctx.translate(radius * math.cos(a), radius * Math.sin(a));
   this.ctx.rotate((minAngle + maxAngle) / 2 + Math.PI / 2);
   this.drawPersonText(person, -60, 0, 2 * fontSize, fontSize);
   this.ctx.restore();
};

/**  Make this.ctx.fillStyle partially transparent */

Canvas.prototype.setFillTransparent = function(alpha) {
    var c = this.ctx.fillStyle;

    if (c[0] == '#') {
        this.ctx.fillStyle = "rgba(" +
            parseInt(c[1] + c[2], 16) + "," +
            parseInt(c[3] + c[4], 16) + "," +
            parseInt(c[5] + c[6], 16) + "," + alpha + ")";
    } //  else c might start with "rgb()" or "rgba()"

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

    //  Avoid graphical artifacts
    if (height < radius * 2) {
       radius = height / 2;
    }
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

Canvas.prototype.onWheel = function(e, delta, deltaX, deltaY) {
    if (deltaY > 0) {
       this.setAutoScale(false);
       this.updateZoom(this.scale * this.scaleStep, e.clientX, e.clientY);
    } else if (deltaY < 0) {
       this.setAutoScale(false);
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
            this._disableClicks = true;
            var ret = callback.call(this, evt);
        } finally {
            this._disableClicks = false;
        }
        return ret;
    }
};

/**
 * HSV to RGB color conversion
 *   @param{number}  h    Hue for the color (from 0 to 360 degrees).
 *   @param{number}  s    Saturation (from 0 to 1.0).
 *   @param{number}  v    Value (from 0 to 1.0).
 *   @return{jquery.Color}  The red, green, blue components.
 */

Canvas.prototype.hsvToRgb = function(h, s, v) {
   // Make sure our arguments stay in-range
   h = (h + 360) % 360;
   s = Math.max(0, Math.min(1, s));
   v = 255 * Math.max(0, Math.min(1, v));

   if (s == 0) {
      return $.Color(v, v, v);  //  grey
   }

   h /= 60; // sector 0 to 5
   var i = Math.floor(h);
   var f = h - i; // factorial part of h
   var p = v * (1 - s);
   var q = v * (1 - s * f);
   var t = v * (1 - s * (1 - f));

   switch (i) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      default: r = v; g = p; b = q;
   }

   return $.Color(r, g, b);
};

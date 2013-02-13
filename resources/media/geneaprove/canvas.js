/* requires: mouse_events.js */
/* requires: rtree.js */
/* requires: box.js */

/** A canvas class that provides various higher-level services.
 * It can be zoomed and scrolled with the mouse.
 *
 * @param {Element|jQuery} elem   The DOM element to decorate.
 * @constructor
 */

function Canvas(elem) {
    this._disableClicks = false; // If true, disable click events

    /** @type {jQuery}.
     *  @protected */
    this.canvas = $(elem);

    this.ctx = this.canvas[0].getContext('2d');
    this.ctx.textBaseline = 'top';

    /** @type {Box|undefined}
     *  @protected */
    this.box = undefined;

    this.canvas
        .start_drag($.proxy(this.onStartDrag, this))
        .in_drag($.proxy(this.onInDrag, this))
        .mousewheel($.proxy(this.onWheel, this))
        .bind('draw', $.proxy(this.onDraw, this))
        .click($.proxy(this.onClick, this))
        .dblclick(
            $.proxy(
                function(e) {this.ifnotDisabled_(e, this.onDblClick)},
                this));

    this.lineHeight = detectFontSize(this.baseFontSize, this.fontName);

   var f = this;
   $('#settings input[name=autoScale]')
      .change(function() { f.setAutoScale(this.checked); f.refresh()});

    $(window).resize($.proxy(this.onResize, this));
}

/** Current scale factor of the canvas
 * @type {number}
 * @private
 */

Canvas.prototype.scale_ = 1.0;

/** Current scrolling position of the canvas, in absolute coordinates.
 * @type {number}
 */
Canvas.prototype.left = 0.0;

/** Current scrolling position of the canvas
 * @type {number}
 */
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

/** Actual height of a line written in baseFontSize */

Canvas.prototype.lineHeight;

/** No need to draw text below this size (in pixels) */

Canvas.prototype.minFontSize = 5;

/**
 * Maximum fontSize (in pixels). After this, we start displaying more lines.
 */
Canvas.prototype.maxFontSize = 15;

/** Default font */

Canvas.prototype.fontName = 'sans';

/** Whether refresh() should set the transformation matrix automatically.
 * This is the default, but might result in lower quality rendering because
 * fonts should be resized appropriately. Also, you might want to disable
 * this if you display more data when zooming in.
 */

Canvas.prototype.autoZoom = true;

/** Whether we need to recompute the layout
 * @private
 */
Canvas.prototype.needLayout_ = true;

/**
 * Register that the layout of the canvas needs to be recomputed, because some
 * data that impacts it has changed.
 */

Canvas.prototype.setNeedLayout = function() {
   this.needLayout_ = true;
};

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
 * @param {Event} e   The draw event.
 * @param {Box} box
 *    The area (absolute coordinates) to refresh.
 *
 * @protected
 */

Canvas.prototype.onDraw = function(e, box) {};


/**
 * Called when the user is clicking on the canvas
 * @param {Event} e   The draw event.
 * @protected
 */

Canvas.prototype.onClick = function(e) {};

/**
 * Called when the user is double-clicking on the canvas
 * @param {Event} e   The draw event.
 * @protected
 */

Canvas.prototype.onDblClick = function(e) {};

/**
 * Called when the user control-clicks in the canvas.
 * @param {Event} e   The draw event.
 * @protected
 */

Canvas.prototype.onCtrlClick = function(e) {};

/**
 * Set the context's transformation matrix based on current scale and scroll.
 */

Canvas.prototype.setTransform = function() {
    this.ctx.setTransform(
        this.scale_, 0, 0,
        this.scale_, -this.scale_ * this.left, -this.scale_ * this.top);
};

/**
 * Clear the canvas area.
 * @param {Box=} box   The area to clear, defaults to whole canvas.
 */

Canvas.prototype.clear = function(box) {
    if (!box) {
        box = new Box(0, 0, this.canvas[0].width, this.canvas[0].height);
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
 * @param {Box=} box   The area to refresh in absolute coordinates,
 *    defaults to whole canvas.
 */

Canvas.prototype.refresh = function(box) {
    this._disableClicks = false;

    this.clear(box);

    try {
        this.ctx.save();

        if (this.needLayout_) {
           this.needLayout_ = false;
           this.box = this.computeBoundingBox();
        }

        if (this.autoScale_ && this.box && this.box.w) {
           this.left = this.box.x;
           this.top = this.box.y;
           this.scale_ = Math.min(
              this.canvas[0].width / this.box.w,
              this.canvas[0].height / this.box.h);
        }

        if (!box) {
           box = this.visibleRegion();
        }

        if (this.autoZoom) {
            this.setTransform();
        }

        this.canvas.trigger('draw', box);
    } finally {
        this.ctx.restore();
    }
};

/**
 * @return {!Box}  The absolute coordinates of the region
 *    currently displayed on screen.
 */

Canvas.prototype.visibleRegion = function() {
   return new Box(this.toAbsX(0),
                  this.toAbsY(0),
                  this.toAbsLength(this.canvas[0].width),
                  this.toAbsLength(this.canvas[0].height));
};

/**
 * Update the settings box to reflect the current settings.
 */

Canvas.prototype.showSettings = function() {
   var r = $('#settings input[name=autoScale]');
   if (this.autoScale_) {
      r.attr('checked', 'on');
   } else {
      r.removeAttr('checked');
   }
};

/**
 * Compute the dimensions of the object to display.
 * @return {Box|undefined}  the bounding box in absolute coordinates. The
 *   returned object might contain extra fields cached by the specific canvas
 *   implementation.
 */

Canvas.prototype.computeBoundingBox = function() {
   return new Box(0, 0, 100, 100);
};

/**
 * Whether the scaling factor should be computed automatically when the
 * canvas is refreshed, to show the whole area.
 * @param {boolean} autoScale   Whether to do auto-scaling.
 *   When active, you should override this.computeBoundingBox as well.
 */

Canvas.prototype.setAutoScale = function(autoScale) {
   if (autoScale != this.autoScale_) {
      this.autoScale_ = autoScale;
      this.showSettings();
   }
};

/**
 * @param {number} length   The length to convert.
 * @return {number}  The same length at zoom 1:1.
 */

Canvas.prototype.toPixelLength = function(length) {
    return length * this.scale_;
};

/**
 * @param {number} length   The length at zoom 1:1.
 * @return {number}  The same length at current zoom level.
 */

Canvas.prototype.toAbsLength = function(length) {
    return length / this.scale_;
};

/**
 * @param {number} xabs   X coordinate at zoom 1:1.
 * @return {number}  The same coordinate at current zoom level.
 */

Canvas.prototype.toPixelX = function(xabs) {
    return (xabs - this.left) * this.scale_;
};

/**
 * @param {number} yabs   Y coordinate at zoom 1:1.
 * @return {number}  The same coordinate at current zoom level.
 */

Canvas.prototype.toPixelY = function(yabs) {
    return (yabs - this.top) * this.scale_;
};

/**
 * @param {number} xpixel   X coordinate at current zoom level.
 * @return {number}  The same coordinate at zoom 1:1.
 */

Canvas.prototype.toAbsX = function(xpixel) {
    return xpixel / this.scale_ + this.left;
};

/**
 * @param {number} ypixel   Y coordinate at current zoom level.
 * @return {number}  The same coordinate at zoom 1:1.
 */

Canvas.prototype.toAbsY = function(ypixel) {
    return ypixel / this.scale_ + this.top;
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
    elem.width = this.canvas.width();
    elem.height = this.canvas.height();
    this.refresh();
};

/**
 * Called when starting a drag operation on the canvas background (to scroll).
 * @param {Event} e    The event.
 * @param {Object} dragdata   See mouse_events.js.
 * @protected
 */

Canvas.prototype.onStartDrag = function(e, dragdata) {
    this.setAutoScale(false);
    dragdata.offset = {left: this.left, top: this.top};
    dragdata.scale_ = 1 / -this.scale_;
    dragdata.weight = 400;  //  Only throwing when in background
};

/**
 * Called during a scroll operation
 * @param {Event} e    The event.
 * @param {Object} dragdata   See mouse_events.js.
 * @protected
 */

Canvas.prototype.onInDrag = function(e, dragdata) {
    this.left = dragdata.offset.left;
    this.top = dragdata.offset.top;
    this.refresh();
};

/**
 * The display attributes for lines and text. This data is typically
 * transmitted by the server, so the attributes should quoted to
 * protected them against compiler minification.
 *
 * typedef {{fontweight:string, fill:string, stroke:string, color:string}}
 * @constructor
 * @dict
 */
function DisplayAttr() {}

/**
 * Display text at the given coordinates, using the given attributes.
 *
 * @param {number}  x    Left coordinate for the text.
 * @param {number}  y    Top coordinate for the text.
 * @param {string} text  The text to display.
 * @param {DisplayAttr} attr   The style.
 * @param {number} lineSpacing  How high a line is (for multi-line text).
 */

Canvas.prototype.text = function(x, y, text, attr, lineSpacing) {
    if (attr && attr['fontweight']) {
        this.ctx.font = attr['fontweight'] + ' ' + this.fontName;
    }
    this.ctx.fillStyle = (attr && attr['color']) || 'black';

    var txt = text.split('\n');
    for (var t in txt) {
        this.ctx.fillText(txt[t], x, y);
        y += (lineSpacing || 12);
    }
};

/** Stroke or fill the current path, with the given attributes.
 * In particular 'attr.fill', 'attr.stroke' and 'attr.shadow'. The
 * latter is a boolean that indicates if a shadow should be added.
 * @param {DisplayAttr} attr   The style.
 */

Canvas.prototype.drawPath = function(attr) {
    var c = this.ctx;
    if (attr['shadow']) {
        c.save();
        c.fillStyle = 'transparent';
        c.shadowOffsetX = 3;
        c.shadowOffsetY = 3;
        c.shadowBlur = 10;
        c.shadowColor = 'rgba(00,00,00,0.4)';
        c.fill();
        c.restore();
    }
    if (attr['fill']) {
        c.fillStyle = attr['fill'] || 'white';
        c.fill();
    }
    if (attr['stroke']) {
        c.strokeStyle = attr['stroke'];
        c.stroke();
    }
};

/**  Make this.ctx.fillStyle partially transparent
 * @param {number} alpha    From 0 to 1, the opacity.
 */

Canvas.prototype.setFillTransparent = function(alpha) {
    var c = this.ctx.fillStyle;
    if (c[0] == '#') {
        this.ctx.fillStyle = 'rgba(' +
            parseInt(c[1] + c[2], 16) + ',' +
            parseInt(c[3] + c[4], 16) + ',' +
            parseInt(c[5] + c[6], 16) + ',' + alpha + ')';
    } //  else c might start with "rgb()" or "rgba()"
};

/** Draw a rectangle with the given attributes
 * @param {number} x      Left coordinate for the rectangle.
 * @param {number} y      Top coordinate for the rectangle.
 * @param {number} width  Width of the rectangle.
 * @param {number} height Height of the rectangle.
 * @param {DisplayAttr} attr  The style.
 */

Canvas.prototype.rect = function(x, y, width, height, attr) {
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.drawPath(attr);
};

/** Draw a rounded rectangle with the given attributes
 * @param {number} x      Left coordinate for the rectangle.
 * @param {number} y      Top coordinate for the rectangle.
 * @param {number} width  Width of the rectangle.
 * @param {number} height Height of the rectangle.
 * @param {DisplayAttr} attr  The style.
 * @param {number=} radius   Radius for the corners.
 */

Canvas.prototype.roundedRect = function(x, y, width, height, attr, radius) {
    var c = this.ctx;
    radius = radius || 6;

    //  Avoid graphical artifacts
    if (height < radius * 2) {
       radius = height / 2;
    }
    c.beginPath();
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
    this.drawPath(attr);
};

/**
 * Update the scale of the canvas, keeping (xoffs, yoffs) in place.
 * @param {number} newScale The new scaling factor.
 * @param {number} xoffs X coordinate, in pixel, to keep in the same location.
 * @param {number} yoffs Y coordinate, in pixel, to keep in the same location.
 */

Canvas.prototype.updateZoom = function(newScale, xoffs, yoffs) {
    var old_scale = this.scale_;
    var offset = this.canvas.offset();
    var xabs = this.toAbsX(xoffs - offset.left);
    var yabs = this.toAbsY(yoffs - offset.top);

    this.scale_ = newScale;

    // Keep the mouse position constant on the screen (ie do not move the
    // pixel we are pointing to).
    // if mx is screen coordinate of mouse, this must remain constant.
    //   mx = (mxabs - oldx) * oldz
    //      = (mxabs - this.left) * this.scale
    //   => this.left = mxabs - (mxabs - oldx) * oldz / this.scale

    this.left = xabs - (xabs - this.left) * old_scale / this.scale_;
    this.top = yabs - (yabs - this.top) * old_scale / this.scale_;
    this.refresh();
};

/**
 * Called when the user uses the mouse wheel to zoom in or out
 * @param {Event}  e       The mouse event.
 * @param {number} delta   The overall delta amount.
 * @param {number} deltaX  The delta amount along X.
 * @param {number} deltaY  The delta amount along Y.
 * @return {boolean}  Whether to keep processing the event.
 * @protected
 */

Canvas.prototype.onWheel = function(e, delta, deltaX, deltaY) {
    if (deltaY > 0) {
       this.setAutoScale(false);
       this.updateZoom(this.scale_ * this.scaleStep, e.clientX, e.clientY);
    } else if (deltaY < 0) {
       this.setAutoScale(false);
       this.updateZoom(this.scale_ / this.scaleStep, e.clientX, e.clientY);
    }
    return false;  //  prevent main window from scrolling
};

/**
 * @param {Event} evt            The event to transmit.
 * @param {function(Event):boolean}  callback   Called if click events
 *    are not disabled.
 * @return {boolean}  Return value of the callback.
 * @private
 */

Canvas.prototype.ifnotDisabled_ = function(evt, callback) {
   var ret = true;
   if (!this._disableClicks) {
       try {
           this._disableClicks = true;
           ret = callback.call(this, evt);
       } finally {
           this._disableClicks = false;
       }
   }
   return ret;
};

/**
 * HSV to RGB color conversion
 *   @param {number}  h    Hue for the color (from 0 to 360 degrees).
 *   @param {number}  s    Saturation (from 0 to 1.0).
 *   @param {number}  v    Value (from 0 to 1.0).
 *   @return {jQuery.Color}  The red, green, blue components.
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
   var r, g, b;

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

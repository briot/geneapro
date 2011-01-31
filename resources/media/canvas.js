/************************************************
 * A resizable and zoomable canvas
 * To use:
 *    $("selector").canvas ({options});
 * Where the list of valid options is described in defaultSettings below
 *
 * The code below does not do any drawing in the canvas, just prepares the
 * context of it. When actual drawing is needed, the signal "draw" is
 * emitted on the canvas. Therefore you also need to bind to that signal
 *     $("selector").canvas ().bind ("draw", do_my_drawing);
 *     function do_my_drawing(event, ctx, box) {...}
 *        # where box is the real-world coordinates for the area that needs
 *        # to be refreshed. The area has already been cleared.
 *
 * The canvas does not use the scale() function, because it would end up
 * drawing fuzzy lines rather then sharp lines when zoomed. Instead, the
 * "draw" callback must take care of converting from absolute coordinates to
 * pixel coordinates as needed, via the
 *      toPixelX()
 *      toPixelY()
 * functions. This is however slightly slower.
 ************************************************/
;

function log () {
   //  print the arguments in the console, if visible
   if (window.console) {
      console.log.apply (null, arguments);
   }
}

function maximize (div) {
  // Maximize div so that is extends to the bottom and right of the browser
  var d = $(div), off=$(div).offset(), win=$(window);
  d.width (win.width() - off.left).height (win.height () - off.top);
}

(function ($) {

var defaultSettings = {
  scaleStep: 1.1,  // Multiplier when zooming
  weight: 200, // 'weight' when drag-and-throwing the background.
               // Higher value means the scroll stops faster
  contextFactory: function (canvas,options) {return canvas.getContext ("2d")},
  onDraw: null, // Called to redraw. 'this' is the Canvas object
  onCtrlClick: null, // Called on control-click
                // If returns true, prevents further clicks in the canvas
}

function ifnotDisabled(evt, callback) {
  // Calls 'callback' if the click events are not disabled for the canvas
  if (!this._disableClicks) {
     this._disableClicks = true;
     if (!callback.apply(this, [evt]))
        this._disableClicks = false;
  }
}

function onResize() {
   //  Changing the attributes on the canvas also sets the coordinate space
   //  We always want a 1 to 1 mapping between canvas coordinates and pixels,
   //  so that text is drawn sharp.
   var elem = this.canvas[0];
   elem.width  = this.canvas.width();
   elem.height = this.canvas.height();
   this.refresh();
}

function Canvas (options, elem) {
   // Create a Canvas object around a given html <canvas>
   this.options = $.extend ({}, defaultSettings, options);
   this.scale   = 1.0;
   this.x       = 0.0;  // top-left corner, absolute coordinates
   this.y       = 0.0;
   this._disableClicks = false; // If true, disable click events

   this.ctx     = this.options.contextFactory (elem, this.options),
   this.ctx.textBaseline = 'top';

   this.canvas  = $(elem);

   this.canvas
      .start_drag ($.proxy (on_start_drag, this))
      .in_drag ($.proxy (on_in_drag, this))
      .wheel ($.proxy (on_wheel, this));
   $(window).resize ($.proxy (onResize, this))

   if (options.onDraw)
      this.canvas.bind ("draw", $.proxy (options.onDraw, this));
   if (options.onCtrlClick)
      this.canvas.ctrl_click ($.proxy
         (function(e) {ifnotDisabled.apply(this, [e, options.onCtrlClick])},
          this));

   onResize.apply(this);
}

Canvas.prototype.refresh = function (box) {
   // Redraw the contents of the canvas
   // 'box' is the area of the canvas that should be refreshed, in pixels.
   // If unspecified, the whole visible area is refreshed.

   if (!box)
      box = {x:0, y:0, w:this.canvas[0].width, h:this.canvas[0].height};

   this._disableClicks = false; //  ??? or in canvas()

   var ctx = this.ctx;
   ctx.save ();
     ctx.clearRect (box.x, box.y, box.w, box.h);
     this.canvas.trigger ("draw", box);
   ctx.restore ();
}

Canvas.prototype.lengthToPixel = function (length) {
   // Convert a real-world length into a pixels length
   return length * this.scale;
}
Canvas.prototype.lengthToAbs = function (length) {
   return length / this.scale;
}

Canvas.prototype.toPixelX = function (xabs) {
   // Convert from absolute to pixel coordinates. Takes into account
   // scrolling and scaling.
   return (xabs - this.x) * this.scale;
}
Canvas.prototype.toPixelY = function (yabs) {
   return (yabs - this.y) * this.scale;
}

Canvas.prototype.toAbsX = function (xpixel) {
   // Convert from pixel to absolute coordinates
   return xpixel / this.scale + this.x;
}
Canvas.prototype.toAbsY = function (ypixel) {
   return ypixel / this.scale + this.y;
}

Canvas.prototype.text = function (x, y, text, attr) {
   // Display 'text' at the pixel coordinates 'x' and 'y'.
   // 'attr' is the style to apply, in particular 'font-weight'
   var c = this.ctx;
   c.save ();
   if (attr["font-weight"])
      c.font = attr["font-weight"] + " " + c.font;
   c.fillStyle = attr.color || "black";
   c.fillText (text, x, y);
   c.restore ();
}

Canvas.prototype.rect = function (x, y, width, height, attr) {
   //  Draw a rectangle at the given pixel-coordinates 'x' and 'y',
   //  and with the given pixel size 'width' and 'height'.
   //  'attr' is the style to apply
   var c = this.ctx;
   c.beginPath ();
   c.rect (x, y, width, height);
   if (attr.fill) {
      c.fillStyle = attr.fill;
      c.fill ();
   }
   if (attr.stroke) {
      c.strokeStyle = attr.stroke;
      c.stroke ();
   }
   c.closePath();
}

function on_start_drag (e, dragdata) {
   dragdata.offset = {left:0, top:0}; // in pixels
   dragdata.canvas = {x:this.x, y:this.y} // private data
   dragdata.weight = this.options.weight;  //  Only throwing when in background
}

function on_in_drag (e, dragdata) {
   // Called when some item in the canvas is dragged.
   // 'this' is the Canvas instance

   this.x = dragdata.canvas.x + this.lengthToAbs(dragdata.offset.left);
   this.y = dragdata.canvas.y + this.lengthToAbs(dragdata.offset.top);
   this.refresh ();
}

function on_wheel (e) {
   var oldz = this.scale,
       c = this.canvas.offset(),
       mx = e.pageX - c.left,
       my = e.pageY - c.top;

   if (e.delta > 0) {
      this.scale *= this.options.scaleStep;
   } else {
      this.scale /= this.options.scaleStep;
   }

   // Keep the mouse position constant on the screen (ie do not move the
   // pixel we are pointing to).
   // if mx is screen coordinate of mouse, this must remain constant.
   // So we want (in real-world coordinates, where "x*" are the coordinates of
   // the left screen border:
   //    mx / z0 + x0 = mx / z1 + x1
   //    => x1 = mx / z0 + xo - mx / z1

   this.x += mx / oldz - mx / this.scale;
   this.y += my / oldz - my / this.scale;
   this.refresh ();
   return false;  // prevent main window from scrolling
}

$.fn.canvas = function (options) {
  return this.each (function() {
     var inst = $.data (this, "Canvas");
     if (!inst) {
        $.data (this, "Canvas", new Canvas (options, this));
     } else {
        inst.refresh();
     }
  });
};

})(jQuery); // map "jQuery" to "$" in the function above

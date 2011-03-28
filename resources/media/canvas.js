/************************************************
 * A resizable and zoomable canvas class.
 *
 * Dependencies
 * ============
 * Requires:  adacore-mouse_events.js
 *
 * Description
 * ===========
 *
 * This module exports the Canvas class, which can be instantiated on its
 * own via a call similar to:
 *    c = new Canvas(options, element);
 *       // element is a DOM object
 *       // for this of valid options, see $.fn.canvas.defaults below
 *
 *    c.init(options, element)
 *       // Initializes C (just like the constructor above) but does not
 *       // create a new instance.
 *
 * The following methods are available:
 *    c.refresh(box=fullscreen);
 *       // force a redraw of the whole canvas
 *       // BOX is the area that should be refreshed, in pixel coordinates.
 *    c.toPixelLength(length);
 *    c.toPixelAbs(length);
 *       // converts a length from pixel to absolute coordinates, depending
 *       // on current zoom level. This ignores any scrolling offset.
 *    c.toPixelX(xbas);
 *    c.toPixelY(yabs);
 *    c.toAbsX(xpixel);
 *    c.toAbsY(ypixel);
 *       // converts from pixel to absolute coordinates and back. This takes
 *       // scrolling and zooming into account.
 *    c.text(x, y, text, attr);
 *       // display some text at the given pixel coordinates. 'attr' can be
 *       // used to specify the style: 'attr.fill', 'attr.font-weight' and
 *       // 'attr.stroke', in particular.
 *    c.drawPath(attr);
 *       // draw the current path set in c.ctx with the given attributes.
 *       // In particular 'attr.fill', 'attr.stroke' and 'attr.shadow'. The
 *       // latter is a boolean that indicates if a shadow should be added.
 *    c.rect(x,y,width,height,attr);
 *       // draw a rectangle at the given pixel coordinates
 *    c.roundedRect(x,y,width,height, radius=6)
 *       // draw a rounded rectangle at the given pixel coordinates
 *
 * The code below does not do any drawing in the canvas, just prepares the
 * context for it. When actual drawing is needed, the signal "draw" is
 * emitted on the canvas. Therefore you also need to bind to that signal
 *
 *     $("selector").canvas ({onDraw:do_my_drawing});
 *     function do_my_drawing(event, box) {  // use this.ctx}
 *        # where box is the real-world coordinates for the area that needs
 *        # to be refreshed. The area has already been cleared.
 *
 * It is left to the user to convert from absolute to pixel coordinates. The
 * canvas does not automatically converts them (for instance by setting the
 * scaling factor on its context), because fonts should not be zoomed but
 * rendered at the appropriate size directly for better rendering. Likewise,
 * lines would end up blurry.
 *
 * Jquery integration
 * ==================
 *
 * For convenience, a jQuery integration is provided, so that you can write:
 *   $("selector").canvas ({options});
 *      This automatically wraps each element in the jQuery set inside a Canvas
 *      instance.
 *   $("selector").canvas.refresh();
 *      Redraws all the canvas.
 *   $.fn.canvas.defaults
 *      Can be used to modify the defaults
 */
;

function log () {
   //  print the arguments in the console, if visible
   if (window.console) {
      console.log(arguments);
   }
}

var Canvas = (function ($) {

function Canvas (options, elem) {
   if (elem)
      this.init(options, elem);
}

Canvas.prototype.init = function(options, elem) {
   this.options = $.extend ({}, $.fn.canvas.defaults, options);
   this.scale   = 1.0;
   this.x       = 0.0;  // top-left corner, absolute coordinates
   this.y       = 0.0;
   this._disableClicks = false; // If true, disable click events

   this.ctx     = elem.getContext("2d");
   this.ctx.textBaseline = 'top';

   this.canvas  = $(elem);

   this.canvas
      .start_drag ($.proxy (on_start_drag, this))
      .in_drag ($.proxy (on_in_drag, this))
      .wheel ($.proxy (on_wheel, this));
   $(window).resize ($.proxy (onResize, this));

   if (options.onDraw)
      this.canvas.bind ("draw", $.proxy (options.onDraw, this));
   if (options.onCtrlClick)
      this.canvas.ctrl_click ($.proxy
         (function(e) {ifnotDisabled.apply(this, [e, options.onCtrlClick])},
          this));
   if (options.onDblClick)
      this.canvas.dblclick($.proxy(
               function(e){ifnotDisabled.apply(this, [e, options.onDblClick])},
               this));

   for (var a in options.actions) {
      elem[a] = $.proxy(options.actions[a], this);
   }

   onResize.apply(this);
}

Canvas.prototype.refresh = function (box) {
   if (!box)
      box = {x:0, y:0, w:this.canvas[0].width, h:this.canvas[0].height};

   this._disableClicks = false; //  ??? or in canvas()

   var ctx = this.ctx;
   ctx.save ();
     ctx.clearRect (box.x, box.y, box.w, box.h);
     this.canvas.trigger ("draw", box);
   ctx.restore ();
}

Canvas.prototype.toPixelLength = function (length) {
   return length * this.scale;
}
Canvas.prototype.toPixelAbs = function (length) {
   return length / this.scale;
}
Canvas.prototype.toPixelX = function (xabs) {
   return (xabs - this.x) * this.scale;
}
Canvas.prototype.toPixelY = function (yabs) {
   return (yabs - this.y) * this.scale;
}
Canvas.prototype.toAbsX = function (xpixel) {
   return xpixel / this.scale + this.x;
}
Canvas.prototype.toAbsY = function (ypixel) {
   return ypixel / this.scale + this.y;
}
Canvas.prototype.text = function (x, y, text, attr) {
   var c = this.ctx;
   if (attr && attr["font-weight"])
      c.font = attr["font-weight"] + " " + c.font;
   c.fillStyle = (attr && attr.color) || "black";
   c.fillText (text, x, y);
}
Canvas.prototype.drawPath = function (attr) {
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
}
Canvas.prototype.rect = function (x, y, width, height, attr) {
   var c = this.ctx;
   c.beginPath ();
   c.rect (x, y, width, height);
   c.closePath();
   this.drawPath (attr);
}

Canvas.prototype.roundedRect = function (x, y, width, height, attr, radius) {
   radius = radius || 6;
   var c = this.ctx;
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

function on_start_drag (e, dragdata) {
   dragdata.offset = {left:0, top:0}; // in pixels
   dragdata.canvas = {x:this.x, y:this.y} // private data
   dragdata.weight = this.options.weight;  //  Only throwing when in background
}

function on_in_drag (e, dragdata) {
   // Called when some item in the canvas is dragged.
   // 'this' is the Canvas instance
   this.x = dragdata.canvas.x - this.toPixelAbs(dragdata.offset.left);
   this.y = dragdata.canvas.y - this.toPixelAbs(dragdata.offset.top);
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
  return this.each(function() {
     var inst = $.data (this, "canvas");
     if (!inst)
        $(this).data ("canvas", new Canvas (options, this));
  });
};

$.fn.canvas.refresh = function() {
   return this.each(function() {
      $.data(this, "canvas").refresh();
   });
}

$.fn.canvas.defaults = {
  scaleStep: 1.1,   // Multiplier when zooming
  weight: 200,      // 'weight' when drag-and-throwing the background.
                    // Higher value means the scrolling stops faster
  onDraw: null,     // Called to redraw. THIS is the Canvas object
                    // You need to convert the coordinates to pixels.
                    //     function doDraw(event, box) {...}
                    // where box is the area to refresh.
                    // doDraw can use "this.ctx" to access drawing context.
  onCtrlClick: null,// Called on control-click
                    // If returns true, prevents further clicks in the canvas
                    //     function callback(event) {...}
  onDblClick: null, // Called on double-click
                    //     function callback(event) {...}
  actions: {},      // "name":function,  for methods to add to the object
                    // When function is called, THIS is the instance of Canvas
}

return Canvas;

})(jQuery); // map "jQuery" to "$" in the function above

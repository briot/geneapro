/** Copyright Emmanuel Briot 2011
 * Makes an <img> scrollable by clicking and dragging the mouse.
 * Also makes it scrollable with the mousewheel */

// requires "mouse_events.js"
// requires "canvas.js"

/**
 * Decorate an image element (replace it with a canvas) so that various
 * effects can be applied to it).
 * @param {Element} img     The element(s) to instrument.
 * @extends {Canvas}
 * @constructor
 */

function DragPane(img) {
   var pane = this;

   var canvas = $('<canvas></canvas>');
   canvas.className = img.className;
   canvas.css({width: '100%', height: '100%'});
   $(img).replaceWith(canvas);
   Canvas.call(this, canvas);  // instrument the canvas

   this.ctx.imageSmoothingEnabled = true;

   this.img = new Image();
   this.img.onload = function() {
      pane.setNeedLayout();  // in case autoScale is active
      pane.onResize();  //  will also refresh
   };
   this.img.src = img.src;  //  load the image
}
inherits(DragPane, Canvas);

/** @inheritDoc */

DragPane.prototype.onDraw = function(event, box) {
   if (this.img) {
      this.ctx.drawImage(this.img, 0, 0);
   }
};

/** @inheritDoc */

DragPane.prototype.computeBoundingBox = function() {
   if (this.img) {
      return new Box(0, 0, this.img.width, this.img.height);
   }
};

/** Change the displayed image (load a new one asynchronously)
 * @param {string}  src    The URL to download from.
 */

DragPane.prototype.setsrc = function(src) {
   this.img.src = src;
};

/** Apply an effect to the image.
 * Setup a temporary canvas that contains the full image (at zoom 1)
 * and pass its data to callback. Callback can then modify the image
 * data. On exit, the data is automatically copied back onto 'this'.
 *
 * @param {function(number,number,ImageData,ImageData=)}  callback
 *    The action to perform on the image data. First parameter is
 *    width, second parameter is height, third is the imageData.
 * @param {boolean=} needCopy
 *    If true, the callback is passed a fourth parameter origData,
 *    which is a copy of the data. This can be used if the effect
 *    needs to modify data (which it always will) and yet have access
 *    to the original data.
 */

DragPane.prototype.applyEffect = function(callback, needCopy) {
  var pane = this;
  var w = this.img.width;
  var h = this.img.height;
  var c = document.createElement('canvas');

  $(c).width(w).height(h);
  c.width = w;
  c.height = h;

  var ctx = c.getContext('2d');
  ctx.drawImage(this.img, 0, 0);

  var da = ctx.getImageData(0, 0, w, h);

  if (needCopy) {
     callback(w, h, da.data, ctx.getImageData(0, 0, w, h).data);
  } else {
     callback(w, h, da.data);
  }

  ctx.putImageData(da, 0, 0, 0, 0, w, h);
  this.img.src = c.toDataURL();  // after refreshes
};

/** Transform the image into a grayscale */

DragPane.prototype.grayscale = function() {
   this.applyEffect(function(w, h, d) {
      var imax = (h * 4) * w + w * 4; // index in data is (y*4)*w + x*4
      for (var i = 0; i < imax; i += 4) {
         d[i] = d[i + 1] = d[i + 2] =
            d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      }
   });
};

/** Invert the image */

DragPane.prototype.invert = function() {
   this.applyEffect(function(w, h, d) {
      var imax = (h * 4) * w + w * 4; // index in data is (y*4)*w + x*4
      for (var i = 0; i < imax; i += 4) {
         d[i] = 255 - d[i];
         d[i + 1] = 255 - d[i + 1];
         d[i + 2] = 255 - d[i + 2];
      }
   });
};

/** Detect edges */

DragPane.prototype.edgeDetect = function() {
   this.applyEffect(function(w, h, d, c) {
         // 'c' is a copy of the old image data, 'd' is the new image data
         // From Pixastic library
        var w4 = w * 4;
        var pixel = w4 + 4; // Start at (1,1)
        var hm1 = h - 1;
        var wm1 = w - 1;
        for (var y = 1; y < hm1; ++y) {
           // Prepare initial cached values for current row
           var centerRow = pixel - 4;
           var priorRow = centerRow - w4;
           var nextRow = centerRow + w4;

           var r1 = - c[priorRow] - c[centerRow] - c[nextRow];
           var g1 = - c[++priorRow] - c[++centerRow] - c[++nextRow];
           var b1 = - c[++priorRow] - c[++centerRow] - c[++nextRow];

           var rp = c[priorRow += 2];
           var gp = c[++priorRow];
           var bp = c[++priorRow];

           var rc = c[centerRow += 2];
           var gc = c[++centerRow];
           var bc = c[++centerRow];

           var rn = c[nextRow += 2];
           var gn = c[++nextRow];
           var bn = c[++nextRow];

           var r2 = - rp - rc - rn;
           var g2 = - gp - gc - gn;
           var b2 = - bp - bc - bn;

           // Main convolution loop
           for (var x = 1; x < wm1; ++x) {
               centerRow = pixel + 4;
               priorRow = centerRow - w4;
               nextRow = centerRow + w4;

               var r = 127 + r1 - rp - (rc * -8) - rn,
                   g = 127 + g1 - gp - (gc * -8) - gn,
                   b = 127 + b1 - bp - (bc * -8) - bn;

               r1 = r2;
               g1 = g2;
               b1 = b2;

               rp = c[priorRow];
               gp = c[++priorRow];
               bp = c[++priorRow];

               rc = c[centerRow];
               gc = c[++centerRow];
               bc = c[++centerRow];

               rn = c[nextRow];
               gn = c[++nextRow];
               bn = c[++nextRow];

               r += (r2 = - rp - rc - rn);
               g += (g2 = - gp - gc - gn);
               b += (b2 = - bp - bc - bn);

               if (r > 255) r = 255;
               if (g > 255) g = 255;
               if (b > 255) b = 255;
               if (r < 0) r = 0;
               if (g < 0) g = 0;
               if (b < 0) b = 0;

               d[pixel] = r;
               d[++pixel] = g;
               d[++pixel] = b;

               pixel += 2;
           }
           pixel += 8;
       }
   }, true);
};

/** Clean up noise in the image */

DragPane.prototype.removeNoise = function() {
   this.applyEffect(function(w, h, d, c) {
       var w4 = w * 4;
       var y = h;
       do {
          var offsetY = (y - 1) * w4;
          var nextY = (y == h) ? y - 1 : y;
          var prevY = (y == 1) ? 0 : y - 2;
          var offsetYPrev = prevY * w * 4;
          var offsetYNext = nextY * w * 4;
          var x = w;

          do {
             var offset = offsetY + (x * 4 - 4);

             var offsetPrev = offsetYPrev + ((x == 1) ? 0 : x - 2) * 4;
             var offsetNext = offsetYNext + ((x == w) ? x - 1 : x) * 4;

             var minR, maxR, minG, maxG, minB, maxB;

             minR = maxR = d[offsetPrev];
             var r1 = d[offset - 4], r2 = d[offset + 4], r3 = d[offsetNext];
             if (r1 < minR) minR = r1;
             if (r2 < minR) minR = r2;
             if (r3 < minR) minR = r3;
             if (r1 > maxR) maxR = r1;
             if (r2 > maxR) maxR = r2;
             if (r3 > maxR) maxR = r3;

             minG = maxG = d[offsetPrev + 1];
             var g1 = d[offset - 3], g2 = d[offset + 5], g3 = d[offsetNext + 1];
             if (g1 < minG) minG = g1;
             if (g2 < minG) minG = g2;
             if (g3 < minG) minG = g3;
             if (g1 > maxG) maxG = g1;
             if (g2 > maxG) maxG = g2;
             if (g3 > maxG) maxG = g3;

             minB = maxB = d[offsetPrev + 2];
             var b1 = d[offset - 2], b2 = d[offset + 6], b3 = d[offsetNext + 2];
             if (b1 < minB) minB = b1;
             if (b2 < minB) minB = b2;
             if (b3 < minB) minB = b3;
             if (b1 > maxB) maxB = b1;
             if (b2 > maxB) maxB = b2;
             if (b3 > maxB) maxB = b3;

             if (d[offset] > maxR) {
                     d[offset] = maxR;
             } else if (d[offset] < minR) {
                     d[offset] = minR;
             }
             if (d[offset + 1] > maxG) {
                     d[offset + 1] = maxG;
            } else if (d[offset + 1] < minG) {
                     d[offset + 1] = minG;
             }
             if (d[offset + 2] > maxB) {
                     d[offset + 2] = maxB;
             } else if (d[offset + 2] < minB) {
                     d[offset + 2] = minB;
             }

          } while (--x);
       } while (--y);
   });
};

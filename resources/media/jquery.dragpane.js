/* Copyright Emmanuel Briot 2011 */
/* Makes an <img> scrollable by clicking and dragging the mouse.
 * Also makes it scrollable with the mousewheel
/* Requires mouse_events.js and canvas.js*/

;(function($) {

function DragPane(img, options) {
  var pane = this;
  pane.canvas = $("<canvas></canvas>");
  pane.canvas[0].className = img.className;

  pane.img = new Image();
  pane.url = img.src;      // original image

  $(img).replaceWith(pane.canvas);

  this.img.onload = function() {
      pane.img.onload = null;
      pane.canvas.canvas(
         {weight:100,
          onDraw:function(evt,box) {pane._draw(this)},
         });
  };

  pane.img.src = pane.url; // load the original image
}

DragPane.prototype._draw = function(canvas) {
  // "canvas" is an instance of Canvas
  var t = canvas.ctx;
  t.save();
     t.scale(canvas.scale, canvas.scale);
     t.drawImage(this.img, -canvas.x, -canvas.y);
  t.restore();
}

DragPane.prototype.setsrc = function(src) {
  // Change the image that is displayed
  var pane = this;
  this.url = src;
  this.img.onload = function() {
     pane.img.onload = null;
     $(pane.canvas).canvas("refresh");  // Refresh the canvas
  }
  this.img.src = src;
}

DragPane.prototype.applyEffect = function(callback, needCopy) {
   // Setup a temporary canvas that contains the full image (at zoom 1)
   // and pass its data to callback. Callback can then modify the image
   // data. On exit, the data is automatically copied back onto THIS
   //      callback(width, height, data)
   // If needCopy is true, a fourth parameter is added (another copy of
   //    data, which will be ignored on return).

  var pane = this,
      w = pane.img.width,
      h = pane.img.height,
      c = document.createElement("canvas");
  
  $(c).width(w).height(h);
  c.width = w;
  c.height = h;

  var ctx = c.getContext("2d");
  ctx.drawImage(pane.img, 0, 0);

  var da = ctx.getImageData(0,0,w,h),
      d = da.data;

  if (needCopy) {
     callback(w, h, d, ctx.getImageData(0,0,w,h).data);
  } else {
     callback(w, h, d);
  }

  ctx.putImageData(da, 0, 0, 0, 0, w, h);

  // Replace the new image with the tranformed data, so that when scrolling
  // and zooming we do not reset the image

  pane.img.onload = function() {
     this.onload = null;
      $(pane.canvas).canvas("refresh");  //  Force a refresh
  }
  pane.img.src = c.toDataURL();
}

DragPane.prototype.grayscale = function() {
   this.applyEffect(function(w,h,d) {
      var imax = (h*4) * w + w * 4; // index in data is (y*4)*w + x*4
      for (var i=0; i<imax; i+=4) {
         d[i] = d[i + 1] = d[i + 2] =
            d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      }
   });
}

DragPane.prototype.invert = function() {
   this.applyEffect(function(w,h,d) {
      var imax = (h*4) * w + w * 4; // index in data is (y*4)*w + x*4
      for (var i=0; i<imax; i+=4) {
         d[i] = 255 - d[i];
         d[i+1] = 255 - d[i+1];
         d[i+2] = 255 - d[i+2];
      }
   });
}

DragPane.prototype.edgeDetect = function() {
   this.applyEffect(function(w,h,d,c) {
         // "c" is a copy of the old image data, "d" is the new image data
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

               rp = c[  priorRow];
               gp = c[++priorRow];
               bp = c[++priorRow];

               rc = c[  centerRow];
               gc = c[++centerRow];
               bc = c[++centerRow];

               rn = c[  nextRow];
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

               pixel+=2;
           }
           pixel += 8;
       }
   }, true);
}

DragPane.prototype.removeNoise = function() {
   this.applyEffect(function(w,h,d,c) {
       var w4 = w*4;
       var y = h;
       do {
          var offsetY = (y-1)*w4;
          var nextY = (y == h) ? y - 1 : y;
          var prevY = (y == 1) ? 0 : y-2;
          var offsetYPrev = prevY*w*4;
          var offsetYNext = nextY*w*4;
          var x = w;

          do {
             var offset = offsetY + (x*4-4);

             var offsetPrev = offsetYPrev + ((x == 1) ? 0 : x-2) * 4;
             var offsetNext = offsetYNext + ((x == w) ? x-1 : x) * 4;

             var minR, maxR, minG, maxG, minB, maxB;

             minR = maxR = d[offsetPrev];
             var r1 = d[offset-4], r2 = d[offset+4], r3 = d[offsetNext];
             if (r1 < minR) minR = r1;
             if (r2 < minR) minR = r2;
             if (r3 < minR) minR = r3;
             if (r1 > maxR) maxR = r1;
             if (r2 > maxR) maxR = r2;
             if (r3 > maxR) maxR = r3;

             minG = maxG = d[offsetPrev+1];
             var g1 = d[offset-3], g2 = d[offset+5], g3 = d[offsetNext+1];
             if (g1 < minG) minG = g1;
             if (g2 < minG) minG = g2;
             if (g3 < minG) minG = g3;
             if (g1 > maxG) maxG = g1;
             if (g2 > maxG) maxG = g2;
             if (g3 > maxG) maxG = g3;

             minB = maxB = d[offsetPrev+2];
             var b1 = d[offset-2], b2 = d[offset+6], b3 = d[offsetNext+2];
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
             if (d[offset+1] > maxG) {
                     d[offset+1] = maxG;
            } else if (d[offset+1] < minG) {
                     d[offset+1] = minG;
             }
             if (d[offset+2] > maxB) {
                     d[offset+2] = maxB;
             } else if (d[offset+2] < minB) {
                     d[offset+2] = minB;
             }

          } while (--x);
       } while (--y);
   });
}

$.fn.dragPane = function(arg){
   var args = arguments;
   return this.each(function() {
      var inst = $(this).data("DragPane");

      if (typeof arg === "object" || !arg) {
         if (!inst) {
            pane = new DragPane(this, args);
            pane.canvas.data("DragPane", pane);
         }
      } else if (inst[arg]) {
         inst[arg].apply(inst, Array.prototype.slice.call(args, 1));
      } else {
         $.error("Method " + arg + " does not exist");
      }
   });
}

})(jQuery);



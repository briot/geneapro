// Needs the variable "pedigree_data_url" to be defined
var boxWidth = 300;
var horizPadding = 0;
var boxHeight = 35;
var vertPadding = 2;    //  vertical padding at last gen
var showUnknown = false; //  whether to draw a box when parent is unknown
var ratio = 0.75;   //  size ratio for height from generation n to n+1
var wratio = 0.75;  //  size ratio for width from generation n to n+1
var baseFontSize = "16"; // pixels
var maxFontSize = 16; //  maximum font size
var minFont = 5;    // No need to draw text below this
var scaleStep = 1.1; // Multiply by this when zooming
var tops=null;

stylesheet = "rect {filter:url(#shadow)} rect.selected {fill:#CCC}";

function onMouseOver (evt) {
  var box = evt.target;
  box.setAttribute ('oldclass', box.getAttribute ('class'));
  box.setAttribute ("class", "selected");
}
function onMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('class', box.getAttribute ('oldclass'));
}
function onClick (evt) {
  var box = evt.target;
  if (box.getAttribute ("sosa") != 1) {
     var num = box.getAttribute ("sosa");
     var id = (num < 0) ? data.children[-1 - num].id : data.sosa[num].id;
     var startX = (data.children ? boxWidth + horizPadding : 0) + 1;
     var delay = 200;
     $(box.parentNode).animate ({'svg-x':startX, 'svg-y':tops[0]}, delay);
     setTimeout (function() {getPedigree ({id:id});return false}, delay);
  }
}
function onTxtMouseOver (evt) {
  var box = evt.target;
  box.setAttribute ('oldstroke', box.getAttribute ('stroke'));
  box.setAttribute ('stroke', '#888');
  box.setAttribute ('stroke-width', '1');
}
function onTxtMouseOut (evt) {
  var box = evt.target;
  box.setAttribute ('stroke', box.getAttribute ('oldstroke'));
  box.setAttribute ('stroke-width', '0');
};

function maximize (div) {
  // Maximize div so that is extends to the bottom and right of the browser
  var d = $(div), off=$(div).offset(), win=$(window);
  d.width (win.width() - off.left).height (win.height () - off.top);
};

function Canvas (selector) {
   //  We do not use setTransform for zooming and scrolling, but manage it
   //  ourselves instead: while zooming with the canvas builtins might be
   //  faster in some cases, it might result in blurry lines, which we want
   //  to avoid.

   var elem = $(selector), canvas=this;
   this.canvas = elem[0];
   this.ctx = this.canvas.getContext ('2d');

   maximize (this.canvas);
   this.canvas.width  = elem.width ();
   this.canvas.height = elem.height ();

   this.baseFont = baseFontSize + "px sans";
   this.ctx.font = this.baseFont;
   this.ctx.textBaseline = 'top';
   this.lineHeight = $.detectFontSize (baseFontSize, "sans");

   this.scale   = 1;
   this.scrollx = 0;  //  the coordinates, in pixels, of the absolute point
   this.scrolly = 0;  //  (0, 0)

   elem.mousewheel (function (event,delta) {
     //  The point we clicked on (in the canvas space) should remain at the
     //  same place on the screen, so that we zoom towards that point. Thus
     //  this is the only place that remains motionless while zooming.

     var position = $(this).offset (),
         xpixels = Math.round (event.pageX - position.left),
         ypixels = Math.round (event.pageY - position.top),
         xabs = canvas.toAbsX (xpixels),
         yabs = canvas.toAbsY (ypixels);

     console.log ("scale="+canvas.scale
                  + " scroll=" + [canvas.scrollx, canvas.scrolly]
                  + " pixels=" + [xpixels, ypixels]
                  + " abs=" + [xabs, yabs]);

     if (delta > 0)
        canvas.scale *= scaleStep;
     else
        canvas.scale /= scaleStep;

     canvas.scrollx = Math.round (xpixels - xabs / canvas.scale);
     canvas.scrolly = Math.round (ypixels - yabs / canvas.scale);

     console.log ("   => scale="+canvas.scale
                  + " scroll=" + [canvas.scrollx, canvas.scrolly]
                  + " pixels=" + [xpixels, ypixels]
                  + " abs=" + [canvas.toAbsX (xpixels),
                               canvas.toAbsY (ypixels)]);
     doDraw (canvas);
  });

   elem.mousedown (function (event) {
      if (event.which == 1) {
         var _startx = event.screenX, _starty = event.screenY,
             _sx = canvas.scrollx, _sy = canvas.scrolly;
         $(this).mousemove (function (event) {
            canvas.scrollx = _sx - _startx + event.screenX;
            canvas.scrolly = _sy - _starty + event.screenY;
            //canvas.ctx.setTransform (canvas.scale, 0, 0, canvas.scale,
            //                         canvas.scrollx, canvas.scrolly);
            doDraw (canvas);
         }).mouse;
      }
   }).mouseup (function (event) {
      $(this).unbind ('mousemove');
   });
}
Canvas.prototype.toAbsX = function (xpixel) {
   // Convert the pixel coordinate XPIXEL to absolute coordinates
   return ((xpixel - this.scrollx) * this.scale);
}
Canvas.prototype.toAbsY = function (ypixel) {
   // Convert the pixel coordinate YPIXEL to absolute coordinates
   return ((ypixel - this.scrolly) * this.scale);
}
Canvas.prototype.toPixelX = function (xabs) {
   // Convert the absolute coordinate XABS into pixels coordinates
   return (xabs / this.scale + this.scrollx);
}
Canvas.prototype.toPixelY = function (yabs) {
   // Convert the absolute coordinate YABS into pixels coordinates
   return (yabs / this.scale + this.scrolly);
}
Canvas.prototype.clear = function () {
   var c = this.ctx;
   //c.save ();
   //c.setTransform (1, 0, 0, 1, 0, 0);
   c.clearRect (0, 0, this.canvas.width, this.canvas.height);
   //c.restore ();
}
Canvas.prototype.rect = function (x, y, width, height, attr) {
   // Draw a rect with the attributes given in attr
   // (x,y,width,height) are specified in pixels, so zooming and scrolling must
   // have been applied
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
};
Canvas.prototype.text = function (x, y, text, attr) {
   var c = this.ctx;
   c.save ();
   if (attr["font-weight"])
      c.font = attr["font-weight"] + " " + c.font;
   c.fillStyle = attr.color || "black";
   c.fillText (text, x, y);
   c.restore ();
};
Canvas.prototype.drawBox = function (person, x, y, width, height, lines) {
   // (x,y,width,height) are specified in pixels, so zooming and scrolling must
   // have been applied
   if (person) {
     var attr = data.styles [person.y];
     this.rect (x, y, width, height, attr);

     if (height >= minFont && lines >= 1) {
        var c = this.ctx,
            lh = this.lineHeight,
            font = Math.round (Math.min(maxFontSize,height)) + "px sans";
        c.save ();
        c.clip ();
        c.font = font;
        this.text (x + 1, y, person.surn + " " + person.givn, attr);

        if (lines >= 2) {
           c.font = "bold " + font;
           var birth = event_to_string (person.b),
               death = event_to_string (person.d),
               birthp = person.b ? person.b[1] || "" : "",
               deathp = person.d ? person.d[1] || "" : "";
           if (lines >=2) c.fillText ("b:", x + 1, y + 2 * lh);
           if (lines >=4) c.fillText ("d:", x + 1, y + 4 * lh);

           c.font = "italic " + font;
           if (lines >= 2 && birth)  c.fillText (birth,  x + lh, y + lh);
           if (lines >= 3 && birthp) c.fillText (birthp, x + lh, y + 2 * lh);
           if (lines >= 4 && death)  c.fillText (death,  x + lh, y + 3 * lh);
           if (lines >= 5 && deathp) c.fillText (deathp, x + lh, y + 4 * lh);
        }
        c.restore (); // unset clipping mask and font
     }
    } else if (showUnknown) {
      this.rect (x, y, width, height, {fill:"white", stroke:"black"});
  }
};

function drawSOSA() {
  var canvas = new Canvas('#pedigreeSVG');
  doDraw (canvas);
};

function doDraw (canvas) {
   var d = data,
       maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
       totalBoxes = Math.pow (2,d.generations) - 1, // geometrical summation
       tops = new Array(totalBoxes), //  Pixel coordinates
       boxheights = new Array (d.generations), //[height, lines, wscale]
       maxLines = 1,  //  name, birth date and place, death date and place
       lh       = canvas.lineHeight;

   canvas.clear ();

   //  Compute display data for all boxes.
   //  Start with the last generation first: the height of boxes depends on the
   //  generation number. Depending on this height, we compute how much
   //  information should be displayed in the boxes. We display at most five
   //  lines of info (name, birth date and place, death date and place), so
   //  we round up as needed. And we want at least 1 pixel displayed.
   //  We then compute the scaling to display that many lines. For instance,
   //  if we wanted to display only one line (the minimum), say 10px, but only
   //  have 1px max, the scaling is 1/10. This scaling will also be applied to
   //  the width of the box. We do not compute the scaling based on the
   //  maximum number of lines (5), since otherwise the box would become too
   //  narrow, and the text unreadable even for early generations.
   //  The padding between the boxes is only dependent on the generation.

   var lastgen = d.generations - 1,
       genscale = Math.pow (ratio, lastgen) * canvas.scale,
       wscale   = Math.pow (wratio, lastgen) * canvas.scale,
       spacing  = (boxHeight + vertPadding) * genscale;

   boxheights [lastgen] = [boxHeight * genscale, 1, wscale];

   // Compute the positions for the last generation

   var y = canvas.toPixelY (0);
   for (var index = totalBoxes - maxBoxes; index < totalBoxes; index++) {
      tops[index] = y;
      y += spacing;
   }

   index = totalBoxes - maxBoxes - 1;

   for (var gen = lastgen - 1; gen >= 0; gen --) {
      genscale  = Math.pow (ratio, gen) * canvas.scale;
      wscale   = Math.pow (wratio, gen) * canvas.scale;
      var height = boxHeight * genscale;

      boxheights [gen] = [height, 1, wscale];

      //  Compute positions for boxes in this generation
      var lastIndex = index - Math.pow (2, gen);
      for (; index > lastIndex; index--) {
         tops[index] = (tops [2*index+1]
                        + tops[2*index + 2] + boxheights[gen+1][0]
                        - height) / 2;
      }
   }

   console.log (d.sosa[5].givn + " tops[4]=" + tops[4]
               + " height=" + boxheights[2][0]
               + " abs="    + canvas.toAbsY (tops[4])
               + " absHeight=" + (boxheights[2][0] / canvas.scale));

   var startX = canvas.toPixelX (d.children ? boxWidth + horizPadding + 10 : 0),
       x = startX;
   index = 0;
   for (var gen = 0; gen < d.generations; gen++) {
      var w = boxWidth * boxheights[gen][2],
          h = boxheights [gen][0],
          x2 = x + w + horizPadding * boxheights[gen][2],
          x3 = x + w * 0.9;

      // basic clipping (no one from this generation is visible)
      if (x > canvas.canvas.width || x + w < 0) {
         index += Math.pow (2, gen);

      } else {
         for (var box = Math.pow (2, gen); box >= 1; box--) {
            var sosa = index + 1;

            // basic clipping
            if (tops[index] > canvas.canvas.height || tops[index] + h < 0) {
            } else {
               if (gen < d.generations - 1) {
                  canvas.ctx.strokeStyle = "black";
                  if (showUnknown || d.sosa [2 * sosa]) {
                     var y1 = tops[2 * index + 1] + boxheights[gen+1][0] / 2;
                     canvas.ctx.beginPath ();
                     canvas.ctx.moveTo (x2, y1);
                     canvas.ctx.lineTo (x3, y1);
                     canvas.ctx.lineTo (x3, tops[index]);
                     canvas.ctx.stroke ();
                  }
                  if (showUnknown || d.sosa [2 * sosa + 1]) {
                     var y2 = tops[2 * index + 2] + boxheights[gen+1][0] / 2;
                     canvas.ctx.beginPath ();
                     canvas.ctx.moveTo (x2, y2);
                     canvas.ctx.lineTo (x3, y2);
                     canvas.ctx.lineTo (x3, tops[index] + h);
                     canvas.ctx.stroke ();
                  }

                  if (h > minFont
                      && gen < d.generations - 1
                      && d.marriage[2 * index + 2]) {

                    var mar = event_to_string (d.marriage [2 * index + 2]);
                    canvas.ctx.save ();
                    canvas.ctx.font = (h * ratio) + "px sans";
                    canvas.ctx.textBaseline = 'middle';
                    canvas.text (x2 + 3, tops[index] + h/2, mar, {stroke:"black"});
                    canvas.ctx.restore ();
                  }
               }
               canvas.drawBox (d.sosa [sosa], x, tops[index], w, h, 1);
            }
            index ++;
         }
      }

      x = x2;
   }

   // draw children
   if (d.children) {
      var space = 20 * canvas.scale,
          childHeight = canvas.scale * (space + boxHeight);
          childrenHeight = d.children.length * childHeight - space,
          halfHeight = canvas.scale * boxHeight / 2;
          //  center around decujus
          y = tops[0] + halfHeight - childrenHeight / 2;

      var x  = canvas.toPixelX (0),
          x2 = x + canvas.scale * boxWidth,
          x3 = (startX + x2) / 2;

      canvas.ctx.beginPath ();
      canvas.ctx.moveTo (startX, tops[0] + halfHeight);
      canvas.ctx.lineTo (x3, tops[0] + halfHeight);
      canvas.ctx.strokeStyle = "black";
      canvas.ctx.stroke ();

      for (var c=0, len=d.children.length; c < len; c++) {
         var y2 = tops[2 * index + 2] + halfHeight;
         canvas.ctx.beginPath ();
         canvas.ctx.moveTo (x2, y + halfHeight);
         canvas.ctx.lineTo (x3, y + halfHeight);
         canvas.ctx.lineTo (x3, tops[0] + halfHeight);
         canvas.ctx.strokeStyle = "black";
         canvas.ctx.stroke ();

         canvas.drawBox (d.children [c], x, y,
                   boxWidth * canvas.scale, 2 * halfHeight, 5);
         y += childHeight;
      }
   }
}

// Needs the variable "pedigree_data_url" to be defined
var boxWidth = 300;
var horizPadding = 10;
var boxHeight = 40;
var vertPadding = 2;    //  vertical padding at last gen
var showUnknown = false; //  whether to draw a box when parent is unknown
var ratio = 0.75;   //  size ratio for height from generation n to n+1
var wratio = 0.75;  //  size ratio for width from generation n to n+1
var baseFontSize = "16"; // pixels
var maxFontSize = 16; //  maximum font size
var minFont = 5;    // No need to draw text below this size
var fontName = "sans"; // "Times New Roman";

/*** All boxes have the same size and display birth and death info
ratio = 1.0;
wratio = 1.0;
boxWidth = 200;
boxHeight = 90;
vertPadding = 20;
horizPadding = 20;
maxFontSize = 14;
***/

function drawBox (canvas, c, person, x, y, width, height, gen) {
   // (x,y,width,height) are specified in pixels, so zooming and scrolling must
   // have been applied
   if (person) {
     var attr = data.styles [person.y],
         lh = canvas.lineHeight[gen],
         lines = canvas.lines[gen];
     attr.shadow = true; // force shadow
     canvas.roundedRect (x, y, width, height, attr);

     if (lh >= minFont && lines >= 1) {
        var font = lh + "px " + fontName;
        c.save ();
        c.clip ();
        c.translate(x, y);
        c.font = font;
        canvas.text (1, 0, person.surn + " " + person.givn, attr);

        if (lines >= 2 && lines < 5) {
           var birth = event_to_string (person.b),
               death = event_to_string (person.d);
           c.fillText (birth + " - " + death, 1, lh);

        } else if (lines > 2) {
           var birth = event_to_string (person.b),
               death = event_to_string (person.d),
               birthp = person.b ? person.b[1] || "" : "",
               deathp = person.d ? person.d[1] || "" : "";
           if (lines >=2) c.fillText ("b:", 1, lh);
           if (lines >=4) c.fillText ("d:", 1, 3 * lh);

           c.font = "italic " + font;
           if (lines >= 2 && birth)  c.fillText (birth,  lh, lh);
           if (lines >= 3 && birthp) c.fillText (birthp, lh, 2 * lh);
           if (lines >= 4 && death)  c.fillText (death,  lh, 3 * lh);
           if (lines >= 5 && deathp) c.fillText (deathp, lh, 4 * lh);
        }
        c.restore (); // unset clipping mask and font
     }
    } else if (showUnknown) {
      canvas.roundedRect (x, y, width, height, {fill:"white", stroke:"black"});
  }
};

function drawSOSA() {
   var opt = {
      lineHeight: $.detectFontSize (baseFontSize, fontName),
      onDraw: doDraw,
      onCtrlClick: onCtrlClick,
   };
   $("#pedigreeSVG").canvas(opt);
};

function onCtrlClick(evt) {
   var canvas = this,
       off = $(this.canvas).offset(),
       mx = evt.pageX - off.left,
       my = evt.pageY - off.top,
       selected = null;

   forEachBox (canvas,
         function(indiv, x, y, w, h, gen, sosa) {
            if (x <= mx && mx <= x + w && y <= my && my <= y + h) {
               selected = indiv;
               return true;
            }
         });

   if (selected) {
      getPedigree (selected);
      return true;
   }
}

function forEachBox(canvas, callback, box) {
   // for each box, calls 'callback' (indiv, x, y, w, h, gen, sosa)
   // 'box' can be specified and indicates the pixels coordinates of the
   // region we want to traverse (default is all canvas).
   // Traversing stops when 'callback' returns true.
   // 'sosa' parameter will be negative for children of the decujus.

   var boxheights = canvas.boxheights,
       tops = canvas.tops,
       d = data,
       baseY = canvas.toPixelY (0),
       startX = canvas.toPixelX (d.children ? boxWidth+horizPadding+10 : 0),
       index = 0,
       x = startX;

   if (!boxheights) {
      return;
   }

   for (var gen = 0; gen < d.generations; gen++) {
      var w = boxWidth * boxheights[gen][2],
          h = boxheights [gen][0],
          x2 = x + w + horizPadding * boxheights[gen][2];

      if (box && (x > box.w || x + w < box.x)) { // clipping generation
         index += Math.pow (2, gen);

      } else {
         for (var b = Math.pow (2, gen); b >= 1; b--) {
            var sosa = index + 1, ti = tops[index] + baseY;

            if (!box || (ti < box.h && ti + h > box.y)) { // clipping
               if (callback (d.sosa[sosa], x, ti, w, h, gen, sosa)) {
                  gen = 99999;
                  break;
               }
            }
            index ++;
         }
      }

      x = x2;
   }

   if (gen != 99999 && d.children) {
      var space = 20 * canvas.scale,
          childHeight = canvas.scale * (space + boxHeight),
          halfHeight = canvas.scale * boxHeight / 2,
          childrenHeight = d.children.length * childHeight - space,
          x = canvas.toPixelX (0),
          y = baseY + tops[0] + halfHeight - childrenHeight / 2;

      for (var c=0, len=d.children.length; c < len; c++) {
         if (callback (d.children[c], x, y,
                       boxWidth * canvas.scale, 2 * halfHeight, gen, -c))
            break;
         y += childHeight;
      }
   }
}


function computeBoxPositions (canvas) {
   //  Compute display data for all boxes, given the number of generations
   //  to display. This is only recomputed when the number of generations
   //  has changed.
   //  Sets 'canvas.boxheights', 'canvas.tops' and 'canvas.__gens'.
   //
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

   var d = data;

   if (canvas.__gens == d.generations
       && canvas.__scale == canvas.scale)
      return; // nothing to do

   canvas.boxheights = new Array (d.generations); //[height, lines, wscale]
   canvas.tops = new Array(totalBoxes); //  Pixel coordinates
   canvas.mariageHeight = new Array (d.generations);
   canvas.lines = new Array (d.generations); // number of lines at each gen
   canvas.lineHeight = new Array (d.generations); // font size at each gen
   canvas.__gens = d.generations;
   canvas.__scale = canvas.scale;

   var lastgen = d.generations - 1,
       maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
       totalBoxes = Math.pow (2,d.generations) - 1, // geometrical summation
       genscale = Math.pow (ratio, lastgen),
       wscale   = Math.pow (wratio, lastgen) * canvas.scale,
       spacing  = (boxHeight + vertPadding) * genscale; // at scale 1.0

   canvas.boxheights [lastgen] =
      [boxHeight * genscale * canvas.scale, 1, wscale];
   canvas.mariageHeight [lastgen] = 0;  // Can't display marriage for last

   // Compute spacing between boxes at the last generation. We try to make the
   // tree nicer by using the whole canvas height, at least (in particular
   // useful when displaying few generations.

   var canvas_height = canvas.canvas[0].height, margin = 30;
   if ((totalBoxes - maxBoxes) * spacing < canvas_height - margin) {
      spacing = (canvas_height - margin) / (totalBoxes - maxBoxes);
   }

   // Start at last generation

   var y = 0;
   spacing = spacing * canvas.scale;  //  at current scale, for last generation
   for (var index = totalBoxes - maxBoxes; index < totalBoxes; index++) {
      canvas.tops[index] = y;
      y += spacing;
   }

   canvas.lineHeight[lastgen] = Math.min(
         maxFontSize, canvas.options.lineHeight * genscale * canvas.scale);
   canvas.lines[lastgen] =
      boxHeight * genscale * canvas.scale / canvas.lineHeight[lastgen];
   /*log ("gen=", lastgen, " lineHeight=", canvas.lineHeight[lastgen],
         " lines=", canvas.lines[lastgen]);*/

   index = totalBoxes - maxBoxes - 1;

   for (var gen = lastgen - 1; gen >= 0; gen --) {
      genscale  = Math.pow (ratio, gen) * canvas.scale;
      wscale   = Math.pow (wratio, gen) * canvas.scale;
      var height = boxHeight * genscale;

      canvas.boxheights[gen] = [height, 1, wscale];
      canvas.mariageHeight [gen] = height * genscale;
      canvas.lineHeight[gen] =
         Math.min(maxFontSize, canvas.options.lineHeight * genscale);
      canvas.lines[gen] = height / canvas.lineHeight[gen];
      /*log ("gen=", gen, " lineHeight=", canvas.lineHeight[gen],
           " lines=", canvas.lines[gen]);*/

      //  Compute positions for boxes in this generation
      var lastIndex = index - Math.pow (2, gen);
      for (; index > lastIndex; index--) {
         canvas.tops[index] = (canvas.tops [2*index+1]
             + canvas.tops[2*index + 2] + canvas.boxheights[gen+1][0]
             - height) / 2;
      }
   }
}

function doDraw (evt, screenBox) {
   /* Do the actual drawing in the canvas.
    * The area included in refreshBox (real-world coordinates) needs to be
    * refreshed.
    * 'this' is the Canvas element */

   computeBoxPositions (this);

   var canvas = this,
       ctx = this.ctx,
       boxheights = canvas.boxheights,
       tops = canvas.tops,
       mariageHeight = canvas.mariageHeight,
       d = data,
       startX = canvas.toPixelX (d.children ? boxWidth+horizPadding+10 : 0),
       baseY = canvas.toPixelY (0),
       boxes = [],
       text = [],
       halfHeight = canvas.scale * boxHeight / 2,
       yForChild = baseY + tops[0] + halfHeight,
       seenChild = false;

   // First draw all lines, as a single path for more efficiency.
   // Compute the list of boxes at the same time, so that we can display
   // them afterward without recomputation

   ctx.beginPath();
   ctx.strokeStyle = "black";

   forEachBox (canvas,
         function(indiv, x, y, w, h, gen, sosa) {
            if (sosa <= 0) { // a child
               ctx.moveTo (x + w, y + h / 2);
               ctx.lineTo ((x + w + startX) / 2, y + h / 2);
               ctx.lineTo ((x + w + startX) / 2, yForChild);

               if (!seenChild) {
                  seenChild = true;
                  ctx.lineTo (startX, yForChild);
               }
               boxes.push([indiv, x, y, w, h, 0]);

            }
            else if (gen < d.generations - 1) {
               var x2 = x + w + horizPadding * boxheights[gen][2],
                   x3 = x + w * 0.9;

               if (showUnknown || d.sosa [2 * sosa]) {
                     var y1 = baseY + tops[2 * sosa - 1]
                              + boxheights[gen+1][0] / 2;
                     ctx.moveTo (x2, y1);
                     ctx.lineTo (x3, y1);
                     ctx.lineTo (x3, y);
                  }
                  if (showUnknown || d.sosa [2 * sosa + 1]) {
                     var y2 = baseY + tops[2 * sosa]
                              + boxheights[gen+1][0] / 2;
                     ctx.moveTo (x2, y2);
                     ctx.lineTo (x3, y2);
                     ctx.lineTo (x3, y + h);
                  }

                  if (mariageHeight[gen] > minFont
                      && gen < d.generations - 1
                      && d.marriage[2 * sosa]) {

                    var mar = event_to_string (d.marriage [2 * sosa]);
                    text.push([mariageHeight[gen], x2 + 3, y + h /2, mar]);
                  }
               }

               boxes.push([indiv, x, y, w, h, gen]);
         });

   ctx.stroke();

   ctx.textBaseline = 'top';
   for (var b=boxes.length - 1; b >= 0; b--) {
      var bo = boxes[b];
      drawBox (canvas, ctx, bo[0], bo[1], bo[2], bo[3], bo[4], bo[5]);
   }

   ctx.save();
   ctx.textBaseline = 'middle';
   ctx.fillStyle = "black";
   var prev=0;
   for (var t=text.length - 1; t >= 0; t--) {
      var te = text[t];
      if (te[0] != prev) {
         prev = te[0];
         ctx.font = Math.round (Math.min(maxFontSize, te[0]))
            + "px " + fontName;
      }
      ctx.fillText(te[3], te[1], te[2]);
   }
   ctx.restore();

}

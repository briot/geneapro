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

stylesheet = "rect {filter:url(#shadow)} rect.selected {fill:#CCC}";

function drawBox (canvas, c, person, x, y, width, height, lines) {
   // (x,y,width,height) are specified in pixels, so zooming and scrolling must
   // have been applied
   if (person) {
     var attr = data.styles [person.y];
     canvas.rect (x, y, width, height, attr);

     if (height >= minFont && lines >= 1) {
        var lh = canvas.options.lineHeight,
            font = Math.round (Math.min(maxFontSize,height)) + "px sans";
        c.save ();
        c.clip ();
        c.font = font;
        canvas.text (x + 1, y, person.surn + " " + person.givn, attr);

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
      canvas.rect (x, y, width, height, {fill:"white", stroke:"black"});
  }
};

function drawSOSA() {
   var opt = {
      lineHeight: $.detectFontSize (baseFontSize, "sans"),
   };
   $("#pedigreeSVG").canvas(opt).bind("draw", doDraw);
};

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
   canvas.__gens = d.generations;
   canvas.__scale = canvas.scale;

   var lastgen = d.generations - 1,
       maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
       totalBoxes = Math.pow (2,d.generations) - 1, // geometrical summation
       genscale = Math.pow (ratio, lastgen) * canvas.scale,
       wscale   = Math.pow (wratio, lastgen) * canvas.scale,
       spacing  = (boxHeight + vertPadding) * genscale;

   canvas.boxheights [lastgen] = [boxHeight * genscale, 1, wscale];

   // Start at last generation

   var y = 0;
   for (var index = totalBoxes - maxBoxes; index < totalBoxes; index++) {
      canvas.tops[index] = y;
      y += spacing;
   }

   index = totalBoxes - maxBoxes - 1;

   for (var gen = lastgen - 1; gen >= 0; gen --) {
      genscale  = Math.pow (ratio, gen) * canvas.scale;
      wscale   = Math.pow (wratio, gen) * canvas.scale;
      var height = boxHeight * genscale;

      canvas.boxheights [gen] = [height, 1, wscale];

      //  Compute positions for boxes in this generation
      var lastIndex = index - Math.pow (2, gen);
      for (; index > lastIndex; index--) {
         canvas.tops[index] = (canvas.tops [2*index+1]
             + canvas.tops[2*index + 2] + canvas.boxheights[gen+1][0]
             - height) / 2;
      }
   }
}

function doDraw (evt, ctx, screenBox, canvas) {
   /* Do the actual drawing in the canvas.
    * The area included in refreshBox (real-world coordinates) needs to be
    * refreshed.
    * 'this' is the <canvas> element */

   computeBoxPositions (canvas);
   var boxheights = canvas.boxheights,
       tops = canvas.tops,
       d = data,
       maxLines = 1,  //  name, birth date and place, death date and place
       lh       = canvas.options.lineHeight,
       startX = canvas.toPixelX (d.children ? boxWidth+horizPadding+10 : 0),
       baseY = canvas.toPixelY (0),
       boxes = [],
       text = [],
       x = startX,
       index = 0;

   // First draw all lines, as a single path for more efficiency.
   // Compute the list of boxes at the same time, so that we can display
   // them afterward without recomputation

   ctx.beginPath();
   ctx.strokeStyle = "black";

   for (var gen = 0; gen < d.generations; gen++) {
      var w = boxWidth * boxheights[gen][2],
          h = boxheights [gen][0],
          x2 = x + w + horizPadding * boxheights[gen][2],
          x3 = x + w * 0.9;

      if (x > screenBox.w || x + w < screenBox.x) { // clipping generation
         index += Math.pow (2, gen);

      } else {
         for (var box = Math.pow (2, gen); box >= 1; box--) {
            var sosa = index + 1, ti = tops[index] + baseY;

            if (ti < screenBox.h && ti + h > screenBox.y) { // clipping
               if (gen < d.generations - 1) {
                  if (showUnknown || d.sosa [2 * sosa]) {
                     var y1 = baseY + tops[2 * index + 1]
                              + boxheights[gen+1][0] / 2;
                     ctx.moveTo (x2, y1);
                     ctx.lineTo (x3, y1);
                     ctx.lineTo (x3, ti);
                  }
                  if (showUnknown || d.sosa [2 * sosa + 1]) {
                     var y2 = baseY + tops[2 * index + 2]
                              + boxheights[gen+1][0] / 2;
                     ctx.moveTo (x2, y2);
                     ctx.lineTo (x3, y2);
                     ctx.lineTo (x3, ti + h);
                  }

                  if (h * ratio > minFont
                      && gen < d.generations - 1
                      && d.marriage[2 * index + 2]) {

                    var mar = event_to_string (d.marriage [2 * index + 2]);
                    text.push([h * ratio, x2 + 3, ti + h /2, mar]);
                  }
               }

               boxes.push([sosa, x, ti, w, h]);
            }
            index ++;
         }
      }
      x = x2;
   }

   ctx.stroke();

   for (var b=boxes.length - 1; b >= 0; b--) {
      var bo = boxes[b];
      drawBox (canvas, ctx, d.sosa [bo[0]], bo[1], bo[2], bo[3], bo[4], 1);
   }

   ctx.save();
   ctx.textBaseline = 'middle';
   ctx.fillStyle = "black";
   var prev=0;
   for (var t=text.length - 1; t >= 0; t--) {
      var te = text[t];
      if (te[0] != prev) {
         prev = te[0];
         ctx.font = prev + "px sans";
      }
      ctx.fillText(te[3], te[1], te[2]);
   }
   ctx.restore();

   // draw children
   if (d.children) {
      var space = 20 * canvas.scale,
          childHeight = canvas.scale * (space + boxHeight);
          childrenHeight = d.children.length * childHeight - space,
          halfHeight = canvas.scale * boxHeight / 2;
          //  center around decujus
          y = baseY + tops[0] + halfHeight - childrenHeight / 2;

      var x  = canvas.toPixelX (0),
          x2 = x + canvas.scale * boxWidth,
          x3 = (startX + x2) / 2;

      ctx.beginPath ();
      ctx.moveTo (startX, baseY + tops[0] + halfHeight);
      ctx.lineTo (x3, baseY + tops[0] + halfHeight);
      ctx.strokeStyle = "black";
      ctx.stroke ();

      for (var c=0, len=d.children.length; c < len; c++) {
         var y2 = baseY + tops[2 * index + 2] + halfHeight;
         ctx.beginPath ();
         ctx.moveTo (x2, y + halfHeight);
         ctx.lineTo (x3, y + halfHeight);
         ctx.lineTo (x3, baseY + tops[0] + halfHeight);
         ctx.strokeStyle = "black";
         ctx.stroke ();

         drawBox (canvas, ctx, d.children [c], x, y,
                   boxWidth * canvas.scale, 2 * halfHeight, 5);
         y += childHeight;
      }
   }
}

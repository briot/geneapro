// Needs the variable "pedigree_data_url" to be defined
var boxWidth = 300;
var horizPadding = 0;
var boxHeight = 15;
var vertPadding = 2;    //  vertical padding at last gen
var showUnknown = false; //  whether to draw a box when parent is unknown
var ratio = 0.75;   //  size ratio for height from generation n to n+1
var wratio = 0.75;  //  size ratio for width from generation n to n+1
var baseFontSize = "16"; // pixels
var minFont = 5;    // No need to draw text below this
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

function Canvas (selector, maxWidth, maxHeight) {
   var elem = $(selector), canvas=this;
   this.canvas = elem[0];
   this.ctx = this.canvas.getContext ('2d');

   maximize (this.canvas);
   var w = elem.width(), h = elem.height ();
   this.canvas.width = w;
   this.canvas.height = h;

   this.scale = 1;
   var ratiox = w / maxWidth,
       ratioy = h / maxHeight;
   //this.scale = Math.max (0.7, Math.min (ratiox, ratioy));
   //this.ctx.scale (this.scale, this.scale);

   this.baseFont = baseFontSize + "px sans";
   this.ctx.font = this.baseFont;
   this.ctx.textBaseline = 'top';
   this.lineHeight = $.detectFontSize (baseFontSize, "sans");

   this.scrollx = 0;
   this.scrolly = 0;

   elem.mousewheel (function (event,delta) {
     if (delta > 0) {
        canvas.scale *= 1.2;
     } else {
        canvas.scale /= 1.2;
     }
     // ??? Should also scroll to zoom where the mouse is
     canvas.ctx.setTransform (canvas.scale, 0, 0, canvas.scale,
                              canvas.scrollx, canvas.scrolly);
     doDraw (canvas);
  });

   elem.mousedown (function (event) {
      if (event.which == 1) {
         var _startx = event.screenX, _starty = event.screenY,
             _sx = canvas.scrollx, _sy = canvas.scrolly;
         $(this).mousemove (function (event) {
            canvas.scrollx = _sx - _startx + event.screenX;
            canvas.scrolly = _sy - _starty + event.screenY;
            canvas.ctx.setTransform (canvas.scale, 0, 0, canvas.scale,
                                     canvas.scrollx, canvas.scrolly);
            doDraw (canvas);
         }).mouse;
      }
   }).mouseup (function (event) {
      $(this).unbind ('mousemove');
   });
};
Canvas.prototype.clear = function () {
   var c = this.ctx;
   c.save ();
   c.setTransform (1, 0, 0, 1, 0, 0);
   c.fillStyle = "#eee";
   c.fillRect (0, 0, this.canvas.width, this.canvas.height);
   c.restore ();
};
Canvas.prototype.rect = function (x, y, width, height, attr) {
   // Draw a rect with the attributes given in attr
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
Canvas.prototype.drawBox = function (person, x, y, sosa, width, height, lines) {
   if (person) {
     var c = this.ctx,
         lh = this.lineHeight,
         font = height + "px sans",
         attr = data.styles [person.y],
         birth = event_to_string (person.b),
         death = event_to_string (person.d),
         birthp = person.b ? person.b[1] || "" : "",
         deathp = person.d ? person.d[1] || "" : "";

     this.rect (x, y, width, height, attr);

     if (height >= minFont) {
        c.font = font;

        if (lines >= 1) {
           c.save ();
           c.clip ();
           this.text (x + 1, y, person.surn + " " + person.givn, attr);
           c.font = "bold " + font;
           if (lines >=2) c.fillText ("b:", x + 1, y + 2 * lh);
           if (lines >=4) c.fillText ("d:", x + 1, y + 4 * lh);

           c.font = "italic " + font;
           if (lines >= 2 && birth)  c.fillText (birth,  x + lh, y + lh);
           if (lines >= 3 && birthp) c.fillText (birthp, x + lh, y + 2 * lh);
           if (lines >= 4 && death)  c.fillText (death,  x + lh, y + 3 * lh);
           if (lines >= 5 && deathp) c.fillText (deathp, x + lh, y + 4 * lh);
           c.restore (); // unset clipping mask and font
        }
     }

    } else if (showUnknown) {
      this.rect (x, y, width, height, {fill:"white", stroke:"black"});
  }
};

function drawSOSA() {
  var d = data,
      maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
      startX = (d.children ? boxWidth + horizPadding : 0) + 1;
      maxWidth = (boxWidth + horizPadding) * d.generations + startX,
      maxHeight = (boxHeight + vertPadding)
         * Math.pow (ratio, d.generations - 1) * maxBoxes,
      canvas = new Canvas('#pedigreeSVG', maxWidth, maxHeight);
  doDraw (canvas);
};

function doDraw (canvas) {
   var d = data,
       maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
       totalBoxes = Math.pow (2,d.generations) - 1, // geometrical summation
       startX = (d.children ? boxWidth + horizPadding + 11 : 1),
       tops = new Array(totalBoxes),
       boxheights = new Array (d.generations);//[height, scale, lines]

   canvas.clear ();

   var maxLines = 1,  //  name, birth date and place, death date and place
       lh       = canvas.lineHeight;

   boxHeight = lh * maxLines;  //  ideal height, so that we have a scaling of
                               //  1 for the first generation

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
       genscale = Math.pow (ratio, lastgen),
       wscale   = Math.pow (wratio, lastgen),
       maxheight = boxHeight * genscale,
       lines = Math.max (1, Math.min (5, Math.round (maxheight / lh))),
       scaling = (lines * lh) / maxHeight,
       prevPadding = Math.round (vertPadding * genscale);

   boxheights [lastgen] = [maxheight, genscale, lines, wscale];

   // Compute the positions for the last generation

   for (var index = totalBoxes - maxBoxes, y=0; index < totalBoxes; index++) {
      tops[index] = y;
      y += maxheight + prevPadding;
   }

   index = totalBoxes - maxBoxes - 1;

   //  Now for all previous generations: the maximum height is that given in
   //  the config, but it must fit in the space between the two parents,
   //  taking into account the pading

   for (var gen = lastgen - 1; gen >= 0; gen --) {
      genscale  = Math.pow (ratio, gen);
      maxheight = boxHeight * genscale;
      wscale    = Math.pow (wratio, gen);
      var parentsHeight = 2 * boxheights [gen+1][0] + prevPadding,
          padding = Math.round (vertPadding * genscale);
      maxheight = Math.min (boxHeight * genscale,
                            parentsHeight - padding);

      lines = Math.max (1, Math.min (5, Math.round (maxheight / lh)));
      scaling = (lines * lh) / maxheight;
      boxheights [gen] = [maxheight, genscale, lines, wscale];

      //  Compute positions for boxes in this generation
      var lastIndex = index - Math.pow (2, gen);
      for (; index > lastIndex; index--) {
         tops[index] = (tops [2*index+2]
                        + tops[2*index + 1] + boxheights[gen+1][0]
                        - maxheight) / 2;
      }

      prevPadding = padding;
   }

   //console.log (boxheights);

   index = 0;
   for (var gen = 0, x=startX; gen < d.generations; gen++) {
      var w = boxWidth * boxheights[gen][3],
          h = boxheights [gen][0],
          x2 = Math.round (x + w + horizPadding * boxheights[gen][3]),
          x3 = Math.round (x + w * 0.9);

      // basic clipping (no one from this generation is visible)
      if (x * canvas.scale + canvas.scrollx > canvas.canvas.width
          || (x + w) * canvas.scale + canvas.scrollx < 0)
      {
         index += Math.pow (2, gen);

      } else {
         for (var box = Math.pow (2, gen); box >= 1; box--) {
            var sosa = index + 1;

            // basic clipping
            if (tops[index] * canvas.scale+canvas.scrolly > canvas.canvas.height
                || (tops[index] + h) * canvas.scale + canvas.scrolly < 0)
            {
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
               canvas.drawBox (d.sosa [sosa], x, tops[index], index + 1,
                               w, h, 1);
               canvas.ctx.restore ();
            }
            index ++;
         }
      }

      x = x2;
   }

   // draw children
   if (d.children) {
      var space = 20,
          childrenHeight = d.children.length * (space + boxHeight) - space,
          //  center around decujus
          y = tops[0] + boxHeight / 2 - childrenHeight / 2;
      for (var c=0, len=d.children.length; c < len; c++) {
         var x2 = boxWidth + horizPadding;
         var y2 = tops[2 * index + 2] + boxHeight / 2;

         canvas.ctx.beginPath ();
         canvas.ctx.moveTo (startX, tops[0] + boxHeight / 2);
         canvas.ctx.lineTo (startX - 5, tops[0] + boxHeight/2);
         canvas.ctx.lineTo (startX - 5, y + boxHeight / 2);
         canvas.ctx.lineTo (boxWidth, y + boxHeight / 2);
         canvas.ctx.strokeStyle = "black";
         canvas.ctx.stroke ();

         canvas.drawBox (d.children [c], 0, y, -1 - c, boxWidth, boxHeight, 5);
         y += boxHeight + space;
      }
   }
}

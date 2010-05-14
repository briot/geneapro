// Needs the variable "pedigree_data_url" to be defined
var boxWidth = 200;
var horizPadding = 20;
var boxHeight = 75;
var vertPadding = 20; //  vertical padding at last gen
var showUnknown = false; //  whether to draw a box when parent is unknown
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

   var ratiox = w / maxWidth,
       ratioy = h / maxHeight;
   this.scale = Math.min (ratiox, ratioy);
   this.ctx.scale (this.scale, this.scale);

   this.baseFont = "10px sans";
   this.ctx.font = this.baseFont;
   this.lineHeight = $.detectFontSize (10, "sans");

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
   if (this.scale > 0.2) {
      var c = this.ctx;

      if (attr["font-weight"])
         c.font = attr["font-weight"] + " " + this.baseFont;
      c.fillStyle = attr.color || "black";
      c.fillText (text, x, y);
   }
};
Canvas.prototype.drawBox = function (person, x, y, sosa, config) {
   if (person) {
     var c = this.ctx,
      pId = (sosa < 0 ? "c" + (-sosa) : sosa),
      attr = data.styles [person.y],
      birth = event_to_string (person.b),
      death = event_to_string (person.d),
      birthp = person.b ? person.b[1] || "" : "",
      deathp = person.d ? person.d[1] || "" : "";

     c.save ();
     this.rect (x, y, config.boxWidth, config.boxHeight, attr);
     c.clip ();
     this.text (x + 4, y + this.lineHeight,
                person.surn + " " + person.givn, attr);

     c.font = "bold 10px monospace";
     c.fillText ("b:", x + 4, y + 2 * this.lineHeight);
     c.fillText ("d:", x + 4, y + 4 * this.lineHeight);

     c.font = "italic 10px monospace";
     if (birth)  c.fillText (birth,  x + 20, y + 2 * this.lineHeight);
     if (birthp) c.fillText (birthp, x + 20, y + 3 * this.lineHeight);
     if (death)  c.fillText (death,  x + 20, y + 4 * this.lineHeight);
     if (deathp) c.fillText (deathp, x + 20, y + 5 * this.lineHeight);

     c.restore (); // unset clipping mask and font

    } else if (showUnknown) {
      this.rect (x, y, boxWidth, boxHeight,
               {"stroke-dasharray":"3", fill:"white", stroke:"black",
                onmouseover:'onMouseOver(evt)',
                onmouseout:'onMouseOut(evt)'});
  }
};

function drawSOSA() {
  var d = data,
      maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
      totalBoxes = Math.pow (2,d.generations) - 1, // geometrical summation
      startX = (d.children ? boxWidth + horizPadding : 0) + 1;
      maxWidth = (boxWidth + horizPadding) * d.generations + startX,
      maxHeight = boxHeight * maxBoxes + vertPadding * (maxBoxes - 1) +1,
      canvas = new Canvas('#pedigreeSVG', maxWidth, maxHeight);
  doDraw (canvas);
};

function doDraw (canvas) {
   var d = data,
       maxBoxes = Math.pow (2,d.generations-1),// max boxes at last generation
       totalBoxes = Math.pow (2,d.generations) - 1, // geometrical summation
       startX = (d.children ? boxWidth + horizPadding : 0) + 1;

   canvas.clear ();
   tops = new Array(totalBoxes);

   // Compute the positions for the last generation

   var y = 0;
   for (var index=totalBoxes - maxBoxes; index < totalBoxes; index++) {
      tops[index] = y;
      y += boxHeight + vertPadding;
   }

   // For the other generations, the boxes are centered relatively to their
   // ancestors in the next gen

   for (index = totalBoxes - maxBoxes - 1; index >= 0; index--) {
      tops[index] = (tops [2 * index + 1] + tops [2 * index + 2]) / 2;
   }

   config = {
     boxWidth: boxWidth,
     boxHeight: boxHeight
   };

   index = 0;
   for (var gen = 0; gen < d.generations; gen++) {
      var x = (boxWidth + horizPadding) * gen + startX;
      for (var box = Math.pow (2, gen); box >= 1; box--) {
         if (gen < d.generations - 1) {
            var x2 = x + boxWidth + horizPadding;
            var y1 = tops[2 * index + 1] + boxHeight / 2;
            var y2 = tops[2 * index + 2] + boxHeight / 2;

            if (showUnknown || d.sosa [2 * index + 1]) {
               canvas.ctx.beginPath ();
               canvas.ctx.moveTo (x2, y1);
               canvas.ctx.lineTo (x + boxWidth * 0.9, y1);
               canvas.ctx.lineTo (x + boxWidth * 0.9, y2);
               canvas.ctx.lineTo (x2, y2);
               canvas.ctx.strokeStyle = "black";
               canvas.ctx.stroke ();
            }

            if (gen < d.generations - 1 
                && d.marriage[2 * index + 2]) {

              var mar = event_to_string (d.marriage [2 * index + 2]);
              canvas.text (x2, (y1 + y2) / 2 + 4, mar, {stroke:"black"});
            }
         }
         canvas.drawBox (d.sosa [index + 1], x, tops[index], index + 1, config);
         index ++;
      }
   }

   // draw children
   if (d.children) {
      var space = (maxHeight - d.children.length * boxHeight)
         / (d.children.length + 1);
      var y = space;
      for (var c=0, len=d.children.length; c < len; c++) {
         var x2 = x + boxWidth + horizPadding;
         var y2 = tops[2 * index + 2] + boxHeight / 2;

         canvas.ctx.beginPath ();
         canvas.ctx.moveTo (startX, tops[0] + boxHeight / 2);
         canvas.ctx.lineTo (startX - horizPadding / 2, tops[0] + boxHeight/2);
         canvas.ctx.lineTo (startX - horizPadding / 2, y + boxHeight / 2);
         canvas.ctx.lineTo (1 + boxWidth, y + boxHeight / 2);
         canvas.ctx.strokeStyle = "black";
         canvas.ctx.stroke ();

         canvas.drawBox (d.children [c], 1, y, -1 - c, config);
         y += boxHeight + space;
      }
   }
}

/**
 * This package provides an abstract base class for the pedigree and fanchart
 * views, which share a number of settings (loading data asynchronously from
 * the server, various color schemes,...
 */

/** Maximum number of generations that can be displayed */
var MAXGENS = 20;

/** Default number of generations to display */
var DEFAULT_GENERATIONS = 5;

/** Construct a new canvas
 */
function AbstractPedigree(canvas, data) {
   Canvas.call(this, canvas /* elem */);
   this.setData(data);
}
inherits(AbstractPedigree, Canvas);

/**
 * Describes how the boxes are displayed.
 * @enum {number}
 */

AbstractPedigree.appearance = {
   FLAT: 0,
   GRADIENT: 1
};

/** @private */
AbstractPedigree.prototype.appearance_ = AbstractPedigree.appearance.GRADIENT;

/**
 * @enum {number}
 */

AbstractPedigree.colorScheme = {
   RULES: 0,
   //  color of a person's box is computed on the server, depending on the
   //  highlighting rules defined by the user

   PEDIGREE: 1,
   //  The color of a person's box depends on its location in the pedigree
   
   GENERATION: 2,
   //  The color depends on the generation
   
   WHITE: 3
   //  No border or background for boxes
};

/** Color scheme to apply to boxes
 * @type {AbstractPedigree.colorScheme}
 * @private
 */

AbstractPedigree.prototype.colorScheme_ = AbstractPedigree.colorScheme.PEDIGREE;

/**
 * Set the data to display in the canvas.
 * Post-process the data to add extra information to the persons. This
 * information is later needed to compute various pieces of information like
 * the color of the box.
 * A person has the additional attributes:
 *    * 'generation': the generation number (1 for decujus and 0 for children)
 *    * 'sosa': the SOSA number (1 for decujus, 0 .. -n for children)
 *    * 'angle': position of the person in the generation, from 0.0 to 1.0.
 * The canvas needs to be refreshed explicitly.
 */

AbstractPedigree.prototype.setData = function(data) {
   this.data = data;

   if (!data) {
      return;
   }

   var sosa = 1;
   for (var gen = 0; gen <= data.generations; gen++) {
      var max = Math.pow(2, gen);
      for (var p = max; p >= 1; p--) {
         var person = data.sosa[sosa];
         if (person) {
            person.generation = gen;
            person.sosa = sosa;
            person.angle = (max - p) / max;
         }
         sosa ++;
      }
   }

   if (data.children) {
      var len = data.children.length;
      for (var c = 0; c < len; c++) {
         var person = data.children[c];
         person.generation = -1;
         person.sosa = -c;
         person.angle = c / len;
      }
   }
};

/**
 * Change the appearance of the fanchart
 *   @type {AbstractPedigree.appearance} appearance   .
 */

AbstractPedigree.prototype.setAppearance = function(appearance) {
   this.appearance_ = appearance;
   this.refresh();
};

/**
 * Change the color scheme for the fanchart
 *   @type {AbstractPedigree.colorScheme}  scheme   The scheme to apply.
 */

AbstractPedigree.prototype.setColorScheme = function(scheme) {
   this.colorScheme_ = scheme;
   this.refresh();
};
                
/**
 * Load the data for the pedigree from the server.
 *   @param {number}  gen   The number of generations to load.
 */

AbstractPedigree.prototype.loadData = function(gen) {
   var f = this;  //  closure for callbacks
   var decujus = (this.data ? this.data.sosa[1].id : 1);
   $.ajax(
      {'url': '/pedigreeData/' + decujus + '/' + gen,
       'success': function(data) {
         f.setData(data);
         f.refresh();
      }});
};

/**
 * Return the style to use for a person, depending on the settings of the
 * canvas. When a gradient is used, it assumes that the drawing context has
 * been translated so that (0,0) is either the center of a radial gradient,
 * or the top-left position of a linear gradient.
 *
 * @param {} person   The person to display, which must have a 'generation'
 *    field set to its generation number.
 * @param {Number} minRadius   For a fanchart, this is the interior radius;
 *    for a standard box, this is the height of the box.
 * @param {Number} maxRadius   If set to 0, a linear gradient is used.
 * @private
 */

AbstractPedigree.prototype.getStyle_ = function(person, minRadius, maxRadius) {
   var ctx = this.ctx;

   function doGradient() {
      if (maxRadius == 0) {
         return ctx.createLinearGradient(0, minRadius, 0, 0);
      } else {
         return ctx.createRadialGradient(0, 0, minRadius, 0, 0, maxRadius);
      }
   }

   switch (this.colorScheme_) {

   case AbstractPedigree.colorScheme.RULES:
      var st = this.data.styles[person.y];
      st['stroke'] = 'gray';

      if (st['fill']
          && typeof st['fill'] == 'string'
          && this.appearance_ == AbstractPedigree.appearance.GRADIENT)
      {
         var gr = doGradient();
         var c = $.Color(st['fill']);
         gr.addColorStop(0, c.toString());
         gr.addColorStop(1, c.transition("black", 0.2).toString());

         var st2 = {}
         for (var obj in st) {
            st2[obj] = st[obj];
         }
         st2['fill'] = gr;
         return st2;
      }
      return st;

   case AbstractPedigree.colorScheme.GENERATION:
      var c = this.hsvToRgb(
            180 + 360 * (person.generation - 1) / MAXGENS, 0.4, 1.0).toString();
      if (this.appearance_ == AbstractPedigree.appearance.GRADIENT) {
         var gr = doGradient();
         gr.addColorStop(0, c);
         c = this.hsvToRgb(
            180 + 360 * (person.generation - 1) / MAXGENS, 0.4, 0.8).toString();
         gr.addColorStop(1, c)
         return {'stroke': 'black', 'fill': gr, 'secondaryText': 'gray'};
      } else {
         return {'stroke': 'black', 'fill': c, 'secondaryText': 'gray'};
      }

   case AbstractPedigree.colorScheme.PEDIGREE:
      //  Avoid overly saturated colors when displaying only few generations
      //  (i.e. when boxes are big)
      var maxGen = Math.max(12, this.data.generations - 1);
      var c = this.hsvToRgb(
            person.angle * 360, person.generation / maxGen, 1.0).toString();

      if (this.appearance_ == AbstractPedigree.appearance.GRADIENT) {
         var gr = doGradient();
         gr.addColorStop(0, c);
         c = this.hsvToRgb(
               person.angle * 360, person.generation / maxGen, 0.8).toString();
         gr.addColorStop(1, c)
         return {'stroke': 'black', 'fill': gr, 'secondaryText': 'gray'};
      } else {
         return {'stroke': 'black', 'fill': c, 'secondaryText': 'gray'};
      }

   case AbstractPedigree.colorScheme.WHITE:
      return {'color': 'black', 'secondaryText': 'gray'};
   }
};

/** @inheritDoc */

AbstractPedigree.prototype.showSettings = function() {
   var f = this;  //  closure for callbacks
   Canvas.prototype.showSettings.call(this);

   $("#settings #gens")
      .slider({"min": 2, "max": MAXGENS,
               "value": this.data ? this.data.generations : DEFAULT_GENERATIONS,
               "change": function() { f.loadData($(this).slider("value")); }})
      .find("span.right").text(MAXGENS);
   $("#settings select[name=appearance]")
      .change(function() { f.setAppearance(Number(this.value))})
      .val(this.appearance_);
   $("#settings select[name=colors]")
      .val(this.colorScheme_)
      .change(function() { f.setColorScheme(Number(this.value))});
};

/**
 * Draw a rectangular box for a person, at the given coordinates.
 * The box allows for up to linesCount of text.
 * (x,y) are specified in pixels, so zooming and scrolling must have been
 * applied first.
 *
 * @param {number} fontsize
 *    Size of the font (in absolute size, not actual pixels).
 */

AbstractPedigree.prototype.drawPersonBox = function(
    person, x, y, width, height, fontsize)
{
    if (person) {
       var attr = this.getStyle_(person,
                                 height /* minRadius */,
                                 0 /* maxRadius */);
       attr.shadow = (height > 2); // force shadow

       this.ctx.save();
       this.ctx.translate(x, y);  //  to get proper gradient
       if (attr.stroke || attr.fill) {
          this.roundedRect(0, 0, width, height, attr);
       } else {
          this.rect(0, 0, width, height, attr);
       }
       this.drawPersonText(person, 0, 0, height, fontsize);
       this.ctx.restore();
    }
};

/**
 * Draw the text to describe a person. The text must fix in a box of the given
 * size, although the box itself is not displayed.
 */

Canvas.prototype.drawPersonText = function(
    person, x, y, height, fontsize)
{
    if (!person) {
        return;
    }
    // Compute the actual font size to use, and the number of lines to
    // display.
    // We do not want the canvas' zoom to effect the text (since zooming
    // in on the text should instead display more info).

    var pixelsFontSize = Math.max(
        this.minFontSize,
        Math.min(this.toPixelLength(fontsize), this.maxFontSize));
    var absFontSize = this.toAbsLength(pixelsFontSize);
    var linesCount = Math.floor((height - fontsize) / absFontSize) + 1;
    var attr = this.getStyle_(person,
                              height /* minRadius */,
                              0 /* maxRadius */);

    if (linesCount >= 1) {
        var c = this.ctx;
        c.textBaseline = 'top';
        c.save ();
        c.clip ();
        c.translate(x, y);
        var y = fontsize;
        c.font = y + "px " + this.fontName;
        this.text(1, 0, person.surn + " " + person.givn, attr);

        c.font = absFontSize + "px italic " + this.fontName;
        c.fillStyle = attr['secondaryText'] || c.fillStyle;

        if (linesCount >= 2 && linesCount < 5) {
            var birth = event_to_string (person.b),
            death = event_to_string (person.d);
            c.fillText(birth + " - " + death, 1, y);

        } else if (linesCount > 2) {
            var birth = event_to_string(person.b);
            var death = event_to_string(person.d);
            var birthp = person.b ? person.b[1] || "" : "";
            var deathp = person.d ? person.d[1] || "" : "";
            if (linesCount >= 2 && birth)  {
               c.fillText("b: " + birth, 1, y);
               y += absFontSize;
               if (linesCount >= 3 && birthp) {
                  c.fillText("    " + birthp, 1, y);
                  y += absFontSize;
               }
            }
            if (linesCount >= 4 && death) {
               c.fillText("d: " + death, 1, y);
               y += absFontSize;
               if (linesCount >= 5 && deathp) {
                  c.fillText("    " + deathp, 1, y);
                  y += absFontSize;
               }
            }
        }
        c.restore (); // unset clipping mask and font
    }
};

/**
 * This package provides an abstract base class for the pedigree and fanchart
 * views, which share a number of settings (loading data asynchronously from
 * the server, various color schemes,...
 */

/** Maximum number of generations that can be displayed */
var MAXGENS = 50;

/** Default number of generations to display */
var DEFAULT_GENERATIONS = 5;

/** Construct a new canvas
 */
function AbstractPedigree(canvas, data) {
   this.gens = data.generations;   //  display all of them by default
   this.descendant_gens = data.descendants;
   Canvas.call(this, canvas /* elem */);
   this.setData(data);

   var f = this;  //  closure for callbacks
   $("#settings #gens")
      .slider({"min": 0,
               "change": function() { f.loadData($(this).slider("value")); }});
   $("#settings #Dgens")
      .slider({"min": 0, 
               "change": function() { f.loadData(undefined, $(this).slider("value")); }});
   $("#settings select[name=appearance]")
      .change(function() { f.setAppearance(Number(this.value))});
   $("#settings select[name=colors]")
      .change(function() { f.setColorScheme(Number(this.value))});
   $("#settings select[name=layout]")
      .change(function() {f.layoutScheme_ = Number(this.value);
                          f.showSettings();
                          f.refresh()});
}
inherits(AbstractPedigree, Canvas);

/** The number of ancestor generations to display. This might be different from
 * the number of generations available in data (although never greater), in
 * case we already had information for extra persons.
 */
AbstractPedigree.prototype.gens;

/** The number of descendant generations to display. */
AbstractPedigree.prototype.descendants_gens;

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
AbstractPedigree.layoutScheme = {
   EXPANDED: 0,
   COMPACT: 1
};
AbstractPedigree.prototype.layoutScheme_ = AbstractPedigree.layoutScheme.COMPACT;

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
 *    * 'parent_': pointer to parent person (for descendants of decujus)
 * The canvas needs to be refreshed explicitly.
 *
 * @param {{persons:Array.<object>, generations:number,
 *          sosa: Object.<number>,
 *          children:Object.<Array.<number>>}} data
 *     Data for the pedigree. Children is, for each person id, the list of its
 *     children. Sosa is a map from sosa number to person id, which is used to
 *     find the parents of a person.
 *     Each item in persons must have the following fields:
 *         * 'generation': the generation number (1 for decujus, negative
 *           for children)
 *
 * @param {boolean} merge
 *     If true, the new data is added to the existing data, instead of
 *     replacing it.
 */

AbstractPedigree.prototype.setData = function(data, merge) {
   var canvas = this;
   var old_gens = (this.data ? this.data.generations : -1);

   this.setNeedLayout();

   if (merge && this.data) {
      this.data.generations = Math.max(data.generations, this.data.generations);
      this.data.descendants = Math.max(data.descendants, this.data.descendants);
      for (var d in data.marriage) {
         this.data.marriage[d] = data.marriage[d];
      }
      for (var d in data.styles) {
         this.data.styles[d] = data.styles[d];
      }
      for (var d in data.persons) {
         if (this.data.persons[d] === undefined) {
            this.data.persons[d] = data.persons[d];
         }
      }
      //  No merging children, to preserve the details we might have

   } else {
      this.data = data;
      if (!data) {
         return;
      }
   }

   // Traverse the list of all known persons directly, not by iterating
   // generations and then persons, since in fact a tree is often sparse.
   // We iterate from generation 0, in case the server sent too much
   // information

   var count = [];
   for (var gen = 0; gen <= data.generations; gen++) {
      count[gen] = Math.pow(2, gen);
   }
   var d = data.sosa;
   for (var sosa in d) {
      var p = data.persons[d[sosa]];
      p.sosa = sosa;
      p.angle = sosa / count[p.generation] - 1;
      this.data.sosa[sosa] = p;
   }

   for (var p in data.children) {
      var parent = this.data.persons[p];
      var children = parent.children = [];
      var len = data.children[p].length;
      for (var c = 0; c < len; c++) {
         var pc = this.data.persons[data.children[p][c]];
         pc.sosa = -1;
         // pc.angle is computed later
         pc.parent_ = parent;
         children.push(pc);
      }
   }

   function _doAngles(indiv, from, to) {
      indiv.angle = from / 360;
      if (indiv.children) {
         var step = (to - from) / indiv.children.length;
         for (var c = 0; c < indiv.children.length; c++) {
            if (indiv.children[c]) {
               _doAngles(indiv.children[c],
                         from + c * step,
                         from + (c + 1) * step);
            }
         }
      }
   }
   _doAngles(this.data.sosa[1], 0, 360);

   //  No longer need this
   delete data.children;
};

/**
 * Retrieve details for a person, from the server, unless the details
 * are already known.
 */

AbstractPedigree.prototype.getPersonDetails = function(person) {
   if (person.details !== undefined) {
      return;
   }
   var f = this;
   person.details = [];  //  prevent a second parallel request for same person
   $.ajax(
       {'url': '/personaEvents/' + person.id,
        'success': function(data) {
           person.details = data || [];
           f.refresh();
       }});
};

/**
 * Change the appearance of the fanchart
 *   @type {AbstractPedigree.appearance} appearance   .
 */

AbstractPedigree.prototype.setAppearance = function(appearance) {
   this.appearance_ = appearance;
   this.setNeedLayout();
   this.refresh();
};

/**
 * Change the color scheme for the fanchart
 *   @type {AbstractPedigree.colorScheme}  scheme   The scheme to apply.
 */

AbstractPedigree.prototype.setColorScheme = function(scheme) {
   this.colorScheme_ = scheme;
   this.setNeedLayout();
   this.refresh();
};
                
/**
 * Load the data for the pedigree from the server.
 *   @param {number}  gen   The number of generations to load.
 */

AbstractPedigree.prototype.loadData = function(gen, descendants) {
   this.gens = gen === undefined ? this.gens : gen;
   this.descendant_gens = descendants === undefined ? this.descendant_gens : descendants;

   // If we intend to display fewer generations than are already known, no
   // need to download anything.

   if (this.data &&
       this.gens <= this.data.generations &&
       this.descendant_gens <= this.data.descendants)
   {
      this.setNeedLayout();
      this.refresh();
      return;
   }

   var f = this;  //  closure for callbacks
   var decujus = (this.data ? this.data.sosa[1].id : 1);
   $.ajax(
      {url: '/pedigreeData/' + decujus,
       data: {'gens': this.gens,
              'gens_known': this.data ? this.data.generations : -1,
              'desc_known': this.data ? this.data.descendants : -1,
              'descendant_gens': this.descendant_gens},
       success: function(data) {
         f.setData(data, true /* merge */);
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
      var gen = Math.abs(person.generation);
      var maxgen = Math.min(12, MAXGENS);
      var c = this.hsvToRgb(
            180 + 360 * (gen - 1) / maxgen, 0.4, 1.0).toString();
      if (this.appearance_ == AbstractPedigree.appearance.GRADIENT) {
         var gr = doGradient();
         gr.addColorStop(0, c);
         c = this.hsvToRgb(
            180 + 360 * (gen - 1) / maxgen, 0.4, 0.8).toString();
         gr.addColorStop(1, c)
         return {'stroke': 'black', 'fill': gr, 'secondaryText': 'gray'};
      } else {
         return {'stroke': 'black', 'fill': c, 'secondaryText': 'gray'};
      }

   case AbstractPedigree.colorScheme.PEDIGREE:
      //  Avoid overly saturated colors when displaying only few generations
      //  (i.e. when boxes are big)
      var maxGen = Math.max(12, this.gens);
      var gen = Math.abs(person.generation);
      var c = this.hsvToRgb(person.angle * 360, gen / maxGen, 1.0).toString();

      if (this.appearance_ == AbstractPedigree.appearance.GRADIENT) {
         var gr = doGradient();
         gr.addColorStop(0, c);
         c = this.hsvToRgb(person.angle * 360, gen / maxGen, 0.8).toString();
         gr.addColorStop(1, c)
         return {'stroke': 'black', 'fill': gr, 'secondaryText': 'gray'};
      } else {
         return {'stroke': 'black', 'fill': c, 'secondaryText': 'gray'};
      }

   case AbstractPedigree.colorScheme.WHITE:
      return {'color': 'black', 'secondaryText': 'gray'};
   }
};

/** @inheritDoc
 *  @param {number=} maxGens
 *     If specified, indicates the maximum numnber of generations
 * */

AbstractPedigree.prototype.showSettings = function(maxGens) {
   maxGens = maxGens || MAXGENS;
   Canvas.prototype.showSettings.call(this);

   $("#settings #gens")
      .slider({"max": maxGens,
               "value": this.data ? this.gens : DEFAULT_GENERATIONS})
      .find("span.right").text(maxGens);
   $("#settings #Dgens")
      .slider({"max": maxGens,
               "value": this.data ? this.descendant_gens : 1})
      .find("span.right").text(maxGens);
   $("#settings select[name=appearance]").val(this.appearance_);
   $("#settings select[name=colors]").val(this.colorScheme_);
   $("#settings select[name=layout]").val(this.layoutScheme_);
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
            c.fillText(birth + " - " + death, 5, y);

        } else if (y + absFontSize <= height) {
            var birth = event_to_string(person.b);
            var death = event_to_string(person.d);
            var birthp = person.b ? person.b[1] || "" : "";
            var deathp = person.d ? person.d[1] || "" : "";
            if (y + absFontSize <= height && birth) {
               c.fillText("b: " + birth, 5, y);
               y += absFontSize;
               if (y + absFontSize <= height && birthp) {
                  c.fillText("    " + birthp, 5, y);
                  y += absFontSize;
               }
            }
            if (y + absFontSize <= height && death) {
               c.fillText("d: " + death, 5, y);
               y += absFontSize;
               if (y + absFontSize <= height && deathp) {
                  c.fillText("    " + deathp, 5, y);
                  y += absFontSize;
               }
            }
            if (y + absFontSize <= height) {
               // Will fetch and display more information
               this.getPersonDetails(person);
               if (person.details) {
                  var d = 0;
                  while (y + absFontSize <= height &&
                        d < person.details.length) 
                  {
                     c.fillText(person.details[d], 5, y);
                     y += absFontSize;
                     d ++;
                  }
               }
            }
        }
        c.restore (); // unset clipping mask and font
    }
};

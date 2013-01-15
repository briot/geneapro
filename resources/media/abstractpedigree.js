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

   PEDIGREE: 1
   //  The color of a person's box depends on its location in the pedigree
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
   for (var gen = 0; gen < data.generations; gen++) {
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
         person.generation = 0;
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

/** @inheritDoc */

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
         return {'stroke': 'black', 'fill': gr};
      } else {
         return {'stroke': 'black', 'fill': c};
      }
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

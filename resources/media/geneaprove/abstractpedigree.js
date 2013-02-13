/**
 * This package provides an abstract base class for the pedigree and fanchart
 * views, which share a number of settings (loading data asynchronously from
 * the server, various color schemes,...
 */

/** Maximum number of generations that can be displayed */
var MAXGENS = 50;

/** Default number of generations to display */
var DEFAULT_GENERATIONS = 5;

/** The simplified description of a person
 * @param {!ServerPerson} person    Info sent by the server.
 * @constructor
 * @struct
 */

function Person(person) {
   this.givn = /** @type {string} */ (person['givn']);
   this.surn = /** @type {string} */ (person['surn']);
   this.generation = /** @type {number} */ (person['generation']);
   this.id = /** @type {number} */ (person['id']);
   this.sex = /** @type {string} */ (person['sex']);
   this.style = /** @type {string} */ (person['y']);
   this.birth = /** @type {window.GeneaEvent} */ (person['b']);
   this.death = /** @type {window.GeneaEvent} */ (person['d']);

   /** @type {Array.<Person>} */
   this.children = [];

   /** @type {Person|undefined} */
   this.parent_ = undefined;

   /** @type {Array.<string>|undefined} */
   this.details = undefined;

   // sosa number compared to current decujus, negative for descendants
   this.sosa = 0;

   // 'angle' for the person (0..1) within its generation
   this.angle = 0;

   /** The person's position on the screen
    * @type {LayoutInfo} */
   this.box;
}

/** Mark person as selected (this changes various information in the GUI,
 * and ensures she will become the decujus if the user selects another page.
 */

Person.prototype.select = function() {
   Person.selected = this;
   var id = this.id;
   var n = this.givn + ' ' + this.surn;
   $('#decujusName').text(n + ' (' + id + ')');
   $('#personaLink').attr('href', '/persona/' + id);
   $('#pedigreeLink').attr('href', '/pedigree/' + id);
   $('#fanchartLink').attr('href', '/fanchart/' + id);
   $('#quiltsLink').attr('href', '/quilts/' + id);
   $('#statsLink').attr('href', '/stats/' + id);
};

/** @type {Person|undefined}  the selected person. */

Person.selected;

/** Construct a new canvas
 * @param {Element} canvas    The DOM object to instrument.
 * @param {ServerData} data   Data sent by the server.
 * @constructor
 * @extends {Canvas}
 */
function AbstractPedigree(canvas, data) {
   Canvas.call(this, canvas /* elem */);
   this.resetData();
   this.setData(data);

   var f = this;  //  closure for callbacks
   $('#settings #gens')
      .slider({'min': 0,
               'change': function() {
                 f.loadData(/** @type {number} */($(this).slider('value')))}});
   $('#settings #Dgens')
      .slider({'min': 0,
               'change': function() {
                  f.loadData(
                     undefined,
                     /** @type {number} */($(this).slider('value'))); }});
   $('#settings select[name=appearance]')
      .change(function() {
         f.setAppearance(
            /** @type{AbstractPedigree.appearance} */(Number(this.value)))});
   $('#settings select[name=colors]')
      .change(function() {
         f.setColorScheme(
            /** @type{AbstractPedigree.colorScheme} */(Number(this.value)))});
   $('#settings select[name=layout]')
      .change(function() {
         f.layoutScheme = /** @type{AbstractPedigree.layoutScheme} */(
             Number(this.value));
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
AbstractPedigree.prototype.descendant_gens;

/** Number of generations that are cached on the client */
AbstractPedigree.prototype.loaded_generations;

/** Number of descendant generations that are cached on the client */
AbstractPedigree.prototype.loaded_descendants;

/** Id of the selected person
 * @private
 */
AbstractPedigree.prototype.selected__;

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

/** @type {AbstractPedigree.layoutScheme}  Current layout scheme
 * @protected
 */
AbstractPedigree.prototype.layoutScheme =
   AbstractPedigree.layoutScheme.COMPACT;

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
 * @protected
 */

AbstractPedigree.prototype.colorScheme = AbstractPedigree.colorScheme.PEDIGREE;

/**
 * Reset cached data
 */

AbstractPedigree.prototype.resetData = function() {

   /** The list of persons, indexed by their unique id.
    * @type {Object.<number,Person>}
    * @protected
    */
   this.persons = {};

   /** The list of persons, indexed by their sosa id.
    * @type {Object.<number, Person>}
    * @protected
    */
   this.sosa = {};

   /** Marriage information for the person at the given sosa id
    * @type {Object.<number, window.GeneaEvent>}
    */
   this.marriage = {};

   /** All the styles to display personas
    * @type {Object.<DisplayAttr>}
    */
   this.styles = {};

   this.loaded_generations = undefined;
   this.loaded_descendants = undefined;
};

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
 * @param {ServerData=} data   Data for the pedigree.
 * @param {boolean=} merge
 *     If true, the new data is added to the existing data, instead of
 *     replacing it.
 */

AbstractPedigree.prototype.setData = function(data, merge) {
   var canvas = this;

   if (!data) {
      return;
   }

   var dp = data['persons'];
   var dg = data['generations'];
   var dd = data['descendants'];
   var ds = data['sosa'];
   var dc = data['children'];
   var dt = data['styles'];
   var dm = data['marriage'];

   var old_gens = (this.loaded_generations !== undefined ?
                       this.loaded_generations : -1);

   this.setNeedLayout();

   if (merge && this.loaded_generations !== undefined) {
      this.loaded_generations = Math.max(dg, this.loaded_generations);
      this.loaded_descendants = Math.max(dd, this.loaded_descendants);
      //  No merging children, to preserve the details we might have

   } else {
      this.gens = this.loaded_generations = dg;
      this.descendant_gens = this.loaded_descendants = dd;
   }

   // Merge persons information, but preserve details if we have them.

   for (var d in dp) {
      d = Number(d);
      if (this.persons[d] === undefined) {
         this.persons[d] = new Person(dp[d]);
      }
   }
   for (var d in dm) {
      d = Number(d);
      this.marriage[d] = dm[d];
   }
   for (var d in dt) {
      this.styles[d] = dt[d];
   }

   // Traverse the list of all known persons directly, not by iterating
   // generations and then persons, since in fact a tree is often sparse.
   // We iterate from generation 0, in case the server sent too much
   // information

   var count = [];
   for (var gen = 0; gen <= dg; gen++) {
      count[gen] = Math.pow(2, gen);
   }
   for (var sosa in ds) {
      sosa = Number(sosa);
      var p = this.persons[ds[sosa]];
      p.sosa = sosa;
      p.angle = sosa / count[p.generation] - 1;
      this.sosa[sosa] = p;
   }

   for (var p in dc) {
      p = Number(p);
      var parent = this.persons[p];
      var children = parent.children = [];
      var len = dc[p].length;
      for (var c = 0; c < len; c++) {
         var pc = this.persons[dc[p][c]];
         pc.sosa = -1;   // ??? Should be relative to the parent
         // pc.angle is computed later
         pc.parent_ = parent;
         children.push(pc);
      }
   }

   /** @param {Person} indiv  The person.
    *  @param {number} from   start angle.
    *  @param {number} to     end angle.
    */
   function _doAngles(indiv, from, to) {
      indiv.angle = from;
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
   _doAngles(this.sosa[1], 0, 1);
};

/**
 * Retrieve details for a person, from the server, unless the details
 * are already known.
 * @param {Person} person     The person for which we want to show details.
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
 * @param {AbstractPedigree.appearance} appearance  The rendering to apply.
 */

AbstractPedigree.prototype.setAppearance = function(appearance) {
   this.appearance_ = appearance;
   this.setNeedLayout();
   this.refresh();
};

/**
 * Change the color scheme for the fanchart
 * @param {AbstractPedigree.colorScheme}  scheme   The scheme to apply.
 */

AbstractPedigree.prototype.setColorScheme = function(scheme) {
   this.colorScheme = scheme;
   this.setNeedLayout();
   this.refresh();
};

/**
 * @param {Person} person    The person to test.
 * @return {boolean}  Whether the person is selected.
 */

AbstractPedigree.prototype.isSelected = function(person) {
   return this.selected__ == person && person !== undefined;
};

/**
 * @param {Person=} id
 *   The person to select. This function automatically refreshes
 *   the canvas to show the new status of the selection.
 */

AbstractPedigree.prototype.select = function(id) {
   this.selected__ = id ? id : undefined;
   if (id) {
      id.select();
   }
   this.refresh();
};

/**
 * @param {Event} e   The click event.
 * @return {Person|undefined}  The person that was clicked on.
 */

AbstractPedigree.prototype.getClicked = function(e) {
   var off = this.canvas.offset();
   var mx = this.toAbsX(e.pageX - off.left);
   var my = this.toAbsY(e.pageY - off.top);
   return this.personAtCoordinates(mx, my);
};

/**
 * @param {number}  x   Absolute coordinates.
 * @param {number}  y   Absolute coordinates.
 * @return {Person|undefined} The person at the given absolute coordinates.
 */

AbstractPedigree.prototype.personAtCoordinates = function(x, y) {};

/** @inheritDoc */

AbstractPedigree.prototype.onClick = function(e) {
   var person = this.getClicked(e);
   if (person) {
      this.select(person);
   }
};

/** @inheritDoc */

AbstractPedigree.prototype.onDblClick = function(e) {
   var person = this.getClicked(e);
   if (person) {
      this.loadData(undefined /* gen */,
                    undefined /* descendants */,
                    person.id /* decujus */);
   } else {
      this.select(undefined);
   }
};

/**
 * @param {Person}  person   The person to check.
 * @param {!Box} box   The visible area of the screen,
 *    absolute coordinates.
 * @return {boolean}  Whether the person is currently visible on the screen.
 */

AbstractPedigree.prototype.isVisible = function(person, box) {
   return (person.generation <= this.gens &&
           person.generation >= -this.descendant_gens);
};

/**
 * Calls callback for each visible person on screen.
 * @param {function(Person)} callback
 *    'this' is the same as the caller of forEachBox.
 *    Persons are returned in no particular order.
 *    Iteration stops when this callback returns True.
 */

AbstractPedigree.prototype.forEachVisiblePerson = function(callback) {
   var box = this.visibleRegion();
   var pe = this.persons;
   for (var p in pe) {
      p = Number(p);
      if (this.isVisible(pe[p], box) && callback.call(this, pe[p])) {
         return;
      }
   }
};

/**
 * Load the data for the pedigree from the server.
 * @param {number=}  gen   The number of generations to load.
 * @param {number=} descendants  The number of descendant generations to load.
 * @param {number=} decujus  The id of the decujus person (or undefined
 *    to keep the same one).
 */

AbstractPedigree.prototype.loadData = function(gen, descendants, decujus) {
   this.gens = gen === undefined ? this.gens : gen;
   this.descendant_gens = descendants === undefined ?
      this.descendant_gens : descendants;

   var current_decujus = (this.sosa[1] ? this.sosa[1].id : 1);

   if (decujus !== undefined && decujus !== current_decujus) {
      this.resetData();
      current_decujus = decujus;
   }

   // If we intend to display fewer generations than are already known, no
   // need to download anything.

   if (this.loaded_generations !== undefined &&
       this.gens <= this.loaded_generations &&
       this.descendant_gens <= this.loaded_descendants)
   {
      this.setNeedLayout();
      this.refresh();
      return;
   }

   var f = this;  //  closure for callbacks
   $.ajax(
      {url: '/pedigreeData/' + current_decujus,
       data: {'gens': this.gens,
              'gens_known': this.loaded_generations || -1,
              'desc_known': this.loaded_descendants || -1,
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
 * @param {Person} person The person to display, which must have a 'generation'
 *    field set to its generation number.
 * @param {number} minRadius   For a fanchart, this is the interior radius;
 *    for a standard box, this is the height of the box.
 * @param {number} maxRadius   If set to 0, a linear gradient is used.
 * @return {DisplayAttr}  The style to apply.
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

   var attr = new DisplayAttr;

   switch (this.colorScheme) {

   case AbstractPedigree.colorScheme.RULES:
      var st = this.styles[person.style];
      st['stroke'] = 'gray';

      if (st['fill'] &&
          typeof st['fill'] == 'string' &&
          this.appearance_ == AbstractPedigree.appearance.GRADIENT)
      {
         var gr = doGradient();
         var c = $.Color(st['fill']);
         gr.addColorStop(0, c.toString());
         gr.addColorStop(1, c.transition('black', 0.2).toString());

         for (var obj in st) {
            attr[obj] = st[obj];
         }
         attr['fill'] = gr;
         return attr;
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
         gr.addColorStop(1, c);
         attr['fill'] = gr;
      } else {
         attr['fill'] = c;
      }
      attr['stroke'] = 'black';
      attr['secondaryText'] = 'gray';
      break;

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
         gr.addColorStop(1, c);
         attr['fill'] = gr;
      } else {
         attr['fill'] = c;
      }
      attr['stroke'] = 'black';
      attr['secondaryText'] = 'gray';
      break;

   case AbstractPedigree.colorScheme.WHITE:
      attr['color'] = 'black';
      attr['secondaryText'] = 'gray';
   }
   return attr;
};

/** @inheritDoc
 *  @param {number=} maxGens
 *     If specified, indicates the maximum numnber of generations.
 * */

AbstractPedigree.prototype.showSettings = function(maxGens) {
   maxGens = maxGens || MAXGENS;
   Canvas.prototype.showSettings.call(this);

   $('#settings #gens')
      .slider({'max': maxGens,
               'value': this.gens || DEFAULT_GENERATIONS})
      .find('span.right').text(maxGens);
   $('#settings #Dgens')
      .slider({'max': maxGens,
               'value': this.descendant_gens || 1})
      .find('span.right').text(maxGens);
   $('#settings select[name=appearance]').val("" + this.appearance_);
   $('#settings select[name=colors]').val("" + this.colorScheme);
   $('#settings select[name=layout]').val("" + this.layoutScheme);
};

/**
 * Draw a rectangular box for a person, at the given coordinates.
 * (x,y) are specified in pixels, so zooming and scrolling must have been
 * applied first.
 *
 * @param {Person} person    The person to display.
 * @param {Box} box
 *    The position and dimensions of the box.
 * @param {number} fontsize
 *    Size of the font (in absolute size, not actual pixels).
 */

AbstractPedigree.prototype.drawPersonBox = function(person, box, fontsize) {
    if (person) {
       var attr = this.getStyle_(person,
                                 box.h /* minRadius */,
                                 0 /* maxRadius */);
       attr['shadow'] = (box.h > 2); // force shadow

       this.ctx.save();
       this.ctx.translate(box.x, box.y);  //  to get proper gradient

       if (this.isSelected(person)) {
          this.ctx.lineWidth = 3;
       }

       if (attr['stroke'] || attr['fill']) {
          this.roundedRect(0, 0, box.w, box.h, attr);
       } else {
          this.rect(0, 0, box.w, box.h, attr);
       }
       this.drawPersonText(person, 0, 0, box.h, fontsize);
       this.ctx.restore();
    }
};

/**
 * Draw the text to describe a person. The text must fix in a box of the given
 * size, although the box itself is not displayed.
 * @param {Person} person    The person to display.
 * @param {number} x         The position at which to render.
 * @param {number} y         The position at which to render.
 * @param {number} height    The total allocated height.
 * @param {number} fontsize  The size of the font.
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
        c.save();
        c.clip();
        c.translate(x, y);

        var pos = fontsize;
        c.font = pos + 'px ' + this.fontName;
        this.text(1, 0, person.surn + ' ' + person.givn, attr);

        c.font = absFontSize + 'px italic ' + this.fontName;
        c.fillStyle = attr['secondaryText'] || c.fillStyle;

        if (linesCount >= 2 && linesCount < 5) {
            var birth = event_to_string(person.birth),
            death = event_to_string(person.death);
            c.fillText(birth + ' - ' + death, 5, pos);

        } else if (pos + absFontSize <= height) {
            var birth = event_to_string(person.birth);
            var death = event_to_string(person.death);
            var birthp = person.birth ? person.birth[1] || '' : '';
            var deathp = person.death ? person.death[1] || '' : '';
            if (pos + absFontSize <= height && birth) {
               c.fillText('b: ' + birth, 5, pos);
               pos += absFontSize;
               if (pos + absFontSize <= height && birthp) {
                  c.fillText('    ' + birthp, 5, pos);
                  pos += absFontSize;
               }
            }
            if (pos + absFontSize <= height && death) {
               c.fillText('d: ' + death, 5, pos);
               pos += absFontSize;
               if (pos + absFontSize <= height && deathp) {
                  c.fillText('    ' + deathp, 5, pos);
                  pos += absFontSize;
               }
            }
            if (pos + absFontSize <= height) {
               // Will fetch and display more information
               this.getPersonDetails(person);
               if (person.details) {
                  var d = 0;
                  while (pos + absFontSize <= height &&
                        d < person.details.length)
                  {
                     c.fillText(person.details[d], 5, pos);
                     pos += absFontSize;
                     d++;
                  }
               }
            }
        }
        c.restore(); // unset clipping mask and font
    }
};

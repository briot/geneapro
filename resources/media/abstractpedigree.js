/**
 * This package provides an abstract base class for the pedigree and fanchart
 * views, which share a number of settings (loading data asynchronously from
 * the server, various color schemes,...
 */

/** Maximum number of generations that can be displayed */
var MAXGENS = 13;

/** Default number of generations to display */
var DEFAULT_GENERATIONS = 5;

/** Construct a new canvas
 */
function AbstractPedigree(canvas, data) {
   Canvas.call(this, canvas /* elem */);
   this.data = data;
}
inherits(AbstractPedigree, Canvas);
                
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
         f.data = data;
         f.refresh();
      }});
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
};

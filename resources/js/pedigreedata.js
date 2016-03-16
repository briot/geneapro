/**
 * A class that stores the pedigree data for a person, and various
 * pieces of information to render it on screen.
 * This information is independent of any specific layout (tree, fanchart,..)
 */

app.factory('Pedigree', function($http, $q, $rootScope) {
   // A unique Id used when adding unknown ancestors. These must still have a
   // unique Id, since they might be used in hash tables or associated with
   // SVG elements
   var uniqueId = -1; 

   function Pedigree() {
      /** The id of the main person (set even before we query the server) */
      this.id = undefined;

      /** The main person (decujus) in this tree */
      this.mainPerson = undefined;

      /** All the styles to display personas
       * @type {Object.<DisplayAttr>}
       */
      this.styles = {};
   }

   /**
    * Return the id of the current decujus
    */
   Pedigree.prototype.decujus = function() {
      return this.id;
   };

   /**
    * Set the id of the new selected person
    */
   Pedigree.prototype.select = function(id) {
      id = Number(id);
      $rootScope.decujus = id;
      if (id == this.id) {
         return;
      }

      this.id = id;
      this.mainPerson = undefined;

      this.loaded_generations = undefined;
      this.loaded_descendants = undefined;

      this.requested_gens = 0;
      this.requested_desc = 0;
      this.promise_ = undefined;  // asynchronous loading
   }

   /**
    * Download the pedigree information for that person
    * @param {Number} gens   Number of ancestor generations
    * @param {Number} descendant_gens  Number of descendant generations.
    * @param {Boolean=} year_only  Whether to send full dates or only
    *    years.
    */
   Pedigree.prototype.get = function(gens, descendant_gens, year_only) {
      var self = this;

      // Shortcut when we need fewer generations than already loaded
      if (self.promise_ !== undefined &&
          gens <= self.requested_gens &&
          descendant_gens <= self.requested_desc)
      {
         return self.promise_;
      }

      this.requested_gens = Math.max(this.requested_gens, gens);
      this.requested_desc = Math.max(this.requested_desc, descendant_gens);

      var q = $q.defer();
      self.promise_ = q.promise;
      $http.get('/data/pedigree/' + self.id,
                {params: {
                    'gens': gens,
                    'descendant_gens': descendant_gens,
                    'year_only': year_only
                    //'gens_known': self.loaded_generations || -1,
                    //'desc_known': self.loaded_descendants || -1
                }}).
      then(function(resp) {
         self.setData_(resp.data);
         q.resolve(self);
      }, function() {
         this.loaded_generations = undefined; // will force a full update
         q.reject();
      });

      return self.promise_;
   };

   /**
    * Download additional details on the person (events,...) unless these
    * have already been downloaded.
    * @return A promise if some download is taking place, or undefined if
    *    details are already available in this.details.
    */

   Pedigree.prototype.getDetails = function(person) {
      if (person.details === undefined) {
         person.details = [];  // prevent a second parallel download
         return $http.get('/personaEvents/' + person.id).then(function(resp) {
            person.details = resp.data;
         });
      }
   };

   /**
    * Whether this is an unknown person
    * @return {bool}
    */
   Pedigree.prototype.isUnknown = function(p) {
      return p.id < 0;
   };
 
   /** Return the name to display for a person */
   Pedigree.prototype.displayName = function(person) {
      return (person.surn || '') + ' ' + (person.givn || ' ');
   };

   /**
    * Convert an event to a string that can be displayed.
    * @param {bool=} use_date_sort
    *    Whether to use the date (i.e. a string as entered by the user,
    *    not parsable) or the sort_date (i.e. a formatted string)
    */
   Pedigree.prototype.event_to_string = function(e, use_date_sort) {
      if (e) {
         var s = (use_date_sort ? e.date_sort : e.date) || '';
         //  Show whether the event has a source
         if (s && $rootScope.settings.sourcedEvents) {
            s += (e.sources ? ' \u2713' : ' \u2717');
         }
         return s;
      } else {
         return '';
      };
   };


   /**
    * Return the style to use for a person
    */
   Pedigree.prototype.getStyle = function(person) {
      if (person.style === undefined) {
         return {fill: 'white', stroke: 'black'};
      } else {
         return this.styles[person.style];
      }
   };

   /**
    * Add entries for unknown persons
    */
   Pedigree.prototype.addUnknown = function(gens) {
      var data = {decujus: this.main, generations: gens};

      function addParents(indiv) {
         if (indiv.generation < gens) {
            if (!indiv.parents) {
               indiv.parents = [null, null];
            }

            var father = indiv.parents[0];
            if (!father) {
               father = {id: uniqueId--,
                         generation: indiv.generation + 1,
                         sosa: indiv.sosa * 2};
               indiv.parents[0] = father;
            }
            addParents(father);

            var mother = indiv.parents[1];
            if (!mother) {
               mother = {id: uniqueId--,
                         generation: indiv.generation + 1,
                         sosa: indiv.sosa * 2 + 1};
               indiv.parents[1] = mother;
            }
            addParents(mother);
         }
      }
      addParents(this.main);

      this.setData_(data);  //  merge with existing data
   };

   /**
    * Remove all unknown persons added via addUnknown
    */
   Pedigree.prototype.removeUnknown = function() {
      var self = this;
      function _remove(p) {
         if (p.parents) {
            angular.forEach(p.parents, function(pa, idx) {
               if (pa) {
                  _remove(pa);
                  if (self.isUnknown(pa)) {
                     p.parents[idx] = undefined;
                  }
               }
            });
         }
      }
      _remove(this.main);
   };

   /**
    * Merge the pedigree data we just loaded with the one in memory.
    * This adds a number of attributes to the various personas, so that
    * we can display them with appropriate colors.
    * This function is called automatically when the data is loaded from
    * the server.
    */
   Pedigree.prototype.setData_ = function(data) {
      this.main = data['decujus']
      var dt = data['styles'];
      var dg = data['generations'];
      var dd = data['descendants'];

     if (this.loaded_generations !== undefined) {
         this.loaded_generations = Math.max(dg, this.loaded_generations);
         this.loaded_descendants = Math.max(dd, this.loaded_descendants);
      } else {
         this.loaded_generations = dg;
         this.loaded_descendants = dd;
      }

      // Merge the information

      for (var d in dt) {
         this.styles[d] = dt[d];
      }

      // Compute the angle for each visible person. This is used to
      // compute colors in some contexts

      function _setAngle(p, sosa, maxInGen) {
         var maxNextGen = maxInGen * 2;
         p.sosa = sosa;
         p.angle = (sosa - maxInGen) / maxInGen;
         if (p.parents) {
            var s = 0;
            while (s < p.parents.length) {
               if (p.parents[s]) {
                  _setAngle(p.parents[s], sosa * 2 + s, maxNextGen);
               }
               s++;
            }
         }
      }
      _setAngle(this.main, 1, 1);

      /** @param {Person} indiv  The person.
       *  @param {number} from   start angle.
       *  @param {number} to     end angle.
       */
      function _doAnglesForChildren(indiv, from, to) {
         indiv.angle = from;
         if (indiv.children) {
            var step = (to - from) / indiv.children.length;
            for (var c = 0; c < indiv.children.length; c++) {
               if (indiv.children[c]) {
                  indiv.children[c].sosa = -1;
                  indiv.children[c].parent_ = indiv;
                  _doAnglesForChildren(indiv.children[c],
                                       from + c * step,
                                       from + (c + 1) * step);
               }
            }
         }
      }
      _doAnglesForChildren(this.main, 0, 1);
   };

   return new Pedigree;
});

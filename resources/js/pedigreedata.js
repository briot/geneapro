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

   /**
    * Extra data stored for each person that needs to be represented
    * on screen
    * A person has the additional attributes:
    * - 'generation': the generation number (1 for decujus and 0 for children)
    * - 'sosa': the SOSA number (1 for decujus, 0 .. -n for children)
    * - 'angle': position of the person in the generation, from 0.0 to 1.0.
    * - 'parent_': pointer to parent person (for descendants of decujus)
    *
    * @param {Object} data   read from the server.
    * @constructor
    */
   function PersonData(data) {
      this.givn = /** @type {string} */ (data['givn']);
      this.surn = /** @type {string} */ (data['surn']);
      this.generation = /** @type {number} */ (data['generation']);
      this.id = /** @type {number} */ (data['id']);
      this.sex = /** @type {string} */ (data['sex']);
      this.style = /** @type {string} */ (data['y']);
      this.birth = /** @type {Object} */ (data['b']);
      this.death = /** @type {Object} */ (data['d']);

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

   /** Return the name to display for a person */
   PersonData.prototype.displayName = function() {
      return (this.surn || '') + ' ' + (this.givn || ' ');
   };

   /**
    * Download additional details on the person (events,...) unless these
    * have already been downloaded.
    * @return A promise if some download is taking place, or undefined if
    *    details are already available in this.details.
    */

   PersonData.prototype.getDetails = function() {
      var self = this;
      if (self.details === undefined) {
         self.details = [];  // prevent a second parallel download
         return $http.get('/personaEvents/' + self.id).then(function(resp) {
            self.details = resp.data;
         });
      }
   };
   
   /**
    * Convert an event to a string that can be displayed.
    */
   PersonData.prototype.event_to_string = function(e) {
      if (e) {
         var s = e.Date || e.date || '';
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
    * Whether this is an unknown person
    * @return {bool}
    */
   PersonData.prototype.isUnknown = function() {
      return this.id < 0;
   };

   function Pedigree() {
      /** The list of persons, indexed by their unique id.
       * @type {Object.<number,Person>}
       * @protected
       */
      this.persons = {};

      /** Marriage information for the person at the given sosa id
       * @type {Object.<number, Object>}
       */
      this.marriage = {};

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

      /** The list of persons, indexed by their sosa id.
       * @type {Object.<number, Person>}
       * @protected
       */
      this.sosa = {};

      this.loaded_generations = undefined;
      this.loaded_descendants = undefined;

      this.requested_gens = 0;
      this.requested_desc = 0;
      this.promise_ = undefined;  // asynchronous loading

      /* decujus, for which we store the pedigree info */
      this.id = id;
   }

   /**
    * Download the pedigree information for that person
    * @param {Number} gens   Number of ancestor generations
    * @param {Number} descendant_gens  Number of descendant generations.
    */
   Pedigree.prototype.get = function(gens, descendant_gens) {
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
                    'gens_known': self.loaded_generations || -1,
                    'desc_known': self.loaded_descendants || -1}}).
      then(function(resp) {
         self.setData_(resp.data);
         q.resolve(self);
         q.resolve(resp.data);
      }, function() {
         this.loaded_generations = undefined; // will force a full update
         q.reject();
      });

      return self.promise_;
   };

   /**
    * Return the style to use for a person
    */
   Pedigree.prototype.getStyle = function(person) {
      if (!person.style) {
         return {fill: 'white', stroke: 'black'};
      } else {
         return this.styles[person.style];
      }
   };

   /**
    * Create data for a new person
    * @param {Object=} data   The data read from the server.
    */
   Pedigree.prototype.createPerson = function(data) {
      if (!data) {
         data = {};
      }
      if (data.id === undefined) {
         data.id = uniqueId --;
      }
      
      return new PersonData(data);
   };

   /**
    * Add entries for unknown persons
    */
   Pedigree.prototype.addUnknown = function(gens) {
      var self = this;
      var data = {persons: {}, sosa: {}, generations: gens};

      function addParents(indiv) {
         if (indiv.generation < gens) {
            var father = self.sosa[indiv.sosa * 2];
            if (!father) {
               father = self.createPerson();
               father.generation = indiv.generation + 1;
               father.sosa = indiv.sosa * 2;
               data.persons[father.id] = father;
               data.sosa[father.sosa] = father.id;
            }
            addParents(father);

            var mother = self.sosa[indiv.sosa * 2 + 1];
            if (!mother) {
               mother = self.createPerson();
               mother.generation = indiv.generation + 1;
               mother.sosa = indiv.sosa * 2 + 1;
               data.persons[mother.id] = mother;
               data.sosa[mother.sosa] = mother.id;
            }
            addParents(mother);
         }
      }
      addParents(this.sosa[1]);

      this.setData_(data);  //  merge with existing data
   };

   /**
    * Remove all unknown persons added via addUnknown
    */
   Pedigree.prototype.removeUnknown = function() {
      var self = this;
      angular.forEach(self.persons, function(p, id) {
         if (p.isUnknown()) {
            delete self.sosa[p.sosa];
            delete self.persons[id];
         }
      });
   };

   /**
    * Merge the pedigree data we just loaded with the one in memory.
    * This adds a number of attributes to the various personas, so that
    * we can display them with appropriate colors.
    * This function is called automatically when the data is loaded from
    * the server.
    */
   Pedigree.prototype.setData_ = function(data) {
      var dp = data['persons'];
      var dg = data['generations'];
      var dd = data['descendants'];
      var ds = data['sosa'];
      var dc = data['children'];
      var dt = data['styles'];
      var dm = data['marriage'];

     if (this.loaded_generations !== undefined) {
         this.loaded_generations = Math.max(dg, this.loaded_generations);
         this.loaded_descendants = Math.max(dd, this.loaded_descendants);

      } else {
         this.loaded_generations = dg;
         this.loaded_descendants = dd;
      }

      // Merge the information

      for (var d in dp) {
         d = Number(d);
         if (!this.persons[d]) {
            this.persons[d] = this.createPerson(dp[d]);
         } else {
            this.persons[d].generation = dp[d].generation;
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

      var count = [];   // Maximum number of persons per generation
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
      function _doAnglesForChildren(indiv, from, to) {
         indiv.angle = from;
         if (indiv.children) {
            var step = (to - from) / indiv.children.length;
            for (var c = 0; c < indiv.children.length; c++) {
               if (indiv.children[c]) {
                  _doAnglesForChildren(indiv.children[c],
                                       from + c * step,
                                       from + (c + 1) * step);
               }
            }
         }
      }
      _doAnglesForChildren(this.sosa[1], 0, 1);
   };

   return new Pedigree;
});

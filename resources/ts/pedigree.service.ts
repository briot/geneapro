import {} from 'angular';
import {app} from './app';
import {IPerson, IGPRootScope, IStyle, IServerPedigreeData,
   IEvent, IStyleIdToStyle} from './basetypes';

/**
 * A class that stores the pedigree data for a person, and various
 * pieces of information to render it on screen.
 * This information is independent of any specific layout (tree, fanchart,..)
 */

export class PedigreeService {
   // A unique Id used when adding unknown ancestors. These must still have a
   // unique Id, since they might be used in hash tables or associated with
   // SVG elements
   private static uniqueId = -1; 

   id : number;  // id of the main person
   main : IPerson;   // the main person (decujus) in the tree
   styles : IStyleIdToStyle = {};  // all the styles to display personas
   loaded_generations : number = 0; // number of known ancestor gens
   loaded_descendants : number = 0; // number of known descendants
   requested_gens : number = 0;
   requested_desc : number = 0;
   promise_ : angular.IPromise<PedigreeService>;

   // Inject the necessary services in the constructor
   static $inject = ['$http', '$q', '$rootScope'];
   constructor(public $http      : angular.IHttpService,
               public $q         : angular.IQService,
               public $rootScope : IGPRootScope)
   {
   }

   /**
    * Return the id of the current decujus
    */
   decujus() {
      return this.id;
   }

   /**
    * Set the id of the new selected person
    */
   select(id : number) {
      if (id != this.id) {
         this.$rootScope.decujus = id;
         this.id = id;
         this.main = undefined;
         this.loaded_generations = undefined;
         this.loaded_descendants = undefined;
         this.requested_gens = 0;
         this.requested_desc = 0;
         this.promise_ = undefined;  // asynchronous loading
      }
   }

   /**
    * Download the pedigree information for that person
    * @param gens   Number of ancestor generations
    * @param descendant_gens  Number of descendant generations.
    * @param year_only  Whether to send full dates or only years.
    */
   get(gens : number, descendant_gens : number, year_only : boolean=false) {
      // Shortcut when we need fewer generations than already loaded
      if (this.promise_ !== undefined &&
          gens <= this.requested_gens &&
          descendant_gens <= this.requested_desc)
      {
         return this.promise_;
      }

      this.requested_gens = Math.max(this.requested_gens, gens);
      this.requested_desc = Math.max(this.requested_desc, descendant_gens);

      const q = this.$q.defer();
      this.promise_ = q.promise;
      this.$http.get('/data/pedigree/' + this.id,
                {params: {
                    'gens': gens,
                    'descendant_gens': descendant_gens,
                    'year_only': year_only
                    //'gens_known': this.loaded_generations || -1,
                    //'desc_known': this.loaded_descendants || -1
                }}).
      then(resp => {
         this.setData_(<IServerPedigreeData> resp.data);
         q.resolve(this);
      }, () => {
         this.loaded_generations = undefined; // will force a full update
         q.reject();
      });

      return this.promise_;
   }

   /**
    * Download additional details on the person (events,...) unless these
    * have already been downloaded.
    * @return A promise if some download is taking place, or undefined if
    *    details are already available in this.details.
    */
   getDetails(person : IPerson) {
      if (person.details === undefined) {
         person.details = [];  // prevent a second parallel download
         return this.$http.get('/personaEvents/' + person.id).then(resp => {
            person.details = <string[]>resp.data;
         });
      }
   }

   /**
    * Whether this is an unknown person
    */
   isUnknown(p : IPerson) : boolean {
      return p.id < 0;
   }

   /** Return the name to display for a person */
   displayName(person : IPerson) {
      return (person.surn || '') + ' ' + (person.givn || ' ');
   }

   /**
    * Convert an event to a string that can be displayed.
    * @param use_date_sort
    *    Whether to use the date (i.e. a string as entered by the user,
    *    not parsable) or the sort_date (i.e. a formatted string)
    */
   event_to_string(e : IEvent, use_date_sort=false) {
      if (e) {
         let s = (use_date_sort ? e.date_sort : e.date) || '';
         //  Show whether the event has a source
         if (s && this.$rootScope.settings.sourcedEvents) {
            s += (e.sources ? ' \u2713' : ' \u2717');
         }
         return s;
      } else {
         return '';
      };
   }

   /**
    * Return the style to use for a person
    */
   getStyle(person : IPerson) : IStyle {
      if (person.style === undefined) {
         return {fill: 'white', stroke: 'black', color: 'black'};
      } else {
         return this.styles[person.style];
      }
   }

   /**
    * Add entries for unknown persons
    */
   addUnknown(gens : number) {
      const data : IServerPedigreeData = {
         decujus: this.main,
         generations: gens
      };

      function addParents(indiv : IPerson) {
         if (indiv.generation < gens) {
            if (!indiv.parents) {
               indiv.parents = [null, null];
            }

            let father = indiv.parents[0];
            if (!father) {
               father = {id: PedigreeService.uniqueId--,
                         name: undefined,
                         generation: indiv.generation + 1,
                         sosa: indiv.sosa * 2};
               indiv.parents[0] = father;
            }
            addParents(father);

            let mother = indiv.parents[1];
            if (!mother) {
               mother = {id: PedigreeService.uniqueId--,
                         name: undefined,
                         generation: indiv.generation + 1,
                         sosa: indiv.sosa * 2 + 1};
               indiv.parents[1] = mother;
            }
            addParents(mother);
         }
      }
      addParents(this.main);

      this.setData_(data);  //  merge with existing data
   }

   /**
    * Remove all unknown persons added via addUnknown
    */
   removeUnknown() {
      const _remove = (p : IPerson) => {
         if (p.parents) {
            angular.forEach(p.parents, (pa, idx) => {
               if (pa) {
                  _remove(pa);
                  if (this.isUnknown(pa)) {
                     p.parents[idx] = undefined;
                  }
               }
            });
         }
      }
      _remove(this.main);
   }

   /**
    * Merge the pedigree data we just loaded with the one in memory.
    * This adds a number of attributes to the various personas, so that
    * we can display them with appropriate colors.
    * This function is called automatically when the data is loaded from
    * the server.
    */
   setData_(data : IServerPedigreeData) {
      this.main = data['decujus']
      const dt = data['styles'];
      const dg = data['generations'];
      const dd = data['descendants'];

     if (this.loaded_generations !== undefined) {
         this.loaded_generations = Math.max(dg, this.loaded_generations);
         this.loaded_descendants = Math.max(dd, this.loaded_descendants);
      } else {
         this.loaded_generations = dg;
         this.loaded_descendants = dd;
      }

      // Merge the information

      for (let d in dt) {
         this.styles[d] = dt[d];
      }

      // Compute the angle for each visible person. This is used to
      // compute colors in some contexts

      function _setAngle(p : IPerson, sosa : number, maxInGen : number) {
         const maxNextGen = maxInGen * 2;
         p.sosa = sosa;
         p.angle = (sosa - maxInGen) / maxInGen;
         if (p.parents) {
            let s = 0;
            while (s < p.parents.length) {
               if (p.parents[s]) {
                  _setAngle(p.parents[s], sosa * 2 + s, maxNextGen);
               }
               s++;
            }
         }
      }
      _setAngle(this.main, 1, 1);

      /**
       *  @param indiv  The person.
       *  @param from   start angle.
       *  @param to     end angle.
       */
      function _doAnglesForChildren(indiv : IPerson, from : number, to : number) {
         indiv.angle = from;
         if (indiv.children) {
            const step = (to - from) / indiv.children.length;
            for (let c = 0; c < indiv.children.length; c++) {
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
   }
}

app.service('Pedigree', PedigreeService);

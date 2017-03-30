import {Injectable, EventEmitter} from '@angular/core';
import {Http, URLSearchParams} from '@angular/http';
import {Observable} from 'rxjs';
import {Settings} from './settings.service';
import {PersonaService} from './persona.service';
import {IPerson, IStyle, IEvent, IStyleIdToStyle} from './basetypes';

/**
 * This class provides information about the pedigree for a given person.
 * Starting from that person, it lists (recursively) the parents and children.
 * This class is not injectable, and can only be created via a PedigreeService
 */
export class PedigreeData {
   // A unique Id used when adding unknown ancestors. These must still have a
   // unique Id, since they might be used in hash tables or associated with
   // SVG elements
   private static uniqueId = -1; 

   decujus     : IPerson;  // the root person
   styles      : IStyleIdToStyle = {}; // The global styles (a person.style references this)
   generations : number = 0;  // number of ancestors gens to compute
   descendants : number = 0;  // number of descendant gens to compute

   // Additional details for a person
   details     : { [id:number]: Observable<string[]>} = {};

   constructor(
      private personas    : PersonaService,
      private settings    : Settings,
      private decujus_id  : number)
   {
   }

   /**
    * Whether `this` already contains the information for the given person's
    * ancestors and descendants
    */
   contains(id : number, generations : number, descendants : number) {
      return (this.decujus_id == id &&
              generations <= this.generations &&
              descendants <= this.descendants);
   }

   /**
    * Download additional details on the person (events,...) unless these
    * have already been downloaded.
    * @return A promise if some download is taking place, or undefined if
    *    details are already available in this.details.
    */
   getDetails(person : IPerson) {
      if (this.details[person.id] === undefined) {
         this.details[person.id] = this.personas.getDetails(person.id);
      }
   }

   /**
    * Return the name to display for a person
    */ 
   displayName(person : IPerson) {
      return (person.surn || '') + ' ' + (person.givn || ' ');
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
    * Recursively compute the angles for each person. This is used to
    * compute colors in some contexts
    */
   private static setAngle(p : IPerson, sosa : number, maxInGen : number) {
      const maxNextGen = maxInGen * 2;
      p.sosa = sosa;
      p.angle = (sosa - maxInGen) / maxInGen;
      if (p.parents) {
         let s = 0;
         while (s < p.parents.length) {
            if (p.parents[s]) {
               PedigreeData.setAngle(p.parents[s], sosa * 2 + s, maxNextGen);
            }
            s++;
         }
      }
   }

   /**
    * Recursively compute angle data for children generations
    *  @param indiv  The person.
    *  @param from   start angle.
    *  @param to     end angle.
    */
   private static setChildrenAngle(p : IPerson, from : number, to : number) {
      p.angle = from;
      if (p.children) {
         const step = (to - from) / p.children.length;
         for (let c = 0; c < p.children.length; c++) {
            if (p.children[c]) {
               p.children[c].sosa = -1;
               p.children[c].parent_ = p;
               PedigreeData.setChildrenAngle(
                  p.children[c], from + c * step, from + (c + 1) * step);
            }
         }
      }
   }

   /**
    * Merge the pedigree data we just loaded with the one in memory.
    * This adds a number of attributes to the various personas, so that
    * we can display them with appropriate colors.
    */
   setData(decujus     : IPerson,
           styles      : IStyleIdToStyle,
           generations : number,
           descendants : number)
   {
      // ??? Should merge data instead so that we can load partial data
      this.decujus = decujus;
      this.generations = Math.max(generations, this.generations);
      this.descendants = Math.max(descendants, this.descendants);

      for (let d in styles) {
         this.styles[d] = styles[d];
      }

      PedigreeData.setAngle(this.decujus, 1, 1);
      PedigreeData.setChildrenAngle(this.decujus, 0, 1);
   }

   /**
    * Whether this is an unknown person, added via addUknown
    */
   isMissing(p : IPerson) : boolean {
      return p.id < 0;
   }

   /**
    * Create a new missing person
    */
   private newMissing(generation : number, sosa : number) : IPerson {
       return {
          id: PedigreeData.uniqueId--,
          name: undefined,
          generation: generation,
          sosa: sosa};
   }

   /**
    * Add entries for missing persons in the pedigree tree.
    * ??? Should we pass the number of generations
    */
   addMissingPersons() {
      const addParents = (indiv : IPerson) => {
         if (indiv.generation >= this.generations) {
            return;
         }

         if (!indiv.parents) {
            indiv.parents = [null, null];
         }

         let father = indiv.parents[0];
         if (!father) {
            father = this.newMissing(indiv.generation + 1, indiv.sosa * 2);
            indiv.parents[0] = father;
         }
         addParents(father);

         let mother = indiv.parents[1];
         if (!mother) {
            mother = this.newMissing(indiv.generation + 1, indiv.sosa * 2 + 1);
            indiv.parents[1] = mother;
         }
         addParents(mother);
      }
      addParents(this.decujus);
   }

   /**
    * Remove all unknown persons
    */
   removeMissing() {
      const _remove = (p : IPerson) => {
         if (p.parents) {
            p.parents.forEach((pa, idx) => {
               if (pa) {
                  _remove(pa);
                  if (this.isMissing(pa)) {
                     p.parents[idx] = undefined;
                  }
               }
            });
         }
      }
      _remove(this.decujus);
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
         if (s && this.settings.sourcedEvents) {
            s += (e.sources ? ' \u2713' : ' \u2717');
         }
         return s;
      } else {
         return '';
      };
   }
}

/**
 * A class that stores the pedigree data for a person, and various
 * pieces of information to render it on screen.
 * This information is independent of any specific layout (tree, fanchart,..)
 */

@Injectable()
export class PedigreeService {
   styles : IStyleIdToStyle = {};  // all the styles to display personas
   requested_gens : number = 0;
   requested_desc : number = 0;

   // The current data, which will be changed when another person is set
   // as root, or additional generations are requested.
   private data   : PedigreeData;

   constructor(private http     : Http,
               private personas : PersonaService,
               private settings : Settings) {
   }

   /**
    * Download the pedigree information for that person
    * @param id     Id of the root person
    * @param gens   Number of ancestor generations
    * @param descendant_gens  Number of descendant generations.
    * @param year_only  Whether to send full dates or only years.
    */
   get(id              : number,
       gens            : number,
       descendant_gens : number,
       year_only       : boolean=false) : Observable<PedigreeData>
  {
     // Shortcut when we need fewer generations than already loaded
     if (this.data !== undefined &&
         this.data.contains (id, gens, descendant_gens))
     {
        return Observable.of(this.data);
     } else {
        let params = new URLSearchParams();
        params.set('gens',            gens.toString());
        params.set('descendant_gens', descendant_gens.toString());
        params.set('year_only',       year_only.toString());
        return this.http.get('/data/pedigree/' + id, {search: params})
           .map(resp => {
              let r = resp.json();
              this.data = new PedigreeData(this.personas, this.settings, id);
              this.data.setData(
                 r.decujus, r.styles, r.generations, r.descendants);
              return this.data;
           });
     }
   }

   /**
    * The current decuju
    */
   decujus() : IPerson {
      if (this.data) {
         return this.data.decujus;
      }
   }
}

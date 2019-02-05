import { jsonPersonsToPerson } from '../Server/Person';
import { ChildrenAndParentsSet } from '../Store/Pedigree';
import { fetchPedigreeResult } from '../Store/Sagas';
import * as JSON from './JSON';

/**
 * Sent back by the server
 */

interface JSONPedigree {
   decujus: number;
   generations: number;  // including decujus
   descendants: number;
   persons: JSON.Person[];
   layout: ChildrenAndParentsSet;

   allstyles?: {[id: number]: JSON.Style};  // all used styles
   styles?: {[person: number]: number};   // person-to-style mapping
}

/**
 * get pedigree information for `decujus`, up to a number of
 * generations.
 */
export function* fetchPedigreeFromServer(
   decujus: number, ancestors: number, descendants: number
) {

   const resp: Response = yield window.fetch(
      '/data/pedigree/' + decujus +
      '?gens=' + (ancestors + 1) +
      '&descendant_gens=' + (descendants));
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONPedigree = yield resp.json();
   const result: fetchPedigreeResult = {
      ...jsonPersonsToPerson(
         data,
         data.allstyles,
         data.styles),
      events: {},
      layout: data.layout,
   };

   result.persons[data.decujus].knownAncestors = data.generations;
   result.persons[data.decujus].knownDescendants = data.descendants;
   return result;
}

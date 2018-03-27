import { Person } from '../Store/Person';
import { jsonPersonToPerson, FetchPersonsResult } from '../Server/Person';
import { JSON } from './JSON';

/**
 * Sent back by the server
 */

interface JSONPedigree extends JSON.Persons {
   decujus: number;
   generations: number;  // including decujus
   descendants: number;
   styles: JSON.Style[];
   p: Person;
}

/**
 * get pedigree information for `decujus`, up to a number of
 * generations.
 */
export function* fetchPedigreeFromServer(
   decujus: number, ancestors: number, descendants: number) {

   const resp: Response = yield window.fetch(
      '/data/pedigree/' + decujus +
      '?gens=' + (ancestors + 1) +
      '&descendant_gens=' + (descendants));
   if (resp.status !== 200) {
      throw new Error('Server returned an error');
   }

   const data: JSONPedigree = yield resp.json();
   const result: FetchPersonsResult = jsonPersonToPerson(data, data.styles);
   result.persons[data.decujus].knownAncestors = data.generations;
   result.persons[data.decujus].knownDescendants = data.descendants;
   return result;
}

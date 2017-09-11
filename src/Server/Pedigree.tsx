import { BasePerson, Person, PersonSet } from '../Store/Person';

/**
 * Sent back by the server
 */
interface JSONPerson extends BasePerson {
   parents?: (null|number)[];
   children?: (null|number)[];
}

interface JSONPedigree {
   decujus: number;
   persons: JSONPerson[];
   generations: number;  // including decujus
   descendants: number;
   // styles; any[];
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
   const persons: PersonSet = data.persons;
   persons[data.decujus] = {
      ...data.persons[data.decujus],
      knownAncestors: data.generations,
      knownDescendants: data.descendants,
   };
   return persons;
}

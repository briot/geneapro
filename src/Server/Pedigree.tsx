import { BasePerson, Person } from '../Store/Person';

/**
 * Sent back by the server
 */
interface JSONPerson extends BasePerson {
   parents?: (null|JSONPerson)[];
   children?: (null|JSONPerson)[];
}

interface JSONPedigree {
   decujus: JSONPerson;
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

   // We'll need to improve the server, but for now keep it compatible
   // with the Angular frontend
   const persons: {[id: number]: Person} = {};

   const recurse = (p: JSONPerson) => {
      let parents: (number|null)[] = [];
      let children: (number|null)[] = [];
      if (p.parents) {
         for (let idx = 0; idx < p.parents.length; idx++) {
            const pa = p.parents[idx];
            if (pa) {
               recurse(pa);
               parents.push(pa.id);
            } else {
               parents.push(null);
            }
         }
      }
      if (p.children) {
         for (let idx = 0; idx < p.children.length; idx++) {
            const child = p.children[idx];
            if (child) {
               recurse(child);
               children.push(child.id);
            } else {
               children.push(null);
            }
         }
      }

      // If we already had a person, we need to merge its known
      // parents and children: otherwise, if we loaded A, we have this
      // information. Then if we load a parent of A, it resets its
      // parents, and preserve knownAncestors, which means we won't be
      // fetching A again.
      // An alternative is to reset knownAncestors and knownParents to
      // force a fetch later.

      persons[p.id] = {
         ...p, parents, children,
         knownAncestors: decujus === p.id ? ancestors : 0,
         knownDescendants: decujus === p.id ? descendants : 0,
      };
   };
   recurse(data.decujus);
   return persons;
}

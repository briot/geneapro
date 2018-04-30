import { AssertionList } from '../Store/Assertion';
import { PersonStyle } from '../Store/Styles';

// The base type is only needed until the server returns a proper Person.
export interface BasePerson {
   id: number;
   name: string;             // as found in the source document

   birthISODate?: string;    // dates, using the 'date_sort' from the database
   deathISODate?: string;
   marriageISODate?: string;

   knownAncestors: number;     // number of known ancestors generations in store
   knownDescendants: number;   // number of known descendants gens in store
      // The above two fields are also set while the background loading occurs,
      // so they do not reflect the exact current state of the store.

   style?: PersonStyle;      // custom style specified by user
}

export interface Person extends BasePerson {
   // Those are only known after asking for a person's pedigree
   parents?: (number|null)[];
   children?: (number|null)[];

   // Those are only known after asking for a person's details
   asserts?: AssertionList;
}

export interface PersonSet {
  [id: number]: Person;
  // A given person might be known by several ids (one for each person that
  // makes it up). We have an entry for each id, and share the data. This
  // means that we might be downloading information multiple times if we
  // do not already know about the id, of course.
}

/**
 * Return the display name for the person
 */
export function personDisplay(p?: Person, withId?: boolean) {
   return p ?
      (withId ? `${p.name} (${p.id})` : p.name) :
      '';
}

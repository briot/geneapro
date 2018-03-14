import { P2E, P2C } from './Assertion';

// The base type is only needed until the server returns a proper Person.
export interface BasePerson {
   id: number;
   givn: string;
   surn: string;
   birthEventId?: number;    // points to a GenealogyEvent in the state
   deathEventId?: number;    // points to a GenealogyEvent in the state
   marriageEventId?: number; // points to a GenealogyEvent in the state

   knownAncestors: number;     // number of known ancestors generations in store
   knownDescendants: number;   // number of known descendants gens in store
      // The above two fields are also set while the background loading occurs,
      // so they do not reflect the exact current state of the store.

}

export interface Person extends BasePerson {
   // Those are only known after asking for a person's pedigree
   parents?: (number|null)[];
   children?: (number|null)[];

   // Those are only known after asking for a person's details
   events?: P2E[];
   chars?: P2C[];
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
export function personDisplay(p?: Person) {
   return p ? `${p.surn.toUpperCase()} ${p.givn} (${p.id})` : '';
}

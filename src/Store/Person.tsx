export interface EventAndRole {
   role: string;
   eventId: number;  // points to a GenealogyEvent in the state
}

export interface CharacteristicPart {
   name: string;
   value: string;
}

export interface Characteristic {
   date?: string;
   date_sort?: string;
   name: string;
   placeId?: number;  // points to a Place in the state
   parts: CharacteristicPart[];
}

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
   events?: EventAndRole[];

   chars?: Characteristic[];
}

export interface PersonSet {
  [id: number]: Person;
  // A given person might be known by several ids (one for each person that
  // makes it up). We have an entry for each id, and share the data. This
  // means that we might be downloading information multiple times if we
  // do not already know about the id, of course.
}

/**
 * Create an empty person record that only contains the id.
 */
export function personPlaceholder(id: number) {
   return {id: id,
           givn: '',
           surn: '',
   };
}

/**
 * Return the display name for the person
 */
export function personDisplay(p?: Person) {
   return p ? `${p.surn.toUpperCase()} ${p.givn} (${p.id})` : '';
}

import { actionCreator } from '../Store/Actions';
import { Place, GenealogyEvent } from '../Store/Event';

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
   place?: Place;
   parts: CharacteristicPart[];
}

// The base type is only needed until the server returns a proper Person.
export interface BasePerson {
   id: number;
   givn: string;
   surn: string;
   birth?: GenealogyEvent;
   death?: GenealogyEvent;
   marriage?: GenealogyEvent;

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

export enum HistoryKind {
   PERSON = 0,
   PLACE = 1,
}

export interface HistoryItem {
   id: number;
   display: string;
   kind: HistoryKind;
}

/**
 * Action: add a person to the history of visited persons
 */
export const addToHistory = actionCreator<{
   person?: Person;
}>('DATA/HISTORY');

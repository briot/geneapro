import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { Person, addToHistory, HistoryItem, HistoryKind } from '../Store/Person';
import { fetchPedigree, fetchPersonDetails, fetchPersons,
         fetchEventDetails } from '../Store/Sagas';
import { GenealogyEventSet, addEvents } from '../Store/Event';
import { EventDetails } from '../Server/Event';
import { DetailsResult } from '../Server/Person';

/**
 * Reducer for persons
 */
export function personsReducer(
   state: {[id: number]: Person} = {},
   action: Redux.Action
) {
   if (isType(action, fetchPedigree.done)) {
      let persons = {...state};
      const diff: {[id: number]: Person} = action.payload.result;
      for (let idstr of Object.keys(diff)) {
         const id = Number(idstr);
         // Should merge with care ???
         persons[id] = {knownAncestors: 0,   // default
                        knownDescendants: 0, // default
                        ...persons[id],      // preserve existing info
                        ...diff[id]          // override with new info
                       };
         if (action.payload.params.decujus === id) {
            persons[id].knownAncestors = action.payload.params.ancestors;
            persons[id].knownDescendants = action.payload.params.descendants;
         }
      }
      return persons;

   } else if (isType(action, fetchPersons.done)) {
      let persons = {...state};
      for (const p of action.payload.result) {
         persons[p.id] = p;
         persons[p.id].knownAncestors = 0;
         persons[p.id].knownDescendants = 0;
      }
      return persons;

   } else if (isType(action, fetchPersonDetails.done)) {
      const data: DetailsResult = action.payload.result as DetailsResult;

      // ??? Should merge
      const result = {...state, [data.person.id]: data.person};

      // Create an alias if necessary, in case the person was referenced
      // by one of its personas
      if (action.payload.params.id !== data.person.id) {
         result[action.payload.params.id] = result[data.person.id];
      }

      return result;
   }
   return state;
}

/**
 * Reducer for events
 */
export function eventsReducer(
   state: GenealogyEventSet = {},
   action: Redux.Action
) {
   if (isType(action, addEvents)) {
      return {...state, ...action.payload.events};
   } else if (isType(action, fetchEventDetails.done)) {
      const result = {...state};
      const {id, persons} = action.payload.result as EventDetails;
      if (id in result) {
         result[id] = {...result[id], persons: persons};
      } else {
         result[id] = {
            id: id,
            name: '',  // ??? Server should send this information back
            persons: persons,
         };
      }
      return result;
   }

   return state;
}

/**
 * Reducer for history
 */
export function historyReducer(
   state: HistoryItem[] = [],
   action: Redux.Action
) {
   if (isType(action, addToHistory)) {
      const MAX_HISTORY_SIZE = 15;
      const p = action.payload.person;
      if (p) {
         const idx = state.findIndex((h: HistoryItem) => h.id === p.id);
         const item: HistoryItem = {
            id: p.id,
            display: p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')',
            kind: HistoryKind.PERSON};
         if (idx >= 0) {
            return [item]
               .concat(state.slice(0, idx))
               .concat(state.slice(idx + 1));
         } else {
            return [item].concat(state.slice(0, MAX_HISTORY_SIZE));
         }
      } else {
         return state;
      }

   } else {
      return state;
   }
}

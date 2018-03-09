import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { Person } from '../Store/Person';
import { addToHistory, HistoryItem, HistoryKind } from '../Store/History';
import { fetchPedigree, fetchPedigreeResult, fetchPersonDetails, fetchPersons,
         fetchEventDetails, fetchSourceDetails, fetchSources,
         fetchPlaces } from '../Store/Sagas';
import { GenealogyEventSet, addEvents } from '../Store/Event';
import { PlaceSet } from '../Store/Place';
import { Source, SourceSet } from '../Store/Source';
import { EventDetails } from '../Server/Event';
import { DetailsResult, FetchPersonsResult } from '../Server/Person';
import { FetchSourcesResult } from '../Server/Source';
import { FetchPlacesResult } from '../Server/Place';
import { fetchQuilts } from '../Store/Sagas';

/**
 * Reducer for persons
 */
export function personsReducer(
   state: {[id: number]: Person} = {},
   action: Redux.Action
) {
   if (isType(action, fetchPedigree.done)) {
      let persons = {...state};
      const diff: fetchPedigreeResult = action.payload.result;
      for (let idstr of Object.keys(diff.persons)) {
         const id = Number(idstr);
         // Should merge with care ???
         persons[id] = {knownAncestors: 0,   // default
                        knownDescendants: 0, // default
                        ...persons[id],      // preserve existing info
                        ...diff.persons[id]          // override with new info
                       };
         if (action.payload.params.decujus === id) {
            persons[id].knownAncestors = action.payload.params.ancestors;
            persons[id].knownDescendants = action.payload.params.descendants;
         }
      }
      return persons;

   } else if (isType(action, fetchPersons.done)) {
      const data = action.payload.result as FetchPersonsResult;
      return {...state, ...data.persons};

   } else if (isType(action, fetchQuilts.done)) {
      // Update decujus info, so that the name is correctly displayed in side
      // panel
      window.console.log('MANU should change quilts JSON result so that we can'
                         + 'easily access persons data by id');

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

   } else if (isType(action, fetchPersons.done)) {
      const data = action.payload.result as FetchPersonsResult;
      return {...state, ...data.events};

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

   } else if (isType(action, fetchPedigree.done)) {
      const {events} = action.payload.result as fetchPedigreeResult;
      return {...state, ...events};

   } else if (isType(action, fetchPersonDetails.done)) {
      const {events} = action.payload.result as DetailsResult;
      return {...state, ...events};
   }

   return state;
}

/**
 * Reducer for places
 */
export function placesReducer(
   state: PlaceSet = {},
   action: Redux.Action
) {
   if (isType(action, fetchPersonDetails.done)) {
      const {places} = action.payload.result as DetailsResult;
      return {...state, ...places};
   } else if (isType(action, fetchPlaces.done)) {
      const {places} = action.payload.result as FetchPlacesResult;
      return {...state, ...places};
   }
   return state;
}

/**
 * Reducer for sources
 */
export function sourcesReducer(
   state: SourceSet = {},
   action: Redux.Action
) {
   if (isType(action, fetchSourceDetails.done)) {
      const result = {...state};
      const source = action.payload.result as Source;
      if (source.id in result) {
         result[source.id] = {...result[source.id], ...source};
      } else {
         result[source.id] = source;
      }
      return result;

   } else if (isType(action, fetchSources.done)) {
      const data = action.payload.result as FetchSourcesResult;
      const result = {...state};
      for (const s of Object.values(data.sources)) {
         result[s.id] = s;
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
      let item: HistoryItem;

      const p = action.payload.person;
      const s = action.payload.source;
      if (p) {
         item = {
            id: p.id,
            display: p.surn.toUpperCase() + ' ' + p.givn + ' (' + p.id + ')',
            kind: HistoryKind.PERSON,
         };
      } else if (s) {
         item = {
            id: s.id,
            display: s.abbrev,
            kind: HistoryKind.SOURCE,
         };
      } else {
         return state;
      }

      const idx = state.findIndex((h: HistoryItem) => h.id === item.id);
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
}

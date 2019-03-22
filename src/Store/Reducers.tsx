import * as Redux from "redux";
import { isType } from "typescript-fsa";
import { AppState, rehydrate } from "../Store/State";
import { personDisplay, PersonSet } from "../Store/Person";
import { SourceSet } from "../Store/Source";
import { addToHistory, HistoryItem, HistoryKind } from "../Store/History";
import {
   fetchPedigree,
   FetchPedigreeResult,
   fetchPersonDetails,
   fetchEventDetails,
   fetchSourceDetails,
   fetchSources,
   fetchCount,
   fetchMetadata,
   fetchPlaces,
   fetchPlaceDetails,
   fetchQuilts
} from "../Store/Sagas";
import { addEvents } from "../Store/Event";
import { EventDetails } from "../Server/Event";
import { DetailsResult, FetchPersonsResult } from "../Server/Person";
import { FetchSourcesResult, FetchSourceDetailsResult } from "../Server/Source";
import { FetchPlacesResult, PlaceDetails } from "../Server/Place";
import { defaultPedigree, changePedigreeSettings } from "../Store/Pedigree";
import { defaultFanchart, changeFanchartSettings } from "../Store/Fanchart";
import {
   defaultPersonaList,
   changePersonaListSettings
} from "../Store/PersonaList";
import { defaultRadial, changeRadialSettings } from "../Store/Radial";
import { defaultStats, changeStatsSettings } from "../Store/Stats";
import { defaultQuilts, changeQuiltsSettings } from "../Store/Quilts";
import * as Server from "../Server/Post";

/**
 * Merge existing data for persons with new data read from an action
 */

function mergePersons(state: PersonSet, action: PersonSet) {
   let result: PersonSet = { ...state };

   for (const [id, p] of Object.entries(action)) {
      const n = Number(id);
      result[n] = { ...result[n], ...p };
   }

   return result;
}

/**
 * Merge existing data for sources
 */

function mergeSources(state: SourceSet, action: SourceSet) {
   let result: SourceSet = { ...state };
   for (const [id, p] of Object.entries(action)) {
      const n = Number(id);
      result[n] = { ...result[n], ...p };
   }
   return result;
}

/**
 * Global reducer
 * Since the actions in practice impact several fields of the state, it is
 * difficult to use multiple reducers. Instead, we group all actions into a
 * single reducer
 */

export function rootReducer(
   state: AppState = {
      persons: {},
      events: {},
      pedigree: defaultPedigree,
      fanchart: defaultFanchart,
      radial: defaultRadial,
      personalist: defaultPersonaList,
      quilts: defaultQuilts,
      quiltsLayout: {},
      stats: defaultStats,
      places: {},
      sources: {},
      history: [],
      researchers: {},
      count: undefined,
      lastFetchedTheme: -1,
      metadata: {
         characteristic_types: [],
         event_types: [],
         event_type_roles: [],
         theme_operators: [],
         themes: []
      }
   },
   action: Redux.Action
): AppState {
   if (isType(action, addEvents)) {
      return {
         ...state,
         events: { ...state.events, ...action.payload.events }
      };
   } else if (isType(action, addToHistory)) {
      const MAX_HISTORY_SIZE = 30;
      let item: HistoryItem;

      const p = action.payload.person;
      const s = action.payload.source;
      const pl = action.payload.place;
      if (p) {
         item = {
            id: p.id,
            display: personDisplay(p),
            kind: HistoryKind.PERSON
         };
      } else if (s) {
         item = {
            id: s.id,
            display: s.abbrev,
            kind: HistoryKind.SOURCE
         };
      } else if (pl) {
         item = {
            id: pl.id,
            display: pl.name,
            kind: HistoryKind.PLACE
         };
      } else {
         return state;
      }

      const idx = state.history.findIndex((h: HistoryItem) => h.id === item.id);
      return {
         ...state,
         history:
            idx >= 0
               ? [item]
                    .concat(state.history.slice(0, idx))
                    .concat(state.history.slice(idx + 1))
               : [item].concat(state.history.slice(0, MAX_HISTORY_SIZE))
      };
   } else if (isType(action, changeFanchartSettings)) {
      return {
         ...state,
         fanchart: { ...state.fanchart, ...action.payload.diff }
      };
   } else if (isType(action, changePedigreeSettings)) {
      return {
         ...state,
         pedigree: { ...state.pedigree, ...action.payload.diff }
      };
   } else if (isType(action, changePersonaListSettings)) {
      return {
         ...state,
         personalist: { ...state.personalist, ...action.payload.diff }
      };
   } else if (isType(action, changeQuiltsSettings)) {
      return { ...state, quilts: { ...state.quilts, ...action.payload.diff } };
   } else if (isType(action, changeRadialSettings)) {
      return { ...state, radial: { ...state.radial, ...action.payload.diff } };
   } else if (isType(action, changeStatsSettings)) {
      return { ...state, stats: { ...state.stats, ...action.payload.diff } };
   } else if (isType(action, fetchCount.done)) {
      return { ...state, count: action.payload.result };
   } else if (isType(action, fetchEventDetails.done)) {
      const data = action.payload.result as EventDetails;
      return {
         ...state,
         events: {
            ...state.events,
            [data.id]: { ...state.events[data.id], asserts: data.asserts }
         },
         places: { ...state.places, ...data.places },
         sources: mergeSources(state.sources, data.sources),
         researchers: { ...state.researchers, ...data.researchers },
         persons: mergePersons(state.persons, data.persons)
      };
   } else if (isType(action, fetchMetadata.done)) {
      return { ...state, metadata: { ...action.payload.result } };
   } else if (isType(action, fetchPedigree.started)) {
      return {
         ...state,
         radial: { ...state.radial, loading: true },
         pedigree: { ...state.pedigree, loading: true }
      };
   } else if (isType(action, fetchPedigree.failed)) {
      return {
         ...state,
         radial: { ...state.radial, loading: false },
         pedigree: { ...state.pedigree, loading: false }
      };
   } else if (isType(action, fetchPedigree.done)) {
      let persons = { ...state.persons };
      const data: FetchPedigreeResult = action.payload.result;
      for (let idstr of Object.keys(data.persons)) {
         const id = Number(idstr);
         // Should merge with care ???
         persons[id] = {
            knownAncestors: 0, // default
            knownDescendants: 0, // default
            ...persons[id], // preserve existing info
            ...data.persons[id], // override with new info
            ...data.layout[id] // parents and children
         };
         if (action.payload.params.decujus === id) {
            persons[id].knownAncestors = action.payload.params.ancestors;
            persons[id].knownDescendants = action.payload.params.descendants;
         }
      }
      return {
         ...state,
         persons,
         lastFetchedTheme: action.payload.params.theme,
         radial: { ...state.radial, loading: false },
         events: { ...state.events, ...action.payload.result.events },
         pedigree: { ...state.pedigree, loading: false }
      };
   } else if (isType(action, fetchPersonDetails.done)) {
      const data: DetailsResult = action.payload.result as DetailsResult;

      // ??? Should merge
      const persons = {
         ...state.persons,
         ...data.persons,
         [data.person.id]: data.person
      };

      // Create an alias if necessary, in case the person was referenced
      // by one of its personas
      if (action.payload.params.id !== data.person.id) {
         persons[action.payload.params.id] = persons[data.person.id];
      }

      return {
         ...state,
         events: { ...state.events, ...data.events },
         places: { ...state.places, ...data.places },
         researchers: { ...state.researchers, ...data.researchers },
         sources: mergeSources(state.sources, data.sources),
         persons
      };
   } else if (isType(action, fetchPlaces.done)) {
      const data = action.payload.result as FetchPlacesResult;
      return { ...state, places: { ...state.places, ...data.places } };
   } else if (isType(action, fetchPlaceDetails.done)) {
      const data: PlaceDetails = action.payload.result as PlaceDetails;
      return {
         ...state,
         events: { ...state.events, ...data.events },
         places: { ...state.places, ...data.places },
         sources: mergeSources(state.sources, data.sources),
         researchers: { ...state.researchers, ...data.researchers },
         persons: mergePersons(state.persons, data.persons)
      };
   } else if (isType(action, fetchQuilts.started)) {
      return { ...state, quilts: { ...state.quilts, loading: true } };
   } else if (isType(action, fetchQuilts.failed)) {
      return { ...state, quilts: { ...state.quilts, loading: false } };
   } else if (isType(action, fetchQuilts.done)) {
      // Update decujus info, so that the name is correctly displayed in side
      // panel
      const ps = action.payload.result.persons;
      let persons = { ...state.persons };
      for (let [id, p] of Object.entries(ps)) {
         const n = Number(id);
         persons[n] = { ...persons[n], ...p };
      }
      return {
         ...state,
         persons,
         quiltsLayout: { ...state.quiltsLayout, layout: action.payload.result },
         quilts: { ...state.quilts, loading: false }
      };
   } else if (isType(action, fetchSourceDetails.done)) {
      const data = action.payload.result as FetchSourceDetailsResult;
      const sources = mergeSources(state.sources, data.sources);
      if (data.source.id in sources) {
         sources[data.source.id] = {
            ...sources[data.source.id],
            ...data.source
         };
      } else {
         sources[data.source.id] = data.source;
      }
      return {
         ...state,
         events: { ...state.events, ...data.events },
         sources,
         places: { ...state.places, ...data.places },
         researchers: { ...state.researchers, ...data.researchers },
         persons: mergePersons(state.persons, data.persons)
      };
   } else if (isType(action, fetchSources.done)) {
      const data = action.payload.result as FetchSourcesResult;
      return { ...state, sources: mergeSources(state.sources, data.sources) };
   } else if (isType(action, rehydrate)) {
      const name = "csrftoken=";
      if (document.cookie) {
         const cookies = document.cookie.split(";");
         for (const c of cookies) {
            if (c.trim().startsWith(name)) {
               const val = c.substring(name.length);
               Server.setCsrf(val);
               break;
            }
         }
      }

      return {
         ...state,
         fanchart: {
            ...state.fanchart,
            ...action.payload.fanchart,
            loading: false
         },
         radial: { ...state.radial, ...action.payload.radial, loading: false },
         quilts: { ...state.quilts, ...action.payload.quilts, loading: false },
         pedigree: {
            ...state.pedigree,
            ...action.payload.pedigree,
            loading: false
         },
         stats: { ...state.stats, ...action.payload.stats }
      };
   }
   return state;
}

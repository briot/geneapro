import * as Redux from "redux";
import { isType } from "typescript-fsa";
import { AppState, rehydrate } from "../Store/State";
import { to_dict } from '../History';
import { Source } from "../Store/Source";
import { addToHistory, HistoryItem } from "../Store/History";
import {
   fetchPedigree,
   FetchPedigreeResult,
   fetchEventDetails,
   fetchSourceDetails,
   fetchMetadata,
} from "../Store/Sagas";
import { addEvents } from "../Store/Event";
import { EventDetails } from "../Server/Event";
import { mergeAssertionEntities } from "../Server/Person";
import { defaultPedigree, changePedigreeSettings } from "../Store/Pedigree";
import { defaultFanchart, changeFanchartSettings } from "../Store/Fanchart";
import {
   defaultPersonaList,
   changePersonaListSettings
} from "../Store/PersonaList";
import { changePlaceListSettings } from '../Store/Place';
import { changeSourceListSettings } from '../Store/Source';
import { defaultRadial, changeRadialSettings } from "../Store/Radial";
import { defaultStats, changeStatsSettings } from "../Store/Stats";
import { defaultQuilts, changeQuiltsSettings } from "../Store/Quilts";
import * as Server from "../Server/Post";

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
      placelist: { filter: '' },
      sourcelist: { filter: '' },
      quilts: defaultQuilts,
      stats: defaultStats,
      places: {},
      sources: {},
      history: [],
      metadata: {
         char_part_SEX: -1,
         char_part_types_dict: {},
         characteristic_types: [],
         event_type_roles: [],
         event_type_roles_dict: {},
         event_types: [],
         event_types_dict: {},
         p2p_types: [],
         p2p_types_dict: {},
         researchers: [],
         researchers_dict: {},
         theme_operators: [],
         themes: [],
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
      const item: HistoryItem = {...action.payload};

      // Do no change if the first item is already the correct one, to avoid
      // refreshing all pages and getting data from the server again.
      if (state.history.length &&
          state.history[0].id === item.id &&
          state.history[0].kind === item.kind
      ) {
         return state;
      }

      const idx = state.history.findIndex(
         (h: HistoryItem) => h.id === item.id && h.kind === item.kind);
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
   } else if (isType(action, changePlaceListSettings)) {
      return {
         ...state,
         placelist: { ...state.placelist, ...action.payload.diff }
      };
   } else if (isType(action, changeQuiltsSettings)) {
      return { ...state, quilts: { ...state.quilts, ...action.payload.diff } };
   } else if (isType(action, changeRadialSettings)) {
      return { ...state, radial: { ...state.radial, ...action.payload.diff } };
   } else if (isType(action, changeSourceListSettings)) {
      return {
         ...state,
         sourcelist: { ...state.sourcelist, ...action.payload.diff }
      };
   } else if (isType(action, changeStatsSettings)) {
      return { ...state, stats: { ...state.stats, ...action.payload.diff } };
   } else if (isType(action, fetchEventDetails.done)) {
      const data = action.payload.result;
      const s = { ...state, ...mergeAssertionEntities(state, data) };
      s.events[data.id].asserts = data.asserts;
      return s;
   } else if (isType(action, fetchMetadata.done)) {
      const m = action.payload.result;
      return { ...state,
              metadata: {
                 ...m,
                 p2p_types_dict: to_dict(m.p2p_types, {}),
                 event_types_dict: to_dict(m.event_types, {}),
                 event_type_roles_dict: to_dict(m.event_type_roles, {}),
                 researchers_dict: to_dict(m.researchers, {}),
                 char_part_types_dict: to_dict(m.characteristic_types, {}),
              }};
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
         radial: { ...state.radial, loading: false },
         events: { ...state.events, ...action.payload.result.events },
         pedigree: { ...state.pedigree, loading: false }
      };
   } else if (isType(action, fetchSourceDetails.done)) {
      const source: Source = action.payload.result;
      return {
         ...state,
         sources: {
            ...state.sources,
            [source.id]:
               source.id in state.sources
               ? { ...state.sources[source.id], ...source }
               : source
         }
      };
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
         quilts: { ...state.quilts, ...action.payload.quilts },
         pedigree: {
            ...state.pedigree,
            ...action.payload.pedigree,
            loading: false
         },
         history: [ ...state.history, ...action.payload.history ],
         placelist: { ...state.placelist, ...action.payload.placelist },
         personalist: { ...state.personalist, ...action.payload.personalist },
         sourcelist: { ...state.sourcelist, ...action.payload.sourcelist },
         stats: { ...state.stats, ...action.payload.stats }
      };
   }
   return state;
}

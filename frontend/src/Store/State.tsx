import * as Redux from "redux";
import { REHYDRATE } from "redux-persist/constants";
import { AssertionEntities } from "../Server/Person";
import { FanchartSettings } from "../Store/Fanchart";
import { PedigreeSettings } from "../Store/Pedigree";
import { RadialSettings } from "../Store/Radial";
import { QuiltsSettings } from "../Store/Quilts";
import { PersonSet } from "../Store/Person";
import { SourceSet, SourceListSettings } from "../Store/Source";
import { PlaceListSettings } from '../Store/Place';
import { HistoryItem } from "../Store/History";
import { actionCreator } from "../Store/Actions";
import { predefinedThemes } from "../Store/ColorTheme";
import { GenealogyEventSet } from "../Store/Event";
import { HistoryKind } from "../Store/History";
import { PersonaListSettings } from "../Store/PersonaList";
import { PlaceSet } from "../Store/Place";
import { StatsSettings } from "../Store/Stats";
import * as GP_JSON from "../Server/JSON";

export interface MetadataDict extends GP_JSON.Metadata {
   p2p_types_dict: {[id: number]: GP_JSON.P2PType};
   event_types_dict: {[id: number]: GP_JSON.EventType};
   event_type_roles_dict: {[id: number]: GP_JSON.EventTypeRole};
   researchers_dict: {[id: number]: GP_JSON.Researcher};
   char_part_types_dict: {[id: number]: GP_JSON.CharacteristicPartType};
   char_part_SEX: number;  // the one corresponding to 'sex'
}

export interface AppState {
   fanchart: FanchartSettings;
   history: HistoryItem[]; // id of persons recently visited
   pedigree: PedigreeSettings;
   personalist: PersonaListSettings;
   placelist: PlaceListSettings;
   quilts: QuiltsSettings;
   radial: RadialSettings;
   sourcelist: SourceListSettings;
   stats: StatsSettings;

   metadata: MetadataDict;

   // ??? Those should be replaced with local data in the various views, to
   // reduce long-term memory usage. The caching is not really useful, since
   // views are fetching them anyway.
   persons: PersonSet; // details for all persons
   places: PlaceSet; // details for all places
   events: GenealogyEventSet; // all known events
   sources: SourceSet;
}

export type GPStore = Redux.Store<AppState, Redux.AnyAction>;

/**
 * Given an id, returns the name of the corresponding theme.
 */
export const themeNameGetter = (s: AppState) => (
   id: GP_JSON.ColorSchemeId
): string => {
   const m = predefinedThemes.concat(s.metadata.themes).find(e => e.id === id);
   return m ? m.name : "";
};

/**
 * Return the ID of the last visited person
 */
export function lastVisitedPerson(s: AppState) {
   for (const h of s.history) {
      if (h.kind === HistoryKind.PERSON) {
         return h.id;
      }
   }
   return 1;
}


/**
 * Get all entities required to display assertions. Apply some caching to avoid
 * creating a new record every time.
 */
let oldEntities: AssertionEntities = {
   events: {}, places: {}, persons: {}, sources: {}};
export const getEntities = (s: AppState) => {
   if (s.events !== oldEntities.events ||
       s.places !== oldEntities.places ||
       s.persons !== oldEntities.persons ||
       s.sources !== oldEntities.sources
   ) {
      oldEntities = {
         events: s.events,
         places: s.places,
         persons: s.persons,
         sources: s.sources,
      };
   }
   return oldEntities;
};

/**
 * Rehydrate action generated by redux-persist
 */
export const rehydrate = actionCreator<AppState>(REHYDRATE);
rehydrate.type = REHYDRATE; // no prefix
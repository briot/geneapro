import {
   FetchPedigreeResult,
   FetchPedigreeParams,
   fetchPedigreeFromServer } from "../Server/Pedigree";
import {
   FetchEventDetailsParams,
   fetchEventFromServer,
   EventDetails } from "../Server/Event";
import {
   fetchSourceDetailsFromServer
} from "../Server/Source";
import * as GP_JSON from "../Server/JSON";
import { Source } from "../Store/Source";
import { AppState } from "../Store/State";
import { PersonSet } from "../Store/Person";
import { createAsyncAction } from "../Store/Actions";
import { GenealogyEventSet } from "../Store/Event";
import { ChildrenAndParentsSet } from "../Store/Pedigree";

/**
 * Async Action: fetch ancestors data from the server
 */
export const fetchPedigree = createAsyncAction(
   "DATA/PEDIGREE",
   fetchPedigreeFromServer,
   (p: FetchPedigreeParams, state: AppState) =>
      p.decujus in state.persons &&
      state.persons[p.decujus].knownAncestors >= p.ancestors &&
      state.persons[p.decujus].knownDescendants >= p.descendants &&
      // All these persons we have already preloaded might not have
      // the right theme
      p.theme < 0
);

/**
 * Async Action: fetch metadata from server
 */
interface FetchMetadataParams {
   force?: boolean;
}
function fetchMetadataFromServer() {
   return window.fetch("/data/metadata"
   ).then((resp: Response) => resp.json()
   ).then((data: GP_JSON.Metadata) => data);
}
export const fetchMetadata = createAsyncAction(
   "DATA/META",
   fetchMetadataFromServer,
   (p: FetchMetadataParams, state: AppState) =>
      !p.force && state.metadata.event_types.length > 0,
);

/**
 * Async Action: fetch details for one event
 */

export const fetchEventDetails = createAsyncAction(
   "DATA/EVENT",
   fetchEventFromServer,
   (p: FetchEventDetailsParams, state: AppState) =>
      p.id in state.events && state.events[p.id].asserts !== undefined,
);

/**
 * Async Action: fetch details for one source
 */

export const fetchSourceDetails = createAsyncAction(
   "DATA/SOURCE",
   fetchSourceDetailsFromServer,
);

import { all, call } from "redux-saga/effects";
import { fetchPedigreeFromServer } from "../Server/Pedigree";
import { fetchEventFromServer, EventDetails } from "../Server/Event";
import {
   fetchSourceDetailsFromServer
} from "../Server/Source";
import * as GP_JSON from "../Server/JSON";
import { Source } from "../Store/Source";
import { AppState } from "../Store/State";
import { PersonSet } from "../Store/Person";
import { allSagas, createAsyncAction } from "../Store/Actions";
import { GenealogyEventSet } from "../Store/Event";
import { ChildrenAndParentsSet } from "../Store/Pedigree";

/**
 * Async Action: fetch ancestors data from the server
 */

export interface FetchPedigreeParams {
   decujus: number;
   ancestors: number;
   descendants: number;
   theme: GP_JSON.ColorSchemeId;
}
export interface FetchPedigreeResult {
   persons: PersonSet;
   events: GenealogyEventSet;
   layout: ChildrenAndParentsSet;
}
function _hasPedigree(p: FetchPedigreeParams, state: AppState) {
   return (
      p.decujus in state.persons &&
      state.persons[p.decujus].knownAncestors >= p.ancestors &&
      state.persons[p.decujus].knownDescendants >= p.descendants &&
      // All these persons we have already preloaded might not have
      // the right theme
      (p.theme < 0)
   );
}
function* _fetchPedigree(p: FetchPedigreeParams) {
   return yield call(
      fetchPedigreeFromServer,
      p.decujus,
      p.ancestors,
      p.descendants,
      p.theme
   );
}
export const fetchPedigree = createAsyncAction<
   FetchPedigreeParams,
   FetchPedigreeResult
>("DATA/PEDIGREE", _fetchPedigree, _hasPedigree);

/**
 * Async Action: fetch metadata from server
 */
interface FetchMetadataParams {
   force?: boolean;
}
function* fetchMetadataFromServer() {
   const resp = yield window.fetch("/data/metadata");
   const data: GP_JSON.Metadata = yield resp.json();
   return data;
}
function* _fetchMetaData() {
   return yield call(fetchMetadataFromServer);
}
function _hasMetadata(p: FetchMetadataParams, state: AppState) {
   return !p.force && state.metadata.event_types.length > 0;
}
export const fetchMetadata = createAsyncAction<
   FetchMetadataParams,
   GP_JSON.Metadata
>("DATA/META", _fetchMetaData, _hasMetadata);

/**
 * Async Action: fetch details for one event
 */

export interface FetchEventDetailsParams {
   id: number;
}
function _hasEventDetails(p: FetchEventDetailsParams, state: AppState) {
   return p.id in state.events && state.events[p.id].asserts !== undefined;
}
function* _fetchEventDetails(p: FetchEventDetailsParams) {
   const res: EventDetails = yield call(fetchEventFromServer, p.id);
   return res;
}
export const fetchEventDetails = createAsyncAction(
   "DATA/EVENT",
   _fetchEventDetails,
   _hasEventDetails
);

/**
 * Async Action: fetch details for one source
 */

export interface FetchSourceDetailsParams {
   id: number;
}
function _hasSourceDetails() {
   return false;
}
function* _fetchSourceDetails(p: FetchSourceDetailsParams) {
   const res: Source = yield call(fetchSourceDetailsFromServer, p.id);
   return res;
}
export const fetchSourceDetails = createAsyncAction(
   "DATA/SOURCE",
   _fetchSourceDetails,
   _hasSourceDetails
);

/**
 * Internal
 */
export function* rootSaga() {
   yield all(allSagas);
}

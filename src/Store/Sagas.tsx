import { all, call, put } from "redux-saga/effects";
import { fetchPedigreeFromServer } from "../Server/Pedigree";
import {
   fetchPersonsFromServer,
   fetchPersonDetailsFromServer,
   FetchPersonsParams,
   FetchPersonsResult,
   DetailsResult
} from "../Server/Person";
import { fetchEventFromServer, EventDetails } from "../Server/Event";
import { fetchPlaceFromServer, PlaceDetails } from "../Server/Place";
import { fetchPlacesFromServer, FetchPlacesResult } from "../Server/Place";
import {
   fetchSourcesFromServer,
   FetchSourcesResult,
   fetchSourceDetailsFromServer,
   FetchSourceDetailsResult
} from "../Server/Source";
import { fetchQuiltsFromServer, QuiltsResult } from "../Server/Quilts";
import { fetchCountFromServer, JSONCount } from "../Server/Stats";
import * as GP_JSON from "../Server/JSON";
import { AppState, DatabaseObjectsCount } from "../Store/State";
import { PersonSet } from "../Store/Person";
import { allSagas, createAsyncAction } from "../Store/Actions";
import { addEvents, GenealogyEventSet } from "../Store/Event";
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
      (p.theme === state.lastFetchedTheme || p.theme < 0)
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
 * Async Action: fetch quilts data from the server
 */

export interface FetchQuiltsParams {
   decujus: number;
   decujusOnly: boolean;
}
export type fetchQuiltsResult = QuiltsResult;
function* _fetchQuilts(p: FetchQuiltsParams) {
   return yield call(fetchQuiltsFromServer, p.decujus, p.decujusOnly);
}
export const fetchQuilts = createAsyncAction<
   FetchQuiltsParams,
   fetchQuiltsResult
>("DATA/QUILTS", _fetchQuilts);

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
 * Async Action: fetch all places from the server
 */

function* _fetchPlaces() {
   const places = yield call(fetchPlacesFromServer);
   return places;
}
export const fetchPlaces = createAsyncAction<{}, FetchPlacesResult>(
   "DATA/PLACES",
   _fetchPlaces
);

/**
 * Async Action: fetch all sources from the server
 */

function* _fetchSources() {
   const sources = yield call(fetchSourcesFromServer);
   return sources;
}
export const fetchSources = createAsyncAction<{}, FetchSourcesResult>(
   "DATA/SOURCES",
   _fetchSources
);

/**
 * Async Action: fetch all persons from the server
 */

function* _fetchPersons(p: FetchPersonsParams) {
   const persons = yield call(fetchPersonsFromServer, p);
   return persons;
}
export const fetchPersons = createAsyncAction<
   FetchPersonsParams,
   FetchPersonsResult
>("DATA/PERSONS", _fetchPersons);

/**
 * Async Action: fetch details for one specific person
 */

export interface FetchPersonDetailsParams {
   id: number;
}
function* _fetchPersonDetails(p: FetchPersonDetailsParams) {
   const res: DetailsResult = yield call(fetchPersonDetailsFromServer, p.id);

   // Register all events
   yield put(addEvents({ events: res.events }));

   return res;
}
export const fetchPersonDetails = createAsyncAction(
   "DATA/PERSON",
   _fetchPersonDetails
);

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
 * Async Action: fetch details for one place
 */

export interface FetchPlaceDetailsParams {
   id: number;
}
function _hasPlaceDetails(p: FetchPlaceDetailsParams, state: AppState) {
   return p.id in state.places && state.places[p.id].asserts !== undefined;
}
function* _fetchPlaceDetails(p: FetchPlaceDetailsParams) {
   const res: PlaceDetails = yield call(fetchPlaceFromServer, p.id);
   return res;
}
export const fetchPlaceDetails = createAsyncAction(
   "DATA/PLACE",
   _fetchPlaceDetails,
   _hasPlaceDetails
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
   const res: FetchSourceDetailsResult = yield call(
      fetchSourceDetailsFromServer,
      p.id
   );
   return res;
}
export const fetchSourceDetails = createAsyncAction(
   "DATA/SOURCE",
   _fetchSourceDetails,
   _hasSourceDetails
);

/**
 * Async Action: fetch count of objects from database
 */

function* _fetchCount() {
   const res: JSONCount = yield call(fetchCountFromServer, {});
   return res as DatabaseObjectsCount;
}
export const fetchCount = createAsyncAction("DATA/STATS/COUNT", _fetchCount);

/**
 * Internal
 */
export function* rootSaga() {
   yield all(allSagas);
}

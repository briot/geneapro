import { all, call, put } from 'redux-saga/effects';
import { fetchPedigreeFromServer } from '../Server/Pedigree';
import { fetchPersonsFromServer, fetchPersonDetailsFromServer,
         FetchPersonsResult, DetailsResult } from '../Server/Person';
import { fetchEventFromServer, EventDetails } from '../Server/Event';
import { fetchPlaceFromServer, PlaceDetails } from '../Server/Place';
import { fetchPlacesFromServer, FetchPlacesResult } from '../Server/Place';
import { fetchSourcesFromServer, FetchSourcesResult,
         fetchSourceDetailsFromServer, FetchSourceDetailsResult } from '../Server/Source';
import { fetchQuiltsFromServer, QuiltsResult } from '../Server/Quilts';
import { AppState } from '../Store/State';
import { PersonSet } from '../Store/Person';
import { allSagas, createAsyncAction } from '../Store/Actions';
import { addEvents, GenealogyEventSet } from '../Store/Event';
import { ChildrenAndParentsSet } from '../Store/Pedigree';

/**
 * Async Action: fetch ancestors data from the server
 */

export type fetchPedigreeParams = {
   decujus: number,
   ancestors: number,
   descendants: number
};
export type fetchPedigreeResult = {
   persons: PersonSet;
   events: GenealogyEventSet;
   layout: ChildrenAndParentsSet;
};
function _hasPedigree(p: fetchPedigreeParams, state: AppState) {
   return (p.decujus in state.persons &&
           state.persons[p.decujus].knownAncestors >= p.ancestors &&
           state.persons[p.decujus].knownDescendants >= p.descendants);
}
function* _fetchPedigree(p: fetchPedigreeParams) {
   return yield call(fetchPedigreeFromServer, p.decujus, p.ancestors, p.descendants);
}
export const fetchPedigree = createAsyncAction<fetchPedigreeParams, fetchPedigreeResult>(
   'DATA/PEDIGREE', _fetchPedigree, _hasPedigree);

/**
 * Async Action: fetch quilts data from the server
 */

export type fetchQuiltsParams = {
   decujus: number,
   decujusOnly: boolean;
};
export type fetchQuiltsResult = QuiltsResult;
function* _fetchQuilts(p: fetchQuiltsParams) {
   return yield call(fetchQuiltsFromServer, p.decujus, p.decujusOnly);
}
export const fetchQuilts = createAsyncAction<fetchQuiltsParams, fetchQuiltsResult>(
   'DATA/QUILTS', _fetchQuilts);

/**
 * Async Action: fetch all places from the server
 */

export type fetchPlacesParams = {};
function* _fetchPlaces() {
   const places = yield call(fetchPlacesFromServer);
   return places;
}
export const fetchPlaces = createAsyncAction<fetchPlacesParams, FetchPlacesResult>(
   'DATA/PLACES', _fetchPlaces);

/**
 * Async Action: fetch all sources from the server
 */

export type fetchSourcesParams = {};
function* _fetchSources() {
   const sources = yield call(fetchSourcesFromServer);
   return sources;
}
export const fetchSources = createAsyncAction<fetchSourcesParams, FetchSourcesResult>(
   'DATA/SOURCES', _fetchSources);

/**
 * Async Action: fetch all persons from the server
 */

export type fetchPersonsParams = {};
function* _fetchPersons() {
   const persons = yield call(fetchPersonsFromServer);
   return persons;
}
export const fetchPersons = createAsyncAction<fetchPersonsParams, FetchPersonsResult>(
   'DATA/PERSONS', _fetchPersons);

/**
 * Async Action: fetch details for one specific person
 */

export type fetchPersonDetailsParams = {
   id: number;
};
function* _fetchPersonDetails(p: fetchPersonDetailsParams) {
   const res: DetailsResult = yield call(fetchPersonDetailsFromServer, p.id);

   // Register all events
   yield put(addEvents({events: res.events}));

   return res;
}
export const fetchPersonDetails = createAsyncAction(
   'DATA/PERSON', _fetchPersonDetails);

/**
 * Async Action: fetch details for one event
 */

export type fetchEventDetailsParams = {
   id: number;
};
function _hasEventDetails(p: fetchEventDetailsParams, state: AppState) {
   return (p.id in state.events &&
           state.events[p.id].asserts !== undefined);
}
function* _fetchEventDetails(p: fetchEventDetailsParams) {
   const res: EventDetails = yield call(fetchEventFromServer, p.id);
   return res;
}
export const fetchEventDetails = createAsyncAction(
   'DATA/EVENT', _fetchEventDetails, _hasEventDetails);

/**
 * Async Action: fetch details for one place
 */

export type fetchPlaceDetailsParams = {
   id: number;
};
function _hasPlaceDetails(p: fetchPlaceDetailsParams, state: AppState) {
   return (p.id in state.places &&
           state.places[p.id].asserts !== undefined);
}
function* _fetchPlaceDetails(p: fetchPlaceDetailsParams) {
   const res: PlaceDetails = yield call(fetchPlaceFromServer, p.id);
   return res;
}
export const fetchPlaceDetails = createAsyncAction(
   'DATA/PLACE', _fetchPlaceDetails, _hasPlaceDetails);

/**
 * Async Action: fetch details for one source
 */

export type fetchSourceDetailsParams = {
   id: number;
};
function _hasSourceDetails(p: fetchSourceDetailsParams, state: AppState) {
   return false;
}
function* _fetchSourceDetails(p: fetchSourceDetailsParams) {
   const res: FetchSourceDetailsResult = yield call(fetchSourceDetailsFromServer, p.id);
   return res;
}
export const fetchSourceDetails = createAsyncAction(
   'DATA/SOURCE', _fetchSourceDetails, _hasSourceDetails);

/**
 * Internal
 */
export function *rootSaga() {
   yield all(allSagas);
}

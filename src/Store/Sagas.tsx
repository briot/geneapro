import { all, call, put } from 'redux-saga/effects';
import { fetchPedigreeFromServer } from '../Server/Pedigree';
import { fetchPersonsFromServer, fetchPersonDetailsFromServer,
         FetchPersonsResult, DetailsResult } from '../Server/Person';
import { fetchEventFromServer, EventDetails } from '../Server/Event';
import { fetchSourceDetailsFromServer } from '../Server/Source';
import { Source } from '../Store/Source';
import { AppState } from '../Store/State';
import { PersonSet } from '../Store/Person';
import { allSagas, createAsyncAction } from '../Store/Actions';
import { addEvents, GenealogyEventSet } from '../Store/Event';

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
};
function _hasPedigree(p: fetchPedigreeParams, state: AppState) {
   return (p.decujus in state.persons &&
           state.persons[p.decujus].knownAncestors >= p.ancestors &&
           state.persons[p.decujus].knownDescendants >= p.descendants);
}
function* _fetchPedigree(p: fetchPedigreeParams) {
   const persons = yield call(fetchPedigreeFromServer, p.decujus, p.ancestors, p.descendants);
   return persons;
}
export const fetchPedigree = createAsyncAction<fetchPedigreeParams, fetchPedigreeResult>(
   'DATA/PEDIGREE', _fetchPedigree, _hasPedigree);

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
           state.events[p.id].persons !== undefined);
}
function* _fetchEventDetails(p: fetchEventDetailsParams) {
   const res: EventDetails = yield call(fetchEventFromServer, p.id);
   return res;
}
export const fetchEventDetails = createAsyncAction(
   'DATA/EVENT', _fetchEventDetails, _hasEventDetails);

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
   const res: Source = yield call(fetchSourceDetailsFromServer, p.id);
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

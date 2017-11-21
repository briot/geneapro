import { call, put, select, takeEvery, ForkEffect } from 'redux-saga/effects';
import { Action } from 'redux-typescript-actions';
import actionCreatorFactory from 'redux-typescript-actions';
import { AppState } from '../Store/State';

export const actionCreator = actionCreatorFactory('GP' /* prefix */);

/**
 * All registered sagas
 */

export const allSagas: ForkEffect[] = [];

/**
 * Create a new set of async actions.
 *   <result>.request: the action you should dispatch. It will be
 *     intercepted by redux-saga, and perform the async action
 *   <result>.started: emitted just before the async action starts.
 *   <result>.done: emitted when the async action terminates with
 *     success.
 *   <result>.failed: emitted when the async action failed.
 *   
 *  @param alreadyKnown
 *     If given, it will be run before the action even starts, and can
 *     be used to check the current state to make sure we don't already
 *     have the information.
 */

export function createAsyncAction<Params, Result>(
   type: string,
   func: (p: Params) => Iterable<Result>,
   alreadyKnown?: (p: Params, state: AppState) => boolean,
) {
   const actions = actionCreator.async<Params, Result, {}>(type);
   const request = actionCreator<Params>(type + '_REQUEST');

   function* perform(action: Action<Params>) {
      if (alreadyKnown) {
         const state = yield select((st: AppState) => st);
         if (alreadyKnown(action.payload, state)) {
            return;
         }
      }

      yield put(actions.started(action.payload));
      try {
         const res: Result = yield call(func, action.payload);
         yield put(actions.done({
            params: action.payload,
            result: res
         }));
      } catch (e) {
         window.console.error('Unexpected exception ', e);
         yield put(actions.failed({
            params: action.payload,
            error: e
         }));
      }
   }

   allSagas.push(takeEvery(request.type, perform));

   return {
      started: actions.started,
      done: actions.done,
      failed: actions.failed,
      request: request,
   };
}

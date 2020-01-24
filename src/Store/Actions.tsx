import * as Redux from "redux";
import {
   call,
   put,
   select,
   takeEvery,
   CallEffect,
   ForkEffect
} from "redux-saga/effects";
import actionCreatorFactory, { Action } from "typescript-fsa";
import { AppState } from "../Store/State";

export const actionCreator = actionCreatorFactory("GP" /* prefix */);

/**
 * All registered sagas
 */

export const allSagas: ForkEffect[] = [];

/**
 * Create a new set of async actions.
 *   <result>.execute: calls this subprogram to execute the action.
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
   func: (p: Params) => Iterable<CallEffect | Result>,
   alreadyKnown?: (p: Params, state: AppState) => boolean
) {
   const actions = actionCreator.async<Params, Result, {}>(type);
   const request = actionCreator<Params>(type + "_REQUEST");

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
         yield put(
            actions.done({
               params: action.payload,
               result: res
            })
         );
      } catch (e) {
         window.console.error("Unexpected exception ", e);
         yield put(
            actions.failed({
               params: action.payload,
               error: e
            })
         );
      }
   }

   function execute(dispatch: Redux.Dispatch, p: Params) {
      dispatch(request(p));
   }

   allSagas.push(takeEvery(request.type, perform));

   return {
      ...actions,   // 'started', 'done', 'failed'
      execute,      // dispatch the 'request' action, which executes async
   };
}

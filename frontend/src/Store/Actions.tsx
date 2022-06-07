import actionCreatorFactory from "typescript-fsa";
import { AppState } from "../Store/State";
import { GPDispatch } from "../Store/Store";

export const actionCreator = actionCreatorFactory("GP" /* prefix */);

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
   func: (p: Params) => Promise<Result>,
   alreadyKnown?: (p: Params, state: AppState) => boolean
) {
   const actions = actionCreator.async<Params, Result, unknown>(type);
   const doDispatch = (p: Params) => {
      return async (dispatch: GPDispatch, getState: () => AppState) => {
         if (alreadyKnown && alreadyKnown(p, getState())) {
            return;
         }

         dispatch(actions.started(p));
         try {
            const res: Result = await func(p);
            dispatch(actions.done({
               params: p,
               result: res
            }));

         } catch (e) {
            window.console.error("Unexpected exception ", e);
            dispatch(actions.failed({
               params: p,
               error: e
            }));
         }
      };
   };

   return {
      ...actions,   // 'started', 'done', 'failed'
      execute: (dispatch: GPDispatch, p: Params) => {
         dispatch(doDispatch(p));
      }
   };
}

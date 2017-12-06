import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { rehydrate } from '../Store/State';
import { QuiltsSettings, changeQuiltsSettings } from '../Store/Quilts';
import { fetchQuilts } from '../Store/Sagas';
import { QuiltsResult } from '../Server/Quilts';

/**
 * Reducer for quilts chart
 */
export function quiltsReducer(
   state: QuiltsSettings = {
      ancestors: 60,
      loading: false,
      decujusTreeOnly: true,
   },
   action: Redux.Action
) {
   if (isType(action, changeQuiltsSettings)) {
      return {...state, ...action.payload.diff};
   } else if (isType(action, fetchQuilts.started)) {
      return {...state, loading: true};
   } else if (isType(action, fetchQuilts.failed)) {
      return {...state, loading: false};
   } else if (isType(action, fetchQuilts.done)) {
      return {...state, loading: false};
   } else if (isType(action, rehydrate) && action.payload.quilts) {
      return {...state, ...action.payload.quilts, loading: false};
   }
   return state;
}

export function quiltsLayoutReducer(
   state: {layout?: QuiltsResult} = {},
   action: Redux.Action
) {
   if (isType(action, fetchQuilts.done)) {
      const data = action.payload.result as QuiltsResult;
      return {...state, layout: data};
   }
   return state;
}

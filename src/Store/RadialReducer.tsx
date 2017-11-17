import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { fetchPedigree } from '../Store/Sagas';
import { rehydrate } from '../Store/State';
import { RadialSettings, changeRadialSettings } from '../Store/Radial';
import { ColorScheme } from '../Store/Pedigree';

/**
 * Reducer for radial chart
 */
export function radialReducer(
   state: RadialSettings = {
      colors: ColorScheme.WHITE,
      showText: true,
      generations: 6,
      spacing: 45,
      loading: false,
   },
   action: Redux.Action
) {
   if (isType(action, changeRadialSettings)) {
      return {...state, ...action.payload.diff};
   } else if (isType(action, fetchPedigree.started)) {
      return {...state, loading: true};
   } else if (isType(action, fetchPedigree.done)) {
      return {...state, loading: false};
   } else if (isType(action, fetchPedigree.failed)) {
      return {...state, loading: false};
   } else if (isType(action, rehydrate) && action.payload.radial) {
      return {...state, ...action.payload.radial, loading: false};
   }
   return state;
}

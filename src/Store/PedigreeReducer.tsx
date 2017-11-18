import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { fetchPedigree } from '../Store/Sagas';
import { rehydrate } from '../Store/State';
import { PedigreeSettings, LayoutScheme, ColorScheme, LinkStyle,
         changePedigreeSettings } from '../Store/Pedigree';

/**
 * Reducer for pedigree
 */
export function pedigreeReducer(
   state: PedigreeSettings = {
      showUnknown: false,
      layout: LayoutScheme.LEFT_RIGHT,
      links: LinkStyle.CURVE,
      sameSize: false,
      colors: ColorScheme.PEDIGREE,
      vertPadding: 5,
      horizSpacing: 30,
      showSourcedEvents: true,
      showMarriages: true,
      ancestors: 4,
      descendants: 1,
      loading: false,
   },
   action: Redux.Action
) {
   if (isType(action, changePedigreeSettings)) {
      return {...state, ...action.payload.diff};
   } else if (isType(action, fetchPedigree.started)) {
      return {...state, loading: true};
   } else if (isType(action, fetchPedigree.done)) {
      return {...state, loading: false};
   } else if (isType(action, fetchPedigree.failed)) {
      return {...state, loading: false};
   } else if (isType(action, rehydrate) && action.payload.pedigree) {
      return {...state, ...action.payload.pedigree, loading: false};
   }
   return state;
}

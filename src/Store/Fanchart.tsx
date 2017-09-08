import { actionCreator } from '../Store/Actions';
import * as Redux from 'redux';
import { isType } from 'redux-typescript-actions';
import { rehydrate } from '../Store/State';  // ??? circular dep
import { ColorScheme } from '../Store/Pedigree';

export interface FanchartSettings {
   ancestors: number;
   colors: ColorScheme;
   sepColors: ColorScheme;
   fullAngle: number; // full opening angle, in degrees
   anglePad: number;  // between couples
   straightTextThreshold: number; // generation after which the text is along the axis
   readableText: boolean;
   gapBetweenGens: boolean;
   showMarriages: boolean;
   showMissingPersons: boolean;
   showSourcedEvents: boolean; // add tick for events with a source

   loading: boolean;  // true while loading pedigree data
}

/**
 * Action: change one or more fanchart settings
 */
export const changeFanchartSettings = actionCreator<
   {diff: Partial<FanchartSettings>}>('FANCHART/SETTINGS');

/**
 * Reducer for fanchart
 */
export function fanchartReducer(
   state: FanchartSettings = {
      ancestors: 4,
      colors: ColorScheme.PEDIGREE,
      sepColors: ColorScheme.PEDIGREE,
      fullAngle: 200,
      anglePad: 0,
      straightTextThreshold: 4,
      readableText: true,
      gapBetweenGens: false,
      showMarriages: false,
      showMissingPersons: true,
      showSourcedEvents: true,
      loading: false,
   },
   action: Redux.Action
) {
   if (isType(action, changeFanchartSettings)) {
      return {...state, ...action.payload.diff};
   } else if (isType(action, rehydrate) && action.payload.fanchart) {
      return {...state, ...action.payload.fanchart, loading: false};
   }
   return state;
}

import { actionCreator } from "../Store/Actions";
import { PEDIGREE } from "../Store/ColorTheme";
import * as GP_JSON from "../Server/JSON";

export interface FanchartSettings {
   ancestors: number;
   descendants: number;
   colors: GP_JSON.ColorSchemeId;
   sepColors: GP_JSON.ColorSchemeId;
   fullAngle: number; // full opening angle, in degrees
   anglePad: number; // between couples
   straightTextThreshold: number; // generation after which the text is along the axis
   readableText: boolean;
   gapBetweenGens: boolean;
   showMarriages: boolean;
   showMissingPersons: boolean;
   showSourcedEvents: boolean; // add tick for events with a source

   loading: boolean; // true while loading pedigree data
}

export const defaultFanchart: FanchartSettings = {
   ancestors: 4,
   descendants: 1,
   colors: PEDIGREE.id,
   sepColors: PEDIGREE.id,
   fullAngle: 200,
   anglePad: 0,
   straightTextThreshold: 4,
   readableText: true,
   gapBetweenGens: false,
   showMarriages: false,
   showMissingPersons: true,
   showSourcedEvents: true,
   loading: false
};

/**
 * Action: change one or more fanchart settings
 */
export const changeFanchartSettings = actionCreator<{
   diff: Partial<FanchartSettings>;
}>("FANCHART/SETTINGS");

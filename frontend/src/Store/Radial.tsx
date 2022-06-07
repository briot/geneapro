import { actionCreator } from "../Store/Actions";
import { WHITE } from "../Store/ColorTheme";
import * as GP_JSON from "../Server/JSON";

export interface RadialSettings {
   colors: GP_JSON.ColorSchemeId;
   showText: boolean;

   sameStyleForText: boolean;
   // If true, text uses same color as circle, rather than its own style

   generations: number; // number of ancestor or descendants
   // (if negative) generations to show
   spacing: number; // space between generations
   loading: boolean; // true while loading pedigree data
}

export const defaultRadial: RadialSettings = {
   colors: WHITE.id,
   showText: true,
   sameStyleForText: false,
   generations: 6,
   spacing: 45,
   loading: false
};

/**
 * Action: change one or more pedigree settings
 */
export const changeRadialSettings = actionCreator<{
   diff: Partial<RadialSettings>;
}>("RADIAL/SETTINGS");

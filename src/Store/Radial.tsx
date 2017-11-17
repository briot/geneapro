import { actionCreator } from '../Store/Actions';
import { ColorScheme } from '../Store/Pedigree';

export interface RadialSettings {
   colors: ColorScheme;
   showText: boolean;
   generations: number;  // number of ancestor or descendants
                         // (if negative) generations to show
   spacing: number;  // space between generations
   loading: boolean; // true while loading pedigree data
}

/**
 * Action: change one or more pedigree settings
 */
export const changeRadialSettings = actionCreator<
   {diff: Partial<RadialSettings>}>('RADIAL/SETTINGS');

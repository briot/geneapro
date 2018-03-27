import { actionCreator } from '../Store/Actions';

export enum LayoutScheme {
   LEFT_RIGHT = 0,
   RIGHT_LEFT = 1,
   TOP_DOWN = 2,
   BOTTOM_UP = 3,
}
export const LayoutSchemeNames: {[id: number]: string} = {};
LayoutSchemeNames[LayoutScheme.LEFT_RIGHT] = 'left-to-right';
LayoutSchemeNames[LayoutScheme.RIGHT_LEFT] = 'right-to-left';
LayoutSchemeNames[LayoutScheme.TOP_DOWN] = 'top-down';
LayoutSchemeNames[LayoutScheme.BOTTOM_UP] = 'bottom-up';

export enum LinkStyle {
   STRAIGHT = 0,
   ORTHOGONAL = 1,
   CURVE = 2
}
export const LinkStyleNames: {[id: number]: string} = {};
LinkStyleNames[LinkStyle.STRAIGHT] = 'Straight';
LinkStyleNames[LinkStyle.ORTHOGONAL] = 'Orthogonal';
LinkStyleNames[LinkStyle.CURVE] = 'Curve';

export enum ColorScheme {
   PEDIGREE = 0,
   WHITE = 1,
   GENERATION = 2,
   QUARTILE = 3,
   NO_BOX = 4,
   CUSTOM = 5,
}
export const ColorSchemeNames: {[id: number]: string} = {};
ColorSchemeNames[ColorScheme.PEDIGREE] = 'Pedigree';
ColorSchemeNames[ColorScheme.WHITE] = 'White';
ColorSchemeNames[ColorScheme.GENERATION] = 'Generation';
ColorSchemeNames[ColorScheme.QUARTILE] = 'Quartile';
ColorSchemeNames[ColorScheme.NO_BOX] = 'No Box';
ColorSchemeNames[ColorScheme.CUSTOM] = 'Custom';

export interface PedigreeSettings {
   showUnknown: boolean;
   layout: LayoutScheme;
   links: LinkStyle;
   sameSize: boolean;
   colors: ColorScheme;
   vertPadding: number;  // minimum space between two persons at same generation
   horizSpacing: number; // between each generation
   showSourcedEvents: boolean; // add tick for events with a source
   showMarriages: boolean;
   ancestors: number;  // number of ancestor generations to show
   descendants: number; // number of descendant generations to show

   loading: boolean; // true while loading pedigree data
}

export const defaultPedigree: PedigreeSettings = {
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
};

/**
 * Whether the layout is left-to-right or top-down
 */

export function isVertical(settings: PedigreeSettings) {
   return settings.layout === LayoutScheme.BOTTOM_UP ||
      settings.layout === LayoutScheme.TOP_DOWN;
}

/**
 * Action: change one or more pedigree settings
 */
export const changePedigreeSettings = actionCreator<
   {diff: Partial<PedigreeSettings>}>('PEDIGREE/SETTINGS');

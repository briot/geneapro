import { actionCreator } from '../Store/Actions';

export enum LayoutScheme {
   COMPACT_LEFT_RIGHT = 0,
   COMPACT_TOP_DOWN = 1,
   EXPANDED_LEFT_RIGHT = 2,
   EXPANDED_TOP_DOWN = 3
}
export const LayoutSchemeNames: {[id: number]: string} = {};
LayoutSchemeNames[LayoutScheme.COMPACT_LEFT_RIGHT] = 'Compact (left-to-right)';
LayoutSchemeNames[LayoutScheme.COMPACT_TOP_DOWN] = 'Compact (top-down)';
LayoutSchemeNames[LayoutScheme.EXPANDED_LEFT_RIGHT] = 'Expanded (left-to-right)';
LayoutSchemeNames[LayoutScheme.EXPANDED_TOP_DOWN] = 'Expanded (top-down)';

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
}
export const ColorSchemeNames: {[id: number]: string} = {};
ColorSchemeNames[ColorScheme.PEDIGREE] = 'Pedigree';
ColorSchemeNames[ColorScheme.WHITE] = 'White';
ColorSchemeNames[ColorScheme.GENERATION] = 'Generation';
ColorSchemeNames[ColorScheme.QUARTILE] = 'Quartile';
ColorSchemeNames[ColorScheme.NO_BOX] = 'No Box';

export interface PedigreeSettings {
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

/**
 * Whether the layout is left-to-right or top-down
 */
export function isTopDown(settings: PedigreeSettings) {
   return settings.layout === LayoutScheme.COMPACT_TOP_DOWN ||
      settings.layout === LayoutScheme.EXPANDED_TOP_DOWN;
}

/**
 * Action: change one or more pedigree settings
 */
export const changePedigreeSettings = actionCreator<
   {diff: Partial<PedigreeSettings>}>('PEDIGREE/SETTINGS');

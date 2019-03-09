import * as d3Color from 'd3-color';
import Style from '../Store/Styles';
import { Person } from '../Store/Person';
import * as GP_JSON from '../Server/JSON';

export const PEDIGREE: GP_JSON.ColorScheme = {id: -5, name: 'Pedigree'};
export const WHITE: GP_JSON.ColorScheme = {id: -4, name: 'White'};
export const GENERATION: GP_JSON.ColorScheme = {id: -3, name: 'Generation'};
export const QUARTILE: GP_JSON.ColorScheme = {id: -2, name: 'Quartile'};
export const NO_BOX: GP_JSON.ColorScheme = {id: -1, name: 'No Box'};

export const predefinedThemes: Array<GP_JSON.ColorScheme> = [
   PEDIGREE, WHITE, GENERATION, QUARTILE, NO_BOX,
];

export interface BasePersonLayout {
   angle: number;
   // In range [0,1], the position of the person on the fanchart.
   // Used to compute colors in some scheme.

   sosa: number;
   // Sosa number might not be an integer: when more than 2 "parents" are set
   // on a node, sosa numbers are in the range [0,1].
   // Sosa is negative for descendants of the decujus

   generation: number;
   // generation number, relative to current decujus.
   // This is negative for descendants.
}

const MAXGEN = 12;
const baseQuartileColors = [
   'rgb(127,229,252)',
   'rgb(185,253,130)',
   'rgb(252,120,118)',
   'rgb(255,236,88)'];

const DEFAULT = new Style({
   fontWeight: 'normal', color: 'black', stroke: '#222'});
const STROKE_GREY_ON_WHITE = new Style({...DEFAULT, fill: '#fff'});
const BOLD_BLACK = new Style({fontWeight: 'bold', color: 'black'});
const TEXT_ONLY = new Style({color: 'black'});

export default class ColorTheme {

   /**
    * Compute the display style for a person
    */
   static forPerson(colors: GP_JSON.ColorSchemeId,
                    p?: Person,
                    layout?: BasePersonLayout,
   ): Style {

      let fillColor: string | undefined;

      switch (colors) {
         case PEDIGREE.id:
            if (layout) {
               // Avoid overly saturated colors when displaying few
               // generations.
               fillColor = Style.hsvStr(
                  (layout.angle || 0) * 360,
                  Math.abs(layout.generation) / MAXGEN,
                  1.0);
            }
            return new Style({...DEFAULT, fill: fillColor});

         case WHITE.id:
            return STROKE_GREY_ON_WHITE;

         case NO_BOX.id:
            return TEXT_ONLY;

         case QUARTILE.id:
            if (layout && layout.sosa) {
               const maxInGen = Math.pow(2, layout.generation);
               const quartile = Math.floor((layout.sosa - maxInGen) * 4 / maxInGen) % 4;
               fillColor = layout.generation < 0
                  ? undefined
                  : baseQuartileColors[quartile];
            }
            return new Style({...DEFAULT, fill: fillColor});

         case GENERATION.id:
            if (layout) {
               fillColor = Style.hsvStr(
                  180 + 360 * (Math.abs(layout.generation) - 1) / 12,
                  0.4, 1.0);
            }
            return new Style({...DEFAULT, fill: fillColor});

         default:
            return p && p.style ? p.style : DEFAULT;
      }
   }

   /**
    * Default for fanchart boxes
    */
   static forFanchartBox(colors: GP_JSON.ColorSchemeId): Style {
      return colors == NO_BOX.id ? TEXT_ONLY : DEFAULT;
   }

   /**
    * Compute the style for the separator above the person.
    * In the fanchart, this is the inter-generation separator.
    */
   static forSeparator(colors: GP_JSON.ColorSchemeId,
                       p?: Person,
                       layout?: BasePersonLayout
   ): Style {
      return ColorTheme.forPerson(colors, p, layout).darker(0.3);
   }
}

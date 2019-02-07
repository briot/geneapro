import * as d3Color from 'd3-color';
import Style from '../Store/Styles';
import { Person } from '../Store/Person';

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

const STROKE_GREY = new Style({stroke: '#222'});
const STROKE_GREY_ON_WHITE = new Style({stroke: '#222', fill: '#fff'});
const NORMAL_BLACK = new Style({fontWeight: 'normal', color: 'black'});
const BOLD_BLACK = new Style({fontWeight: 'bold', color: 'black'});
const DEFAULT = new Style({});

export default class ColorTheme {

   /**
    * Compute the display style for a person
    */
   static forPerson(colors: ColorScheme,
                    p?: Person,
                    layout?: BasePersonLayout,
   ): Style {

      let fillColor: string | undefined;

      switch (colors) {
         case ColorScheme.PEDIGREE:
            if (layout) {
               // Avoid overly saturated colors when displaying few
               // generations.
               fillColor = Style.hsvStr(
                  (layout.angle || 0) * 360,
                  Math.abs(layout.generation) / MAXGEN,
                  1.0);
            }
            return new Style({stroke: '#222', fill: fillColor});

         case ColorScheme.WHITE:
            return STROKE_GREY_ON_WHITE;

         case ColorScheme.NO_BOX:
            return DEFAULT;

         case ColorScheme.QUARTILE:
            if (layout && layout.sosa) {
               const maxInGen = Math.pow(2, layout.generation);
               const quartile = Math.floor((layout.sosa - maxInGen) * 4 / maxInGen) % 4;
               fillColor = layout.generation < 0
                  ? undefined
                  : baseQuartileColors[quartile];
            }
            return new Style({stroke: '#222', fill: fillColor});

         case ColorScheme.GENERATION:
            if (layout) {
               fillColor = Style.hsvStr(
                  180 + 360 * (Math.abs(layout.generation) - 1) / 12,
                  0.4, 1.0);
            }
            return new Style({stroke: '#222', fill: fillColor});

         case ColorScheme.CUSTOM:
            return p && p.style ? p.style : STROKE_GREY;

         default:
            return STROKE_GREY;
      }
   }

   /**
    * Default style for pedigree and fanchart text (names)
    */
   static forPedigreeName(colors: ColorScheme): Style {
      switch (colors) {
         case ColorScheme.CUSTOM: return NORMAL_BLACK;
         default:                 return BOLD_BLACK;
      }
   }

   /**
    * Default for fanchart boxes
    */
   static forFanchartBox(colors: ColorScheme): Style {
      switch (colors) {
         case ColorScheme.CUSTOM: return NORMAL_BLACK;
         default:                 return DEFAULT;
      }
   }

   /**
    * Compute the style for the separator above the person.
    * In the fanchart, this is the inter-generation separator.
    */
   static forSeparator(colors: ColorScheme,
                       p?: Person,
                       layout?: BasePersonLayout
   ): Style {
      return ColorTheme.forPerson(colors, p, layout).darker(0.3);
   }
}

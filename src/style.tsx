import * as d3Color from 'd3-color';
import Color from './Color';
import { ColorScheme } from './Store/Pedigree';
import { PersonStyle } from './Store/Styles';
import { Person } from './Store/Person';

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
   d3Color.rgb(127, 229, 252),
   d3Color.rgb(185, 253, 130),
   d3Color.rgb(252, 120, 118),
   d3Color.rgb(255, 236, 88)];

const BLACK = d3Color.rgb(0, 0, 0);

export class Style {

   /**
    * Compute the display style for a person
    */
   static forPerson(colors: ColorScheme,
                    p?: Person,
                    layout?: BasePersonLayout,
                   ): PersonStyle {
      let style: PersonStyle = {
         stroke: colors === ColorScheme.NO_BOX ? undefined : d3Color.color('#222'),
      };

      if (layout) {
         switch (colors) {
            case ColorScheme.PEDIGREE:
               // Avoid overly saturated colors when displaying few
               // generations.
               style.fill = Color.hsv(
                  (layout.angle || 0) * 360,
                  Math.abs(layout.generation) / MAXGEN,
                  1.0);
               break;
            case ColorScheme.WHITE:
               style.fill = d3Color.color('#fff');
               break;
            case ColorScheme.NO_BOX:
               break;
            case ColorScheme.QUARTILE:
               const maxInGen = Math.pow(2, layout.generation);
               if (layout.sosa) {
                  const quartile = Math.floor((layout.sosa - maxInGen) * 4 / maxInGen) % 4;
                  style.fill = layout.generation < 0 ? undefined : baseQuartileColors[quartile];
               }
               break;
            case ColorScheme.GENERATION:
               style.fill = Color.hsv(
                  180 + 360 * (Math.abs(layout.generation) - 1) / 12, 0.4, 1.0);
               break;
            case ColorScheme.CUSTOM:
               if (p) {
                  style = {...p.style};
               }
               break;
            default:
               break;
         }
      }
      return style;
   }

   /**
    * Default style for pedigree and fanchart text (names)
    */
   static forPedigreeName(colors: ColorScheme): PersonStyle {
      switch (colors) {
         case ColorScheme.CUSTOM:
            return {fontWeight: 'normal', color: BLACK};
         default:
            return {fontWeight: 'bold', color: BLACK};
      }
   }

   /**
    * Default for fanchart boxes
    */
   static forFanchartBox(colors: ColorScheme): PersonStyle {
      switch (colors) {
         case ColorScheme.CUSTOM:
            return {stroke: BLACK};
         default:
            return {};
      }
   }

   /**
    * Compute the style for the separator above the person.
    * In the fanchart, this is the inter-generation separator.
    */
   static forSeparator(colors: ColorScheme,
                       p?: Person,
                       layout?: BasePersonLayout): PersonStyle {
      const s = Style.forPerson(colors, p, layout);
      if (s.fill) {
         s.fill = s.fill.darker(0.3);
      }
      return s;
   }
}

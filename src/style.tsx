import * as React from 'react';
import * as d3Color from 'd3-color';
import Color from './Color';
import { ColorScheme } from './Store/Pedigree';

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

interface PersonStyle {
   style?: React.CSSProperties;
   fill?: d3Color.ColorCommonInstance;
   stroke?: d3Color.ColorCommonInstance;
}

export function styleToString(style: PersonStyle) {
   return {
      fill: style.fill ? style.fill.toString() : 'none',
      stroke: style.stroke ? style.stroke.toString() : 'none',
      style: style.style,
   };
}

const MAXGEN = 12;
const baseQuartileColors = [
   d3Color.rgb(127, 229, 252),
   d3Color.rgb(185, 253, 130),
   d3Color.rgb(252, 120, 118),
   d3Color.rgb(255, 236, 88)];

export class Style {

   /**
    * Compute the display style for a person
    */
   static forPerson(colors: ColorScheme,
                    p?: BasePersonLayout,
                   ): PersonStyle {
      let style: PersonStyle = {
         stroke: colors === ColorScheme.NO_BOX ? undefined : d3Color.color('#222'),
      };

      if (p !== undefined) {
         switch (colors) {
            case ColorScheme.PEDIGREE:
               // Avoid overly saturated colors when displaying few
               // generations.
               style.fill = Color.hsv(
                  (p.angle || 0) * 360,
                  Math.abs(p.generation) / MAXGEN,
                  1.0);
               break;
            case ColorScheme.WHITE:
               break;
            case ColorScheme.NO_BOX:
               break;
            case ColorScheme.QUARTILE:
               const maxInGen = Math.pow(2, p.generation);
               if (p.sosa) {
                  const quartile = Math.floor((p.sosa - maxInGen) * 4 / maxInGen) % 4;
                  style.fill = p.generation < 0 ? undefined : baseQuartileColors[quartile];
               }
               break;
            case ColorScheme.GENERATION:
               style.fill = Color.hsv(
                  180 + 360 * (Math.abs(p.generation) - 1) / 12, 0.4, 1.0);
               break;
            default:
               break;
         }
      }
      return style;
   }

   /**
    * Compute the style for the separator above the person.
    * In the fanchart, this is the inter-generation separator.
    */
   static forSeparator(colors: ColorScheme,
                       p: BasePersonLayout): PersonStyle {
      const s = Style.forPerson(colors, p);
      if (s.fill) {
         s.fill = s.fill.darker(0.3);
      }
      return s;
   }
}

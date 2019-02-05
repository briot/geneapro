import * as d3Color from 'd3-color';
import * as JSON from '../Server/JSON';

export interface PersonStyle {
   fill?: d3Color.ColorCommonInstance|null;
   stroke?: d3Color.ColorCommonInstance|null;
   color?: d3Color.ColorCommonInstance|null;
   fontWeight?: number|'bold'|'normal'|'lighter'|'bolder';
}

export function styleToString(style: PersonStyle|undefined) {
   return {
      fill: style && style.fill ? style.fill.toString() : 'none',
      stroke: style && style.stroke ? style.stroke.toString() : 'none',
      color: style && style.color ? style.color.toString() : 'black',
      fontWeight: (style && style.fontWeight) || 'normal',
   };
}

export function combineStyles(
   style1: PersonStyle, style2: PersonStyle
): PersonStyle {
   return {
      fill: style1.fill || style2.fill,
      stroke: style1.stroke || style2.stroke,
      color: style1.color || style2.color,
      fontWeight: style1.fontWeight || style2.fontWeight,
   };
}

/**
 * Only combine text-related properties
 */
export function combineStylesForText(
   style1: PersonStyle, style2: PersonStyle
): PersonStyle {
   return {
      fill: style1.color || style2.color,
      fontWeight: style1.fontWeight || style2.fontWeight,
   };
}

export function jsonStyleToStyle(
   s: JSON.Style|undefined
): PersonStyle|undefined {
   return s === undefined ? undefined : {
      fill: d3Color.color(s['fill']),
      stroke: d3Color.color(s['stroke']),
      color: d3Color.color(s['color']),
      fontWeight: s['fontWeight'] as number|'bold'|'normal'|'lighter'|'bolder',
   };
}

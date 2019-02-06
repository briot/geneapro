import * as d3Color from 'd3-color';
import * as JSON from '../Server/JSON';

type FontWeight = number|'bold'|'normal'|'lighter'|'bolder';

export interface PersonStyle {
   fill?: d3Color.ColorCommonInstance|null;
   stroke?: d3Color.ColorCommonInstance|null;
   color?: d3Color.ColorCommonInstance|null;
   fontWeight?: FontWeight;
}

/**
 * Return a style suitable for a SVG element
 */
export function styleToSVG(style: PersonStyle|undefined) {
   return {
      fill: style && style.fill ? style.fill.toString() : 'none',
      stroke: style && style.stroke ? style.stroke.toString() : 'none',
      color: style && style.color ? style.color.toString() : 'none',
      fontWeight: (style && style.fontWeight) || 'normal',
   };
}

/**
 * Return a style suitable for a SVG text
 */
export function styleToSVGText(style: PersonStyle|undefined) {
   return {
      fill: style && style.color ? style.color.toString() : 'none',
      fontWeight: (style && style.fontWeight) || 'normal',
   };
}

/**
 * Return a style suitable for a DOM element
 */
export function styleToDOM(style: PersonStyle|undefined) {
   return {
      background: style && style.fill ? style.fill.toString() : 'none',
      color: style && style.color ? style.color.toString() : 'none',
      fontWeight: (style && style.fontWeight) || 'normal',
   };
}

/**
 * Combines two styles, applying style2 only where style1 is not set.
 */

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

export function jsonStyleToStyle(
   s: JSON.Style|undefined
): PersonStyle|undefined {
   return s === undefined ? undefined : {
      fill: d3Color.color(s.fill),
      stroke: d3Color.color(s.stroke),
      color: d3Color.color(s.color),
      fontWeight: s.fontWeight as FontWeight,
   };
}

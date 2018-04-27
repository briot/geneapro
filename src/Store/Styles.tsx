import * as d3Color from 'd3-color';

export interface PersonStyle {
   fill?: d3Color.ColorCommonInstance|null;
   stroke?: d3Color.ColorCommonInstance|null;
   color?: d3Color.ColorCommonInstance|null;
   fontWeight?: string;
}

export function styleToString(style: PersonStyle) {
   return {
      fill: style.fill ? style.fill.toString() : 'none',
      stroke: style.stroke ? style.stroke.toString() : 'none',
      color: style.color ? style.color.toString() : 'black',
      fontWeight: style.fontWeight,
   };
}

import * as d3Color from 'd3-color';

export default class Color {

   /**
    * Support for HSV colors
    */
   static hsv(h: number, s: number, v: number): d3Color.HSLColor {
      const ll = (2.0 - s) * v;
      const ss = (s * v) / (ll <= 1 ? ll : 2.0 - ll);
      return d3Color.hsl(h, ss, ll / 2);
   }
}

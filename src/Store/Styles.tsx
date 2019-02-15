import * as d3Color from 'd3-color';
import * as JSON from '../Server/JSON';

type StyleTarget = 'svg' | 'svgtext' | 'svgtext2' | 'dom';

export default class Style {

   protected fill?: string;
   protected stroke?: string;
   protected color?: string;
   protected fontWeight?: JSON.FontWeight;

   /**
    * Support for HSV colors
    */
   static hsv(h: number, s: number, v: number): d3Color.HSLColor {
      const ll = (2.0 - s) * v;
      const ss = (s * v) / (ll <= 1 ? ll : 2.0 - ll);
      return d3Color.hsl(h, ss, ll / 2);
   }

   static hsvStr(h: number, s: number, v: number) {
      return Style.hsv(h, s, v).toString();
   }

   /**
    * Build from JSON data
    */
   constructor(s: JSON.Style) {
      this.fill = s.fill;
      this.stroke = s.stroke;
      this.color = s.color;
      this.fontWeight = s.fontWeight;
   }

   /**
    * Return a version suitable for use as react properties
    */

   public toStr(target: StyleTarget) {
      switch(target) {
         case 'svg':
            return {
               fill: this.fill || 'none',
               stroke: this.stroke || 'none',
               color: this.color || 'none',
               fontWeight: this.fontWeight || 'normal',
            };

         case 'svgtext':
            return {
               fill: this.color || 'none',
               fontWeight: this.fontWeight || 'normal',
            };

         case 'svgtext2':
            return {
               fill: this.fill || 'none',
               fontWeight: this.fontWeight || 'normal',
            };

         case 'dom':
            return {
               background: this.fill || 'none',
               color: this.color || 'none',
               fontWeight: this.fontWeight || 'normal',
            };
      }
   }

   /**
    * Combines two styles, applying style2 only where this is not set.
    */

   public combineWith(style2: Style): Style {
      return new Style({
         fill: this.fill || style2.fill,
         stroke: this.stroke || style2.stroke,
         color: this.color || style2.color,
         fontWeight: this.fontWeight || style2.fontWeight,
      });
   }

   /**
    * A slightly darker style
    */
   public darker(percent: number) {
      const fillColor = this.fill ? d3Color.color(this.fill) : undefined;

      return new Style({
         stroke: this.stroke,
         fill: fillColor ? fillColor.darker(percent).toString() : undefined,
         color: this.color,
         fontWeight: this.fontWeight,
      });
   }
}

import { BasePersonLayout } from '../Store/ColorTheme';

/**
 * The 'angle' field (in [0,1] range) is used only for colors.
 * For layout, use minAngle and maxAngle
 */
export interface PersonLayout extends BasePersonLayout {
   id: number;         // id of the person, negative if dummy box
   minAngle: number;   // start angle, in radians
   maxAngle: number;   // end angle, in radians
   minRadius: number;  // inner radius
   maxRadius: number;  // outer radius
   parents: PersonLayout[];
   parentsMarriage?: {
      text: string;
   };
   children: PersonLayout[];
}

export interface PersonLayouts {
   [id: number]: PersonLayout;
   width: number;   // total height of drawing
   height: number;  // total width of drawing
   centerX: number; // distance from left side to the center
   centerY: number;
   spaceBetweenGens: number; // space between each generation
}

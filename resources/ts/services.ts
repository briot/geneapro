/**
 * This class provides mathematical-oriented services.
 * These are mostly copied from Google closure
 */

export const TWO_PI = Math.PI * 2
export const HALF_PI = Math.PI / 2

export class math {
   /**
    * Standard % has the same size for the modulo as the dividend,
    * as opposed to standard math
    */
   static modulo(a : number, b : number) : number {
      const r = a % b;
      return (r * b < 0) ? r + b : r;
   }
   
   /**
    * Normalize an angle to be in the range [0-2PI]
    */
   static standardAngle(angle : number) : number {
      return math.modulo(angle, TWO_PI);
   };
}

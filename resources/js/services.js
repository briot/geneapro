/**
 * This class provides mathematical-oriented services.
 * These are mostly copied from Google closure
 */

function math() {}

/**
 * Standard % has the same size for the modulo as the dividend,
 * as opposed to standard math
 */
math.modulo = function(a, b) {
   var r = a % b;
   return (r * b < 0) ? r + b : r;
};

/**
 * Normalize an angle to be in the range [0-2PI]
 */
math.standardAngle = function(angle) {
   return math.modulo(angle, 2 * Math.PI);
};

/**
 * @externs
 */

/**
 * @return {jQuery.Color}
 * @constructor
 */
jQuery.Color = function() {};

/**
 * @param {number|string} r    The Red component or the color.
 * @param {number=} g    The Red component.
 * @param {number=} b    The Red component.
 * @return {jQuery.Color}
 */
$.Color = function(r, g, b) {};

/**
 * @return {string}   the represention of the color.
 */

jQuery.Color.prototype.toString = function() {};

/**
 * @param {string}  color   The color itself.
 * @param {number}  opacity  The opacity.
 * @return {jQuery.Color}
 */
jQuery.Color.prototype.transition = function(color, opacity) {};

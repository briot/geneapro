/**
 * @externs
 */

/**
 * @return {jQuery}  the same as 'this'.
 * @param {Object|string}  options to build the dialog, or command to apply.
 */
jQuery.prototype.dialog = function(options) {};

/**
 * @return {jQuery|number}  the same as 'this', or the value of the property.
 * @param {Object|string}  options to build, or command to apply.
 */
jQuery.prototype.slider = function(options) {};

/**
 * @return {jQuery|number}  the same as 'this', or the value of the property.
 * @param {Object|string}  options to build, or command to apply.
 */
jQuery.prototype.raty = function(options) {};

/**
 * @return {jQuery|number}  the same as 'this', or the value of the property.
 * @param {Object|string}  options to build, or command to apply.
 */
jQuery.prototype.dataTable = function(options) {};

/**
 * @type {Object}
 */
$.event.special;

/**
 * @param {?} parameters to dispatch
 */
$.event.dispatch;

/**
 * @param {?} parameters to dispatch
 */
$.event.handle;

/**
 * @param {jQuery.event} e The event.
 */
$.event.fix = function(e) {};

/** @type {boolean} */
jQuery.event.prototype.altKey;

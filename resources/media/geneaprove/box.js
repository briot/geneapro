/**
 * Layout information used in the various canvases.
 * @constructor
 */

function LayoutInfo() {};

/**
 * A rectangular area on the screen.
 * @param {number}  x    left coordinate.
 * @param {number}  y    top coordinate.
 * @param {number}  w    width.
 * @param {number}  h   height.
 * @extends {LayoutInfo}
 * @constructor
 */

function Box(x, y, w, h) {
   this.x = x;
   this.y = y;
   this.w = w;
   this.h = h;
}
inherits(Box, LayoutInfo);

/**
 * @param {number} x    X coordinate.
 * @param {number} y    Y coordinate.
 * @return {boolean}  Whether the point is inside the box.
 */

Box.prototype.contains = function(x, y) {
   return (this.x <= x && x <= this.x + this.w &&
           this.y <= y && y <= this.y + this.h);
};

/**
 * @param {Box} box   The box to test.
 * @return {boolean}  Whether the two boxes intersect.
 */

Box.prototype.intersects = function(box) {
 return !(this.x + this.w < box.x ||
          this.x > box.x + box.w ||
          this.y + this.h < box.y ||
          this.y > box.y + box.h);
};

/**
 * Expand this rectangle to also include the area of the given rectangle.
 * @param {Box} rect The other rectangle.
 */
Box.prototype.boundingRect = function(rect) {
  // We compute right and bottom before we change left and top below.
  var right = Math.max(this.x + this.w, rect.x + rect.w);
  var bottom = Math.max(this.y + this.h, rect.y + rect.h);

  this.left = Math.min(this.x, rect.x);
  this.top = Math.min(this.y, rect.y);

  this.width = right - this.x;
  this.height = bottom - this.y;
};

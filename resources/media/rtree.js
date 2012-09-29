/**
 * @fileoverview This file provides a R-Tree datastructure.
 * This is used for geospatial queries (find all objects within a given
 * rectangle).
 * See algorithm in
 *    http://www-db.deis.unibo.it/courses/SI-LS/papers/Gut84.pdf.
 */

function Rect(x, y, width, height) {
    this.left = x;
    this.top = y;
    this.width = width;
    this.height = height;
}


/**
 * Returns whether two rectangles intersect. Two rectangles intersect if they
 * touch at all, for example, two zero width and height rectangles would
 * intersect if they had the same top and left.
 * @param {goog.math.Rect} a A Rectangle.
 * @param {goog.math.Rect} b A Rectangle.
 * @return {boolean} Whether a and b intersect.
 */
Rect.prototype.intersects = function(b) {
  return (this.left <= b.left + b.width && b.left <= this.left + this.width &&
      this.top <= b.top + b.height && b.top <= this.top + this.height);
};

/**
 * Expand this rectangle to also include the area of the given rectangle.
 * @param {goog.math.Rect} rect The other rectangle.
 */
Rect.prototype.boundingRect = function(rect) {
  // We compute right and bottom before we change left and top below.
  var right = Math.max(this.left + this.width, rect.left + rect.width);
  var bottom = Math.max(this.top + this.height, rect.top + rect.height);

  this.left = Math.min(this.left, rect.left);
  this.top = Math.min(this.top, rect.top);

  this.width = right - this.left;
  this.height = bottom - this.top;
};

/**
 * @define {number} maximum number of children in a cell before a split.
 */

var RTREE_MAX_CHILDREN = 6;

/**
 * @define {number} minimum number of children before a merge
 * We must have    RTREE_MIN_CHILDREN <= RTREE_MAX_CHILDREN / 2.
 */

var RTREE_MIN_CHILDREN = 3;

/**
 * A R-Tree.
 * This splits the space into cells that contain a maximum number of objects,
 * and makes it easy to find out objects within a given rectangle.
 * @constructor
 */

RTree = function() {
    /**
     * @type {Box}
     * @private
     */
    this.root_ = new Box(0, 0, 0, 0);
};

/**
 * Find all the objects that intersect the given rectangle.
 * The implementation is non-recursive for maximum efficiency.
 * @param {number} x   Top-left corner of search area.
 * @param {number} y   Top-left corner of search area.
 * @param {number} w   Width of search area, in pixels.
 * @param {number} h   Height of search area, in pixels.
 * @return {Array.<*>}  Matching objects.
 */

RTree.prototype.find = function(x, y, w, h) {
    var rect = new Rect(x, y, w, h);
    var stack = [this.root_];  //  Elements to analyze
    var results = [];

    if (this.root_.nodes_ != null) {
        while (stack.length > 0) {
            var current = stack[0];
            var nodes = current.nodes_;
            if (nodes) {
                for (var n = nodes.length - 1; n >= 0; n--) {
                    var node = nodes[n];

                    if (node.intersects(rect)) {
                        if (node.object_) {
                            results.unshift(node.object_);
                        } else {
                            stack.push(node);  // Will analyze later
                        }
                    }
                }
            }
            stack.shift();  //  Remove processed item
        }
    }
    return results;
};

/**
 * Add a new objet to the tree.
 * @param {number} x   Top-left corner of minimal bounding box.
 * @param {number} y   Top-left corner of minimal bounding box.
 * @param {number} w   Width of minimal bounding box.
 * @param {number} h   Height of minimal bounding box.
 * @param {*}      obj Object inserted at that location.
 */

RTree.prototype.insert = function(x, y, w, h, obj) {
    var child = new Box(x, y, w, h, obj);

    // Initial insertion in empty tree. Resize the tree.

    if (this.root_.nodes_ == null) {
        this.root_.addChild_(child);
        this.root_.recomputeBoundingBox_();

    //  Else find best fitting leaf node

    } else {
        //  Compute the best node to insert the new child. The returned node
        //  has leaves as children (ie they don't themselves contain nodes).

        var parents = this.chooseLeafNode_(child);

        parents[parents.length - 1].addChild_(child);

        // Walk up the tree and resize the bounding boxes as needed

        for (var i = parents.length - 1; i >= 0; i--) {
            parents[i].boundingRect(child);
        }

        // Now split the nodes as needed when they are full: starting with
        // the new parent A, we check if it has too many children. If yes,
        // its P will have one more child B. The children of the
        // A are then shared between A and B, where the algorithm tries to
        // minimize the area of both A and B.
        // P might now have too many children as well, so we go up the tree
        // and normalize the nodes (we might eventually have to create a new
        // root). This ensures a balanced tree.

        for (i = parents.length - 1; i >= 0; i--) {
            var parent = parents[i];

            if (parent.nodes_.length < RTREE_MAX_CHILDREN) {
                break;
            }

            var seeds = this.linearPickSeeds_(
                parent.width, parent.height, parent.nodes_);
            var nodes = parent.nodes_;

            parent.nodes_ = [seeds[0]];
            parent.setBox(seeds[0]);

            var new_parent = new Box(
                seeds[1].left, seeds[1].top, seeds[1].width, seeds[1].height);
            new_parent.addChild_(seeds[1]);

            for (var n = 0; n < nodes.length; n++) {
                var node = nodes[n];
                if (node != seeds[0] && node != seeds[1]) {
                    var p = this.leastEnlargement_([parent, new_parent], node);
                    p.addChild_(node);
                    p.boundingRect(node);
                }
            }

            // If we are splitting the root node, we need to create a new root

            if (parent == this.root_) {
                var new_root = new Box(
                    this.root_.left, this.root_.top,
                    this.root_.width, this.root_.height);
                new_root.addChild_(this.root_);
                this.root_ = new_root;

                new_root.addChild_(new_parent);
                new_root.boundingRect(new_parent);

            } else {
                // Global bounding box hasn't changed, no need to recompute
                parents[i - 1].addChild_(new_parent);
            }
        }
    }
};

/**
 * Clear the tree
 */

RTree.prototype.clear = function() {
    this.root_ = new Box(0, 0, 0, 0);
};

/**
 * Remove the object in the given rectangle.
 * If obj is unspecified, all nodes that intersect the specified region are
 * removed.
 * @param {number} x  Top-left corner of bounding box.
 * @param {number} y  Top-left corner of bounding box.
 * @param {number} w  Width of bounding box.
 * @param {number} h  Height of bounding box.
 * @param {*=}      obj  The object to remove (or all objects if unspecified).
 */

RTree.prototype.remove = function(x, y, w, h, obj) {
    var rect = new Rect(x, y, w, h);
    var stacks = this.findLeafs_(rect, obj);
    var eliminated = [];

    for (var n = stacks.length - 1; n >= 0; n--) {
        var stack = stacks[n];

        /**
         * @param {number} lastInStack  index in the stack pointing to the
         *    parent element of node. This removes node from that element
         *    and propagates the change.
         * @param {Box} node  The node to remove.
         */

        function internal(lastInStack, node) {
            var parent = stack[lastInStack];

            // Remove 'node' from parent.nodes_
            $.grep(parent.nodes_, function(n) {return n != node});

            if (parent.nodes_.length == 0) {
                parent.nodes_ = null;
            } else if (
               lastInStack != 0 && parent.nodes_.length < RTREE_MIN_CHILDREN)
           {
                eliminated.push(parent);
                internal(lastInStack - 1, parent);
            }

            parent.recomputeBoundingBox_();
        }

        internal(stack.length - 2, stack[stack.length - 1]);
    }

    // Reinsert the eliminated nodes.

    function insertLeaves(tree, nodes) {
        for (var n = nodes.length - 1; n >= 0; n--) {
            var node = nodes[n];
            if (node.object_) {
                tree.insert(
                    node.left, node.top, node.width, node.height, node.object_);
            } else {
                insertLeaves(tree, node.nodes_);
            }
        }
    }

    insertLeaves(this, eliminated);
};

/**
 * Return the leafs that intersect rect. Each element in the returned array
 * is [..., parent_of_parent, parent, leaf].
 * If obj is specified, only nodes containing obj will be returned.
 *
 * @param {goog.math.Rect} rect  The rectangle we are inserting.
 * @param {*=} obj The object we are inserting.
 * @return {Array.<Array.<!Box>>} The matching leaves.
 * @private
 */

RTree.prototype.findLeafs_ = function(rect, obj) {
    var results = [];

    function internal(stack) {
        var current = stack[stack.length - 1];
        var nodes = current.nodes_;
        for (var n = nodes.length - 1; n >= 0; n--) {
            var node = nodes[n];

            if (node.intersects(rect)) {
                if (node.object_) {
                    if (!goog.isDef(obj) || node.object_ == obj) {
                        results.push(stack.concat(node));
                    }
                } else {
                    internal(stack.concat(node));
                }
            }
        }
    }

    internal([this.root_]);
    return results;
};

/**
 * Returns a bounding box that encloses all elements in the tree
 * @return {goog.math.Rect}  The minimal bounding box for the whole tree.
 */

RTree.prototype.boundingBox = function() {
    return this.root_.clone();
};

/**
 * Select, among the children of box, the two that are less likely to be in
 * the same parent after a split. This uses the linear search proposed in the
 * original paper on R-Trees.
 * w and h are the total dimensions of the box.
 * @param {number} w  The total width of the parent box.
 * @param {number} h  The total height of the parent box.
 * @param {Array.<Box>} nodes   All children of the parent box.
 * @return {!Array.<!Box>} seeds The two nodes that should be put
 *    in two different children.
 * @private
 */

RTree.prototype.linearPickSeeds_ = function(w, h, nodes) {
    //  Find extreme rectangles along all dimensions.
    //  Along each dimensions, find the entry whose rectangle has
    //  the highest low side, and the one with the lowest high-side.
    //  Record the separations.

    var x_high = nodes[0],   //  node with highest low x
        x_low = x_high,
        highest_low_x = x_low.left,
        lowest_high_x = x_high.left + x_high.width;
    var y_high = nodes[0],
        y_low = y_high,
        highest_low_y = y_low.top,
        lowest_high_y = y_high.top + y_high.height;

    for (var index = 0; index < nodes.length; index++) {
        var n = nodes[index];

        if (n.left > highest_low_x) {
            x_low = n;
        } else if (n.left + n.width < lowest_high_x) {
            x_high = n;
        }

        if (n.top > highest_low_y) {
            y_low = n;
        } else if (n.top + n.height < lowest_high_y) {
            y_high = n;
        }
    }

    //  Adjust the shape of the rectangle cluster.
    //  Normalize the separations by dividing by the width of the entire
    //  set along the corresponding dimensions.

    var candidate_x = Math.abs(lowest_high_x - highest_low_x) / w,
        candidate_y = Math.abs(lowest_high_y - highest_low_y) / h;

    //  Select the most extreme pair (the pair with the greatest
    //  normalized separation along any dimensions

    if (candidate_x > candidate_y) {
        return [x_low, x_high];
    } else {
        return [y_low, y_high];
    }
};

/**
 * DEBUG: count the number of cells in the tree
 * @return {string}   A debug description of the tree.
 */

RTree.prototype.dumpDebug = function() {
    /** @param {Box} box   The current child to dump.
     * @param {string} prefix   A string for each beginning of line.
     * @return {string}  A description of that child.
     */
    function internal(box, prefix) {
        if (box.nodes_ == null) {
            return prefix + '[leaf ' + box.toString() + ' ' + box.object_ + ']';
        } else {
            var children = '';
            for (var index = 0; index < box.nodes_.length; index++) {
                children += '\n' + internal(box.nodes_[index], prefix + '  ');
            }
            return prefix + '[' + box.toString() + children + ']';
        }
    }
    return internal(this.root_, '');
};


/**
 * Choose the best node to insert RECT into, starting at THIS.
 * It never returns a leaf node, only a node that accepts children.
 * It also returns all of its parents:
 *     [parent_of_parent, parent, leaf]
 * @param {goog.math.Rect} rect   The rectangle to insert.
 * @return {!Array.<!Box>}  Best parent node for this rect.
 * @private
 */

RTree.prototype.chooseLeafNode_ = function(rect) {
    var best_choice = this.root_;
    var nodes = best_choice.nodes_;
    var result = [best_choice];

    // Stop when we can go no further down in the tree (nodes below are
    // are leaves.

    while (nodes != null && nodes.length != 0 && !nodes[0].object_) {
        best_choice = this.leastEnlargement_(nodes, rect);
        result.push(best_choice);
        nodes = best_choice.nodes_;
    }

    return result;
};

/**
 * Returns the node from nodes that would require the least enlargment to
 * contain rect.
 * Nodes must not be null, and then the returned value will not be null either.
 * @param {!Array.<Box>} nodes   All nodes from the parent.
 * @param {goog.math.Rect} rect   The rectangle to insert.
 * @return {!Box}  The node that requires least enlargement.
 * @private
 */

RTree.prototype.leastEnlargement_ = function(nodes, rect) {
    var best_choice = null;
    var best_choice_enlarge;

    for (var i = nodes.length - 1; i >= 0; i--) {
        var ltree = nodes[i];
        var old_ratio = ltree.width * ltree.height;
        var new_width = Math.max(
            ltree.left + ltree.width, rect.left + rect.width) -
            Math.min(ltree.left, rect.left);
        var new_height = Math.max(
            ltree.top + ltree.height, rect.top + rect.height) -
            Math.min(ltree.top, rect.top);
        var enlarge = Math.abs(new_width * new_height - old_ratio);

        if (!best_choice || enlarge < best_choice_enlarge) {
            best_choice_enlarge = enlarge;
            best_choice = ltree;
        }
    }
    return /** @type {!Box} */ (best_choice);
};

/**
 * A box in the r-tree. It is automatically added to the parent's children if
 * parent is specified.
 * @param {number} x   Top-left corner of bounding box.
 * @param {number} y   Top-left corner of bounding box.
 * @param {number} w   Width of bounding box.
 * @param {number} h   Height of bounding box.
 * @param {*=} obj     Object contained in the box.
 * @constructor
 * @extends {goog.math.Rect}
 */

Box = function(x, y, w, h, obj) {
    Rect.apply(this, [x, y, w, h]);

    if (obj !== undefined) {
        this.object_ = obj;
    }
};
inherits(Box, Rect);

/**
 * Override the bounding box
 * @param {Box} box  Size and location of the box.
 */

Box.prototype.setBox = function(box) {
    this.left = box.left;
    this.top = box.top;
    this.width = box.width;
    this.height = box.height;
};

/**
 * Children of the box. Unset for leaf nodes
 * @type {Array.<!Box>}
 * @private
 */
Box.prototype.nodes_ = null;

/**
 * Data for leaf nodes, unset for other nodes
 * @type {*}
 * @private
 */
Box.prototype.object_ = null;

/**
 * The container box, if any
 * @type {Box?}
 * @private
 */
Box.prototype.parent_ = null;

/**
 * Add a new child. This doesn't update the bounding boxes or ensures that the
 * number of children is kept below the threshold.
 * @param {!Box} child  The child to add.
 * @private
 */

Box.prototype.addChild_ = function(child) {
    if (this.nodes_ == null) {
        this.nodes_ = [child];
    } else {
        this.nodes_.push(child);
    }
    child.parent_ = this;
};

/**
 * recompute the tightest bounding box for all children of this
 * @private
 */

Box.prototype.recomputeBoundingBox_ = function() {
    if (!this.nodes_) {
        this.left = 0;
        this.top = 0;
        this.width = 0;
        this.height = 0;
    } else {
        var node = this.nodes_[0];
        this.left = node.left;
        this.top = node.top;
        this.width = node.width;
        this.height = node.height;

        for (var n = this.nodes_.length - 1; n > 0; n--) {
            this.boundingRect(this.nodes_[n]);
        }
        if (this.parent_) {
            this.parent_.recomputeBoundingBox_();
        }
    }
};

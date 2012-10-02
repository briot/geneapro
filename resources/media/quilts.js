/* @requires: canvas.js */
/* @requires: mouse_events.js */

var LINE_SPACING = 10;
var MARGIN = 2;
var F_HEIGHT = 10;       // height of the row with "F" (families)

/**
 * Decorates a <canvas> element to show a quilts layout.
 *
 * @param {Element} element   The DOM element to decorate.
 * @param {} layers   The data sent by the server.
 * @param {Array.<*>} families
 *    The data from the server. It has the following format:
 *        families ::= [ families_in_layer+ ]
 *        families_in_layer ::= [ family+ ]
 *        family ::= [father || -1, mother || -1, child1, child2,...]
 * @extends {Canvas}
 */

function QuiltsCanvas(canvas, layers, families) {
    Canvas.call(this, canvas /* elem */);

    this.ctx.font = this.fontName;

    this.layers = layers;  // list of people in each layer
    this.families = families;

    this.rtree_ = new RTree();
    this.selectIndex = 0;  //  number of current selections
    this.selected_ = {};   // id -> list of selection indexes
    this.selectColors = ["red", "blue", "green", "yellow", "orange"];

    this.analyzeData_();
};
inherits(QuiltsCanvas, Canvas);

/** Whether to display text in a different color for selected items */
QuiltsCanvas.prototype.changeSelectedTextColor = false;

/** Whether we only display selected people */
QuiltsCanvas.prototype.filtered = false;

/**
 * Analyze the data to display, so that later drawing can be sped up.
 * @private
 */

QuiltsCanvas.prototype.analyzeData_ = function() {
    // Preprocess the data to gather information relative to each person in a
    // datastructure easier to manipulate

    this.personToLayer = {};   //  id of person -> [layer, index in layer]
    this.forEachNonEmptyLayer_(function(layer) {
        var index = 0;
        for (var person = 0; person < this.layers[layer].length; person++) {
            var p = this.layers[layer][person];
            var id = p[0];

            if (!this.filtered || this.selected_[id]) {
                var sex = p[2];
                this.personToLayer[id] = {
                    layer: layer,
                    index: index,  // index in layer
                    id: id,
                    sex: sex /* sex */,
                    name: (sex == "F" ?
                           '\u2640' : sex == "M" ? '\u2642' : ' ') + p[1],
                    leftMostParentLayer: 0,
                    leftMostParentFamily: 0,  // index of family
                    leftMostParentIndex: 0,   // index of parent
                    rightMostMarriageLayer: this.layers.length,
                    rightMostMarriageIndex: 0}; // index of family
                index++;
            }
        }
    });

    // Analyze data from the families, needed for further display.

    for (var layer = 0; layer < this.families.length; layer++) {
        var families_in_layer = this.families[layer];

        for (var family = 0, famIndex = 0;
             family < families_in_layer.length; family++)
        {
            var fam = families_in_layer[family];
            var maxLayer = 0;
            var maxIndex = 0;
            var maxFamily = 0;
            fam.visible = false;

            for (var person = 0; person < 2; person++) {
                var p = this.personToLayer[fam[person]];
                if (p) {
                    //  Family will be displayed if at least one of the parents
                    //  wasn't filtered out.
                    fam.visible = true;

                    if (p.rightMostMarriageLayer > layer) {
                        p.rightMostMarriageLayer = layer;
                        p.rightMostMarriageIndex = famIndex;
                    }

                    if (p.layer > maxLayer) {
                        maxLayer = p.layer;
                        maxIndex = p.index;
                        maxFamily = famIndex;
                    } else if (p.layer == maxLayer) {
                        maxIndex = Math.max(maxIndex, p.index);
                    }
                }
            }

            for (var person = 2; person < fam.length; person++) {
                var child = this.personToLayer[fam[person]];
                if (child) {
                    child.leftMostParentLayer = Math.max(
                        child.leftMostParentLayer, maxLayer);
                    child.leftMostParentIndex = Math.max(
                        child.leftMostParentIndex, maxIndex);
                    child.leftMostParentFamily = Math.max(
                        child.leftMostParentFamily, maxFamily);
                }
            }

            if (fam.visible) {
                famIndex++;
            }
        }
        families_in_layer.maxIndex = famIndex;
    }

    // Compute the size and position of each layers. These do not change when
    // the canvas is scrolled or zoomed, so they can be precomputed (especially
    // because computing the size of text is relatively expensive). This also
    // allows us to only draw the visible layers later on.

    var ctx = this.ctx;

    this.lefts = [];          // left corner for each layer
    this.rights = [];         // right corner for each layer
    this.tops = [];           // top corner for each layer
    this.heights = [];        // heights of each layer

    var layerX = 10;         // top-left corner of current layer
    var layerY = 10;         // top-left corner of current layer
    var prevLayer;           // index of previous non-empty layer

    this.forEachNonEmptyLayer_(function(layer) {
        var y = layerY + LINE_SPACING;
        var maxWidth = 0;

        this.forEachVisiblePerson_(layer, function(info, index) {
            var name = info.name;
            maxWidth = Math.max(maxWidth, ctx.measureText(name).width);
            y += LINE_SPACING;
        });

        var width = maxWidth + 2 * MARGIN;
        var height = y - layerY - LINE_SPACING;

        this.tops[layer] = layerY;
        this.lefts[layer] = layerX;
        this.rights[layer] = layerX + width;
        this.heights[layer] = height;

        layerX = this.rights[layer] +
            this.families[layer].maxIndex * LINE_SPACING;

        if (this.families[layer].maxIndex) {
            layerY += height + F_HEIGHT;
        } else {
            layerY += height;
        }
    }
};

/**
 * Calls callback(layer) for each non empty layer, from left-most to
 * right-most.
 * @private
 */

QuiltsCanvas.prototype.forEachNonEmptyLayer_ = function(callback) {
    for (var layer = this.layers.length - 1; layer >= 0; layer--) {
        if (this.layers[layer].length) {
            callback(layer);
        }
    }
};

/**
 * Calls callback(info, index) for each visible person in the layer.
 * @return {number} index of last visible person.
 * @private
 */

QuiltsCanvas.prototype.forEachVisiblePerson_ = function(layer, callback) {
    var la = this.layers[layer];
    for (var p = 0, pindex = 0; p < la.length; p++) {
        var id = la[p][0];
        var info = this.personToLayer[id];
        if (info) {
            callback.call(this, info, pindex);
            pindex ++;
        }
    }
    return pindex - 1;
};

/**
 * Calls callback(family, index) for each visible family in the layer.
 * @return {number} index of last visible family.
 * @private
 */

QuiltsCanvas.prototype.forEachVisibleFamily_ = function(layer, callback) {
    var fa = this.families[layer];
    for (var m = 0, famIndex = 0; m < fa.length; m++) {
        if (fa[m].visible) {
            callback.call(this, fa[m], famIndex);
            famIndex ++;
        }
    }
    return famIndex - 1;
};

/** @overrides */

QuiltsCanvas.prototype.onClick = function(e) {
    var canvas = this;
    var off = this.canvas.offset();
    var id = this.rtree_.find(
        this.toAbsX(e.pageX - off.left),
        this.toAbsY(e.pageY - off.top),
        1, 1);

    if (id.length) {
        id = id[0];

        function addToSelection(id, index) {
            if (canvas.selected_[id]) {
                for (var s = 0; s < canvas.selected_[id].length; s++) {
                    if (canvas.selected_[id][s] == index) {
                        return;
                    }
                }
                canvas.selected_[id].push(index);
            } else {
                canvas.selected_[id]= [index];
            }
        }

        // Find all related persons

        function select_self_and_children(id, index) {
            var info = canvas.personToLayer[id];
            var families = canvas.families[info.layer];

            addToSelection(id, index);

            if (!families) {
                return;
            }

            for (var fam = 0; fam < families.length; fam++) {
                for (var p = 0; p < 2; p++) {
                    var parent = families[fam][p];
                    if (parent == id) {
                        for (var c = 2; c < families[fam].length; c++) {
                            select_self_and_children(
                                families[fam][c], index);
                        }
                        break;  //  no need to look for other parent
                    }
                }
            }
        }

        function select_parents(id, index) {
            var info = canvas.personToLayer[id];
            var families = canvas.families[info.layer + 1];

            addToSelection(id, index);

            if (!families) {
                return;
            }

            for (var fam = 0; fam < families.length; fam++) {
                for (var p = 2; p < families[fam].length; p++) {
                    var child = families[fam][p];
                    if (child == id) {
                        for (var c = 0; c < 2; c++) {
                            if (families[fam][c] && families[fam][c] != -1) {
                                select_parents(families[fam][c], index);
                            }
                        }
                        break;  //  No need to look at other children
                    }
                }
            }
        }

        if (e.shiftKey) {
            this.selectIndex ++;
        } else {
            this.selected_ = {};
            this.selectIndex  = 0;
        }

        select_parents(id, this.selectIndex);
        select_self_and_children(id, this.selectIndex);
        this.refresh();
    }
};

/**
 * Compute the color to use for the text when displaying a person
 */

QuiltsCanvas.prototype.setTextStyle_ = function(person) {
    var s = this.selected_[person];
    this.ctx.fillStyle = (
        s === undefined ?
            "black" :
            this.selectColors[s[0] % this.selectColors.length]);
};

/**
 * Draw either a square or circle in a matrix, depending on the sex of the
 * person.
 */

QuiltsCanvas.prototype.drawPersonSymbol_ = function(
    sex, left, top, person)
{
    this.ctx.beginPath();

    this.setTextStyle_(person);
    if (sex == "F") {
        this.ctx.arc(left + LINE_SPACING / 2,
                top + LINE_SPACING / 2,
                LINE_SPACING / 2, 0, 2 * Math.PI);
    } else if (sex == "M") {
        this.ctx.fillRect(left, top, LINE_SPACING, LINE_SPACING);
    } else {
        this.ctx.fillRect(
            left + 4, top + 4, LINE_SPACING - 8, LINE_SPACING - 8);
    }
    this.ctx.fill();
};

/**
 * Display the box for a single layer
 */

QuiltsCanvas.prototype.displayLayer_ = function(layer) {
    var ctx = this.ctx;
    var y = this.tops[layer] + LINE_SPACING - MARGIN;
    var w = this.rights[layer] - this.lefts[layer];
    var hasPeople = false;

    ctx.fillStyle = "black";
    ctx.beginPath();

    this.forEachVisiblePerson_(layer, function(info, index) {
        hasPeople = true;

        if (this.changeSelectedTextColor) {
            this.setTextStyle_(info.id);
        }
        ctx.fillText(info.name, this.lefts[layer] + MARGIN, y);
        this.rtree_.insert(
            this.lefts[layer],
            y - LINE_SPACING + MARGIN,
            w, LINE_SPACING, info.id);
        y += LINE_SPACING;
    });

    if (hasPeople) {
        ctx.rect(this.lefts[layer], this.tops[layer], w,
                 this.heights[layer]);
    }
    ctx.stroke();
};

/**
 * Display the marriages matrix.
 *
 * The horizontal line should extend in the current matrix at least to the
 * right-most vertical line that has at least this height. This will
 * display a diagonal matrix when possible.
 */

QuiltsCanvas.prototype.displayMarriages_ = function(layer) {
    var ctx = this.ctx;
    var right = this.rights[layer + 1];
    var top = this.tops[layer + 1];

    ctx.save();
    ctx.translate(right, 0);

    var mins = [];   // for each vertical line, its minY
    var prevMinY = this.tops[layer];

    ctx.strokeStyle = "gray";
    ctx.fillStyle = "black";

    var famIndex = this.forEachVisibleFamily_(
        layer + 1,
        function(family, index) {
            var minY = this.tops[layer];
            for (var p = 0; p < 2; p++) {
                var person = family[p];
                var info = this.personToLayer[person];
                if (info) {
                    var y = this.tops[info.layer] + info.index * LINE_SPACING;
                    minY = Math.min(minY, y);
                    this.drawPersonSymbol_(
                        info.sex, index * LINE_SPACING, y, person);
                }
            }

            mins[index] = Math.min(prevMinY, minY);
            prevMinY = minY;

            ctx.beginPath();
            var x = index * LINE_SPACING;
            ctx.moveTo(x, mins[index]);
            ctx.lineTo(x, this.tops[layer]);
            ctx.stroke();
        });

    if (famIndex > 0) {
        ctx.beginPath();
        var x = famIndex * LINE_SPACING;
        mins[famIndex] = prevMinY;
        ctx.moveTo(x, prevMinY);
        ctx.lineTo(x, this.tops[layer]);
        ctx.stroke();
    }

    var prevMaxX = right;

    ctx.beginPath();

    var lastIndex = this.forEachVisiblePerson_(
        layer + 1,
        function(info, index) {
            var y = index * LINE_SPACING + top;
            var maxX = right;

            for (var m = mins.length - 1; m > 0; m--) {
                if (mins[m] <= y) {
                    maxX = right + m * LINE_SPACING;
                    break;
                }
            }

            if (info.rightMostMarriageLayer < this.layers.length) {
                maxX = Math.max(
                    maxX,
                    info.rightMostMarriageIndex * LINE_SPACING
                        + this.rights[info.rightMostMarriageLayer]);
            }

            if (maxX != right) {
                ctx.moveTo(0, y);
                ctx.lineTo(Math.max(maxX, prevMaxX) - right, y);
            }

            prevMaxX = maxX;
        });

    if (lastIndex > 0) {
        var y = lastIndex * LINE_SPACING + top;
        ctx.moveTo(0, y);
        ctx.lineTo(prevMaxX - right, y);
    }

    ctx.stroke();
    ctx.restore();
};

/**
 * Display the children matrix
 */

QuiltsCanvas.prototype.displayChildren_ = function(ctx, layer) {
    var right = this.rights[layer + 1];

    ctx.save();
    ctx.translate(right, this.tops[layer]);
    ctx.fillStyle = "black";
    ctx.strokeStyle = "gray";

    var maxs = [];  //  for each vertical line, its maximum Y
    var maxYsoFar = 0;

    this.forEachVisibleFamily_(
        layer + 1,
        function(fam, famIndex) {
            var maxY = 0;
            for (var c = 2; c < fam.length; c++) {
                var child = fam[c];
                var info = this.personToLayer[child];
                if (info) {
                    var y = info.index * LINE_SPACING;
                    maxY = Math.max(maxY, y);
                    this.drawPersonSymbol_(
                        info.sex, famIndex * LINE_SPACING, y, child);
                }
            }
            maxYsoFar = maxs[famIndex] = Math.max(maxYsoFar, maxY);

            ctx.beginPath();
            var x = famIndex * LINE_SPACING;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, maxs[famIndex]);
            ctx.stroke();
        });

    ctx.beginPath();

    this.forEachVisiblePerson_(layer, function(info, index) {
        var y = index * LINE_SPACING;
        var minX = this.lefts[layer] - right;
        for (var m = 0; m < maxs.length; m++) {
            if (maxs[m] >= y - LINE_SPACING) {
                minX = m * LINE_SPACING;
                break;
            }
        }

        ctx.moveTo(minX, y);
        ctx.lineTo(this.lefts[layer] - right, y);
    });

    ctx.stroke();
    ctx.restore();
};

/** @overrides */

QuiltsCanvas.prototype.onDraw = function() {
    var ctx = this.ctx;
    var abs = this.visibleAreaAbs();

    this.rtree_.clear();
    ctx.fillStyle = "black";

    this.forEachNonEmptyLayer_(function(layer) {
        // only display visible layers (also if their parents should be
        // displayed)
        var x = this.rights[layer + 1] || this.lefts[layer];
        r  = new Rect(x,
                      this.tops[layer],
                      this.rights[layer] - x,
                      this.heights[layer]);
        if (r.intersects(abs)) {
            this.displayLayer_(layer);

            if (layer < this.layers.length - 1) {
                this.displayMarriages_(layer);

                // Display the row with "F" to separate couples and children

                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "#AAAAAA";
                ctx.rect(
                    this.rights[layer + 1] - 1, this.tops[layer] - F_HEIGHT,
                    this.lefts[layer] - this.rights[layer + 1], F_HEIGHT);
                ctx.fill();
                ctx.restore();

                this.displayChildren_(ctx, layer);
            }
        }
    });

    // Highight the selection rectangles

    for (var p in this.selected_) {
        var indexes = this.selected_[p];  //  list of selection indexes
        var person = this.personToLayer[p];

        if (person.leftMostParentLayer != 0) {
            var x1 = this.rights[person.leftMostParentLayer] +
                person.leftMostParentFamily * LINE_SPACING;
        } else {
            x1 = this.lefts[person.layer];
        }

        if (person.rightMostMarriageLayer < this.layers.length) {
            var x2 = this.rights[person.rightMostMarriageLayer] +
                (person.rightMostMarriageIndex + 1) * LINE_SPACING;
        } else {
            x2 = this.rights[person.layer];
        }

        var y1 = this.tops[person.layer] + person.index * LINE_SPACING;
        var y2 = this.tops[person.leftMostParentLayer] +
            person.leftMostParentIndex * LINE_SPACING;

        for (var s = 0; s < indexes.length; s++) {
            ctx.fillStyle = this.selectColors[indexes[s]];
            this.setFillTransparent(0.2);
            ctx.fillRect(x1, y1, x2 - x1, LINE_SPACING);

            if (person.leftMostParentLayer != 0) {
                ctx.fillRect(x1, y2, LINE_SPACING, y1 - y2);
            }
        }
    }
};

/**
 * Only show selected people.
 *
 * @param {boolean}  filter
 *    Whether to filter.
 */

QuiltsCanvas.prototype.filterSelected = function(filter) {
    if (filter && !this.selected_) {
        // do nothing if there is no selections
        return;
    }

    this.filtered = filter;
    this.analyzeData_();
    this.refresh();
};

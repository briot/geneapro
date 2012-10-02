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

                    // minChildX, maxChildX: range for horizontal lines
                    // minMarriageX, maxMarriageX: range for horizontal lines
                    // y: y coordinates for the top of this person.

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
    });

    // For each family, compute the y range for the corresponding line.

    this.forEachNonEmptyLayer_(function(layer) {
        var prevMinY = this.tops[layer];
        var maxYsofar = this.tops[layer - 1];

        this.forEachVisibleFamily_(
            layer,
            function(family, index) {
                family.visibleIndex = index;
                family.minY = this.tops[layer - 1];
                family.maxY = maxYsofar;
                family.x = this.rights[layer] + index * LINE_SPACING;

                for (var p = 0; p < family.length; p++) {
                    var person = family[p];
                    var info = this.personToLayer[person];
                    if (info) {
                        var y = this.tops[info.layer] +
                            info.index * LINE_SPACING;
                        family.minY = Math.min(family.minY, y);
                        family.maxY = Math.max(family.maxY, y + LINE_SPACING);
                    }
                }

                var y2 = family.minY;
                family.minY = Math.min(prevMinY, y2);
                prevMinY = y2;
                maxYsofar = family.maxY;
            });

        var fam = this.families[layer];
        fam.lastMinY = prevMinY;

        var prevMaxX = this.rights[layer];

        // Compute the ranges for the horizontal lines in marriages and
        // children.

        this.forEachVisiblePerson_(
            layer,
            function(info, index) {
                info.y = this.tops[info.layer] + info.index * LINE_SPACING;

                //  Range for the marriage horizontal lines
                var minX = this.rights[info.layer];
                var y = info.y;
                if (fam.lastMinY <= y) {
                    var maxX = this.lefts[info.layer - 1];
                } else {
                    var maxX = minX;
                    for (var m = fam.length - 1; m > 0; m--) {
                        if (fam[m].visible && fam[m].minY <= y) {
                            maxX = minX + fam[m].visibleIndex * LINE_SPACING;
                            break;
                        }
                    }
                }

                if (info.rightMostMarriageLayer < this.layers.length) {
                    maxX = Math.max(
                        maxX,
                        this.rights[info.rightMostMarriageLayer] +
                        info.rightMostMarriageIndex * LINE_SPACING);
                }

                info.minMarriageX = minX;
                info.maxMarriageX = Math.max(prevMaxX, maxX);
                prevMaxX = maxX;

                //  Range for the children horizontal lines
                var prevFam = this.families[layer + 1];
                if (prevFam) {
                    maxX = this.lefts[info.layer];
                    minX = maxX;

                    for (var m = 0; m < prevFam.length - 1; m++) {
                        if (prevFam[m].visible && prevFam[m].maxY >= y) {
                            minX = this.rights[info.layer + 1] +
                                prevFam[m].visibleIndex * LINE_SPACING;
                            break;
                        }
                    }

                    info.minChildX = minX;
                    info.maxChildX = maxX;
                }
            });
    });
};

/**
 * Calls callback(layer) for each non empty layer, from left-most to
 * right-most.
 * @private
 */

QuiltsCanvas.prototype.forEachNonEmptyLayer_ = function(callback) {
    for (var layer = this.layers.length - 1; layer >= 0; layer--) {
        if (this.layers[layer].length) {
            callback.call(this, layer);
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
};

/**
 * Return the id of the person at the given absolute coordinates.
 * A Quilts view might contain thousands of people. As a result, using a
 * RTree (or at least our implementation of it) tends to be too slow), and
 * since we are only dealing with square data it is easy to compute which
 * person we have clicked on, if any.
 */

QuiltsCanvas.prototype.personAtCoordinates = function(absX, absY) {
    var selectedLayer;
    var selectedPerson;

    this.forEachNonEmptyLayer_(function(layer) {
        if (this.lefts[layer] <= absX &&
            absX <= this.rights[layer] &&
            this.tops[layer] <= absY &&
            absY <= this.tops[layer] + this.heights[layer])
        {
            selectedLayer = layer;
        }
    });

    if (selectedLayer) {
        this.forEachVisiblePerson_(
            selectedLayer,
            function(info, index) {
                if (info.y <= absY &&
                    absY <= info.y + LINE_SPACING)
                {
                    selectedPerson = info.id;
                }
            });
    }
    return selectedPerson;
};

/** @overrides */

QuiltsCanvas.prototype.onClick = function(e) {
    var canvas = this;
    var off = this.canvas.offset();
    var id = this.personAtCoordinates(
        this.toAbsX(e.pageX - off.left),
        this.toAbsY(e.pageY - off.top));

    if (id) {
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
    ctx.fillStyle = "black";

    // Draw all symbols first

    this.forEachVisibleFamily_(
        layer,
        function(family, index) {
            for (var p = 0; p < family.length; p++) {
                var id = family[p];
                var info = this.personToLayer[id];
                if (info) {
                    this.drawPersonSymbol_(info.sex, family.x, info.y, id);
                }
            }
        });

    // Draw vertical lines

    var lastFam;
    ctx.beginPath();
    ctx.strokeStyle = "gray";
    this.forEachVisibleFamily_(
        layer,
        function(family, index) {
            lastFam = family;
            ctx.moveTo(family.x, family.minY);
            ctx.lineTo(family.x, family.maxY);
        });
    if (lastFam) {
        ctx.moveTo(lastFam.x + LINE_SPACING, this.families[layer].lastMinY);
        ctx.lineTo(lastFam.x + LINE_SPACING, lastFam.maxY);
    }

    // Horizontal lines

    this.forEachVisiblePerson_(
        layer,
        function(info, index) {
            ctx.moveTo(info.minMarriageX, info.y);
            ctx.lineTo(info.maxMarriageX, info.y);

            ctx.moveTo(info.minChildX, info.y);
            ctx.lineTo(info.maxChildX, info.y);
        });
    ctx.stroke();
};

/** @overrides */

QuiltsCanvas.prototype.onDraw = function() {
    var ctx = this.ctx;
    var abs = this.visibleAreaAbs();

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

            // Display the row with "F" to separate couples and children

            ctx.save();
            ctx.beginPath();
            ctx.fillStyle = "gray";
            ctx.rect(
                this.rights[layer + 1] - 1, this.tops[layer] - F_HEIGHT,
                this.lefts[layer] - this.rights[layer + 1], F_HEIGHT);
            ctx.fill();
            ctx.restore();
        }

        // Always display those. This will be clipped by the canvas in any
        // case, and is needed to properly display the lines that span multiple
        // generations.
        this.displayMarriages_(layer);
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

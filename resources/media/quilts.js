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
    this.selected_ = {};
    this.selectIndex = 0;  //  number of current selections
    this.selectColors = ["red", "violet", "green", "blue", "orange"];

    // Preprocess the data to gather information relative to each person in a
    // datastructure easier to manipulate

    this.personToLayer = {};   //  id of person -> [layer, index in layer]
    for (var layer = 0; layer < layers.length; layer++) {
        for (var person = 0; person < layers[layer].length; person++) {
            var p = layers[layer][person];
            var sex = p[2];
            p.name =
                (sex == "F" ? '\u2640' : sex == "M" ? '\u2642' : ' ') + p[1];

            var id = p[0];
            this.personToLayer[id] = {
                layer: layer,
                index: person,  // index in layer
                sex: sex /* sex */,
                rightMostMarriageLayer: layers.length,
                rightMostMarriageIndex: 0};
        }
    }

    // Analyze data from the families, needed for further display.

    for (var layer = 0; layer < families.length; layer++) {
        var families_in_layer = families[layer];
        for (var family = 0; family < families_in_layer.length; family++) {
            var fam = families_in_layer[family];
            for (var person = 0; person < fam.length; person++) {
                var p = fam[person];
                if (p != -1) {
                    p = this.personToLayer[p];
                    if (p.rightMostMarriageLayer > layer) {
                        p.rightMostMarriageLayer = layer;
                        p.rightMostMarriageIndex = family;
                    }
                }
            }
        }
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

    for (var layer = this.layers.length - 1; layer >= 0; layer--) {
        if (this.layers[layer].length) {
            var y = layerY + LINE_SPACING;
            var maxWidth = 0;

            for (var persona = 0; persona < this.layers[layer].length; persona++) {
                var name = this.layers[layer][persona].name;
                maxWidth = Math.max(maxWidth, ctx.measureText(name).width);
                y += LINE_SPACING;
            }

            var width = maxWidth + 2 * MARGIN;
            var height = y - layerY - LINE_SPACING;

            this.tops[layer] = layerY;
            this.lefts[layer] = layerX;
            this.rights[layer] = layerX + width;
            this.heights[layer] = height;

            layerX = this.rights[layer] +
                this.families[layer].length * LINE_SPACING;

            if (this.families[layer].length) {
                layerY += height + F_HEIGHT;
            } else {
                layerY += height;
            }
        }
    }
};
inherits(QuiltsCanvas, Canvas);

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

        // Find all related persons

        function select_self_and_children(id, index) {
            var info = canvas.personToLayer[id];
            var families = canvas.families[info.layer];

            canvas.selected_[id]= index;

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

            canvas.selected_[id]= index;

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

QuiltsCanvas.prototype.setFillStyle_ = function(person) {
    var s = this.selected_[person];
    this.ctx.fillStyle = (
        s === undefined ?
            "black" : this.selectColors[s % this.selectColors.length]);
};

/**
 * Draw either a square or circle in a matrix, depending on the sex of the
 * person.
 */

QuiltsCanvas.prototype.drawPersonSymbol_ = function(
    sex, left, top, person)
{
    this.ctx.beginPath();
    this.setFillStyle_(person);
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
    var la = this.layers[layer];

    ctx.beginPath();
    if (la.length) {
        var y = this.tops[layer] + LINE_SPACING - MARGIN;
        var w = this.rights[layer] - this.lefts[layer];

        for (var p = 0; p < la.length; p++) {
            this.setFillStyle_(la[p][0]);
            ctx.fillText(la[p].name, this.lefts[layer] + MARGIN, y);
            this.rtree_.insert(
                this.lefts[layer],
                y - LINE_SPACING + MARGIN,
                w, LINE_SPACING, la[p][0]);

            y += LINE_SPACING;
        }
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
    var prevFamilies = this.families[layer + 1];
    var prevLayer = this.layers[layer + 1];

    ctx.save();
    ctx.translate(right, 0);

    var mins = [];   // for each vertical line, its minY
    var prevMinY = this.tops[layer];

    ctx.strokeStyle = "gray";
    ctx.fillStyle = "black";
    for (var m = 0; m < prevFamilies.length; m++) {
        var minY = this.tops[layer];

        for (var p = 0; p < 2; p++) {
            var person = prevFamilies[m][p];
            if (person != -1) {
                var info = this.personToLayer[person];
                var y = this.tops[info.layer] + info.index * LINE_SPACING;
                minY = Math.min(minY, y);
                this.drawPersonSymbol_(info.sex, m * LINE_SPACING, y, person);
            }
        }

        mins[m] = Math.min(prevMinY, minY);
        prevMinY = minY;

        ctx.beginPath();
        var x = m * LINE_SPACING;
        ctx.moveTo(x, mins[m]);
        ctx.lineTo(x, this.tops[layer]);
        ctx.stroke();
    }

    ctx.beginPath();
    var x = m * LINE_SPACING;
    mins[m] = minY;
    ctx.moveTo(x, minY);
    ctx.lineTo(x, this.tops[layer]);
    ctx.stroke();

    var prevMaxX = right;

    ctx.beginPath();
    for (var p1 = 0; p1 < prevLayer.length; p1++) {
        var id = prevLayer[p1][0];
        var info = this.personToLayer[id];
        var y = p1 * LINE_SPACING + top;
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
    }

    if (prevMaxX > this.lefts[layer]) {
        var y = p1 * LINE_SPACING + top;
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
    var prevFamilies = this.families[layer + 1];

    ctx.save();
    ctx.translate(right, this.tops[layer]);
    ctx.fillStyle = "black";
    ctx.strokeStyle = "gray";

    var maxs = [];  //  for each vertical line, its maximum Y
    var maxYsoFar = 0;

    for (var m = 0; m < prevFamilies.length; m++) {
        var maxY = 0;
        for (var c = 2; c < prevFamilies[m].length; c++) {
            var child = prevFamilies[m][c];
            var info = this.personToLayer[child];
            var y = info.index * LINE_SPACING;
            maxY = Math.max(maxY, y);
            this.drawPersonSymbol_(info.sex, m * LINE_SPACING, y, child);
        }
        maxYsoFar = maxs[m] = Math.max(maxYsoFar, maxY);

        ctx.beginPath();
        var x = m * LINE_SPACING;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, maxs[m]);
        ctx.stroke();
    }

    ctx.beginPath();
    for (var p1 = 1; p1 <= this.layers[layer].length; p1++) {
        var y = p1 * LINE_SPACING;
        var minX = this.lefts[layer] - right;

        for (var m = 0; m < maxs.length; m++) {
            if (maxs[m] >= y - LINE_SPACING) {
                minX = m * LINE_SPACING;
                break;
            }
        }

        ctx.moveTo(minX, y);
        ctx.lineTo(this.lefts[layer] - right, y);
    }
    ctx.stroke();
    ctx.restore();
};

/** @overrides */

QuiltsCanvas.prototype.onDraw = function() {
    var ctx = this.ctx;
    var abs = this.visibleAreaAbs();

    this.rtree_.clear();
    ctx.fillStyle = "black";

    for (var layer = this.layers.length - 1; layer >= 0; layer--) {
        // only display visible layers
        r  = new Rect(this.lefts[layer],
                      this.tops[layer],
                      this.rights[layer] - this.lefts[layer],
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
    }
};

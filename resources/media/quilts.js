
/**
 * Returns the minimum of its arguments, ignoring undefined values.
 */

function minOrUndef(a, b) {
    if (a === undefined) {
        return b;
    } else if (b === undefined) {
        return a;
    } else {
        return Math.min(a, b);
    }
}

/**
 * Returns the maximum of its arguments, ignoring undefined values.
 */

function maxOrUndef(a, b) {
    if (a === undefined) {
        return b;
    } else if (b === undefined) {
        return a;
    } else {
        return Math.max(a, b);
    }
}

/**
 * Preprocess the families data that comes the server.
 * @param {Array.<*>} layers   The data about layers, from the server.
 * @param {Array.<*>} families
 *    The data from the server. It is a list of tuples, each of width contains
 *    the indices of the father, the mother, and each of the children.
 * @return {Object} A preprocessed list.
 *    It is a list of array. Each index in the list corresponds to the
 *    layer to the right of which the family is displayed (so to the right of
 *    a layer we need n columns for families, where n is the size of the array
 *    at index 'layer' in the returned array).
 *    For instance:
 *        [ // index 1, for the first layer
 *           [ each of the families displayed to the left of the layer ],
 *          // index 2 for the second layer
 *        ]
 */

function preprocess_families(layers, personToLayer, families) {
    var result = [];

    for (var layer = 0; layer < layers.length; layer++) {
        result.push([]);
    }

    for (var fam = 0; fam < families.length; fam++) {
        var maxLayer = undefined;

        for (var person = 0; person < families[fam].length; person++) {
            var p = families[fam][person];
            maxLayer = minOrUndef(maxLayer, personToLayer[p][0]);
        }
        maxLayer ++;

        for (var person = 0; person < 2; person++) {
            var p = families[fam][person];
            if (p) {
                if (personToLayer[p][3] > maxLayer) {
                    personToLayer[p][3] = maxLayer; // rightMostMarriageLayer
                    personToLayer[p][4] = result[maxLayer].length + 1;  // rightMostMarriage index

                }
            }
        }
            

        result[maxLayer].push(families[fam]);
    }

    return result;
}

function compute_personToLayer(layers) {
    var personToLayer = {};   //  id of person -> [layer, index in layer]
    for (var layer = 0; layer < layers.length; layer++) {
        for (var person = 0; person < layers[layer].length; person++) {
            personToLayer[layers[layer][person][0]] = [
                layer /* layer */,
                person /* index */,
                layers[layer][person][2] /* sex */,
                layers.length /* rightMostMarriageLayer */,
                0 /* rightMostMarriage index */];
        }
    }
    return personToLayer;
}

function quilts(canvas, data, families) {

    /**
     * Draw either a square or circle in a matrix, depending on the sex of the
     * person.
     */

    function drawSymbol(sex, left, top) {
        ctx.beginPath();
        if (sex == "F") {
            ctx.arc(left + colSpacing / 2,
                    top + colSpacing / 2,
                    colSpacing / 2, 0, 2 * Math.PI);
        } else if (sex == "M") {
            ctx.fillRect(left, top, colSpacing, lineSpacing);
        } else {
            ctx.fillRect(left + 4, top + 4, colSpacing - 8, lineSpacing - 8);
        }
        ctx.fill();
    }


    var c = canvas[0];
    var ctx = c.getContext("2d");

    var personToLayer = compute_personToLayer(data);
    var fams = preprocess_families(
        data /* layers */,
        personToLayer /* personToLayer */,
        families /* families */);

    ctx.fillStyle = "black";
    
    c.width = canvas.width();
    c.height = canvas.height();

    var layerX = 10;         // top-left corner of current layer
    var layerY = 10;         // top-left corner of current layer
    var lineSpacing = 10;
    var margin = 2;
    var colSpacing = 10;     // width of each cell in the matrix
    var F_height = 10;       // height of the row with "F" (families)

    var lefts = [];          // left corner for each layer
    var rights = [];         // right corner for each layer
    var tops = [];           // top corner for each layer
    var heights = [];        // heights of each layer
    var prevLayer;           // index of previous non-empty layer

    //************************
    // First display each layers. We need to know the position of each
    // rectangle before we can draw the matrices between them.

    for (var layer = data.length - 1; layer > 0; layer--) {
        if (data[layer].length) {
            var y = layerY + lineSpacing;
            var maxWidth = 0;

            ctx.beginPath();
            for (var persona = 0; persona < data[layer].length; persona++) {
                var id = data[layer][persona][0];
                var name = data[layer][persona][1];
                var sex = data[layer][persona][2];

                if (sex == "F") {
                    name = '\u2640' + name;
                } else if (sex == "M") {
                    name = '\u2642' + name;
                } else {
                    name = ' ' + name;
                }
                ctx.fillText(name, layerX + margin, y - margin);
                maxWidth = Math.max(maxWidth, ctx.measureText(name).width);
                y += lineSpacing;
            }

            var width = maxWidth + 2 * margin;
            var height = y - layerY - lineSpacing;
            ctx.rect(layerX, layerY, width, height);
            ctx.stroke();

            tops[layer] = layerY;
            lefts[layer] = layerX;
            rights[layer] = layerX + width;
            heights[layer] = height;
            layerX = rights[layer] + fams[layer].length * colSpacing;

            if (fams[layer].length) {
                layerY += height + F_height;
            } else {
                layerY += height;
            }
        }
    }

    //*************************
    // Now display the matrices for the couples (marriage,...) and children

    for (var layer = data.length - 2; layer > 0; layer--) {
        if (data[layer].length) {

            if (prevLayer !== undefined) {
                //****************
                //  Marriages

                ctx.save();
                ctx.translate(rights[prevLayer], 0);

                var mins = [];   // for each vertical line, its minY
                var prevMinY = tops[layer];

                ctx.strokeStyle = "gray";
                ctx.fillStyle = "black";
                for (var m = 0; m < fams[prevLayer].length; m++) {
                    var minY   = tops[layer];
                    
                    for (var p = 0; p < 2; p++) {
                        var person = fams[prevLayer][m][p];
                        var info = personToLayer[person];
                        var y = tops[info[0]] + info[1] * lineSpacing;
                        minY = Math.min(minY, y);
                        drawSymbol(info[2] /* sex */, m * colSpacing, y);
                    }

                    mins[m] = Math.min(prevMinY, minY);
                    prevMinY = minY;

                    ctx.beginPath();
                    var x = m * colSpacing;
                    ctx.moveTo(x, mins[m]);
                    ctx.lineTo(x, tops[layer]);
                    ctx.stroke();
                }

                ctx.beginPath();
                var x = fams[prevLayer].length * colSpacing;
                mins[m] = minY;
                ctx.moveTo(x, minY);
                ctx.lineTo(x, tops[layer]);
                ctx.stroke();

                var prevMaxX = rights[prevLayer];
                
                ctx.beginPath();
                for (var p1 = 0; p1 < data[prevLayer].length; p1++) {
                    var y = p1 * lineSpacing + tops[prevLayer];
                    var maxX = rights[prevLayer];

                    // The horizontal line should extend in the current matrix
                    // at least to the right-most vertical line that has at
                    // least this height.
                    // This deals with cases like:
                    //
                    //      Name1  |X|
                    //             |------
                    //      Name2  | | |X|
                    //             |------
                    //      Name3  | |X| |
                    //             |------  <<< otherwise would miss one cell

                    for (var m = mins.length - 1; m > 0; m--) {
                        if (mins[m] <= y) {
                            maxX = rights[prevLayer] + m * colSpacing;
                            break;
                        }
                    }

                    // Should we extend the horizontal line to some other layer,
                    // in case the spouse or children are in another layer ?

                    var id = data[prevLayer][p1][0];
                    var rightMostMarriageLayer = personToLayer[id][3];
                    if (rightMostMarriageLayer < data.length) {
                        var rightMostMarriageIndex = personToLayer[id][4];
                        maxX = Math.max(
                            maxX,
                            rightMostMarriageIndex * colSpacing
                                + rights[rightMostMarriageLayer]);
                    }

                    if (maxX != rights[prevLayer]) {
                        ctx.moveTo(0, y);
                        ctx.lineTo(Math.max(maxX, prevMaxX) - rights[prevLayer], y);
                    }

                    prevMaxX = maxX;
                }

                if (prevMaxX > lefts[layer]) {
                    var y = p1 * lineSpacing + tops[prevLayer];
                    ctx.moveTo(0, y);
                    ctx.lineTo(prevMaxX - rights[prevLayer], y);
                }

                ctx.stroke();
                ctx.restore();

                //*********************
                // Display the row with "F" to separate couples and children

                ctx.save();
                ctx.beginPath();
                ctx.fillStyle = "#AAAAAA";
                ctx.rect(
                    rights[prevLayer] - 1, tops[layer] - F_height,
                    lefts[layer] - rights[prevLayer], F_height);
                ctx.fill();
                ctx.restore();

                //*******
                // Children

                ctx.save();
                ctx.translate(rights[prevLayer], tops[layer]);

                ctx.fillStyle = "black";

                for (var m = 0; m < fams[prevLayer].length; m++) {
                    for (var c = 2; c < fams[prevLayer][m].length; c++) {
                        var child = fams[prevLayer][m][c];
                        var info = personToLayer[child];
                        drawSymbol(info[2] /* sex */,
                                   m * colSpacing,
                                   info[1] /* index */ * lineSpacing);
                    }
                }

                ctx.strokeStyle = "gray";
                ctx.beginPath();
                for (var p2 = 0; p2 < fams[prevLayer].length; p2++) {
                    var x = p2 * colSpacing;
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, heights[layer]);
                }               
                for (var p1 = 1; p1 <= data[layer].length; p1++) {
                    var y = p1 * lineSpacing;
                    ctx.moveTo(0, y);
                    ctx.lineTo(lefts[layer] - rights[prevLayer], y);
                }

                ctx.stroke();
                ctx.restore();
            }

            prevLayer = layer;
        }
    }
};

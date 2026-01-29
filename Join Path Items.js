/**
 * @file Join Path Items.js
 *
 * Attempts to join the selected path items together into one.
 *
 * Usage:
 *   1. Select some path items that have overlapping points.
 *   2. Run this script.
 *
 * @author m1b
 * @version 2024-07-25
 */
(function () {

    var doc = app.activeDocument;
    var items = doc.selection;

    var joinedItems = joinPathItems(items, 0.1);

})();

/**
 * Given any PathItems found in `items` will join
 * them together if they are within `tolerance`
 * distance. This is useful for cases where we
 * receive graphics exported from CAD system that
 * breaks up every single path segment.
 * @author m1b
 * @version 2024-07-25
 * @param {Array<PathItem>} items - the path items to join.
 * @param {Number} tolerance - the distance apart, in points, before won't join (default: 0.001).
 * @returns {Array<PathItem>?} - the new path item(s).
 */
function joinPathItems(items, tolerance) {

    if (undefined == tolerance)
        tolerance = 0.001;

    var newItems = [];
    var pathsToDraw = [];
    var itemsToProcess = [];
    var pathsToProcess = [];

    // collect the path items and their paths
    for (var i = 0; i < items.length; i++) {

        if (
            items[i].hasOwnProperty('pathPoints')
            && items[i].pathPoints.length > 0
        ) {
            itemsToProcess.push(items[i]);
            pathsToProcess.push(asArray(items[i].pathPoints));
        }

    }

    if (0 === pathsToProcess.length)
        return newItems;

    while (pathsToProcess.length > 0) {

        var workingPath = pathsToProcess.shift();
        var joined = false;

        for (var i = 0; i < pathsToProcess.length; i++) {

            var pathToCheck = pathsToProcess[i];
            var workingPathStart = workingPath[0].anchor;
            var workingPathEnd = workingPath[workingPath.length - 1].anchor;
            var checkPathStart = pathToCheck[0].anchor;
            var checkPathEnd = pathToCheck[pathToCheck.length - 1].anchor;

            // working end to path start
            if (pointsAreEqual([workingPathEnd, checkPathStart], tolerance)) {

                if (controlsAreExtended(workingPath[workingPath.length - 1]))
                    // add direction point from other point
                    workingPath[workingPath.length - 1].rightDirection = pathToCheck[0].rightDirection;

                workingPath = workingPath.concat(pathToCheck.slice(1));
                pathsToProcess.splice(i, 1);
                joined = true;
                break;

            }

            // working start to path end
            else if (pointsAreEqual([workingPathStart, checkPathEnd], tolerance)) {

                if (controlsAreExtended(workingPath[0]))
                    // add direction point from other point
                    workingPath[0].leftDirection = pathToCheck[pathToCheck.length - 1].leftDirection;

                workingPath = pathToCheck.slice(0, -1).concat(workingPath);
                pathsToProcess.splice(i, 1);
                joined = true;
                break;

            }

            // working end to path end
            else if (pointsAreEqual([workingPathEnd, checkPathEnd], tolerance)) {

                var reversed = [];

                for (var j = pathToCheck.length - 2; j >= 0; j--)
                    reversed.push(flipDirection(pathToCheck[j]));

                if (controlsAreExtended(workingPath[workingPath.length - 1]))
                    // add direction point from other point
                    workingPath[workingPath.length - 1].rightDirection = pathToCheck[pathToCheck.length - 1].leftDirection;

                workingPath = workingPath.concat(reversed);
                pathsToProcess.splice(i, 1);
                joined = true;
                break;

            }

            // working start to path start
            else if (pointsAreEqual([workingPathStart, checkPathStart], tolerance)) {

                var reversed = [];

                for (var j = pathToCheck.length - 1; j >= 1; j--)
                    reversed.push(flipDirection(pathToCheck[j]));

                if (controlsAreExtended(workingPath[0]))
                    // add direction point from other point
                    workingPath[0].leftDirection = pathToCheck[0].rightDirection;

                workingPath = reversed.concat(workingPath);

                pathsToProcess.splice(i, 1);
                joined = true;
                break;

            }

        }

        if (!joined) {
            pathsToDraw.push(workingPath);
        } else {
            // re-evaluate the combined path in the next iteration
            pathsToProcess.unshift(workingPath);
        }

    }

    var selected = items[0].selected;
    var layer = items[0].layer;

    // remove original path items
    for (var i = itemsToProcess.length - 1; i >= 0; i--)
        itemsToProcess[i].remove();

    // draw the new path item(s)
    for (var i = 0; i < pathsToDraw.length; i++)
        newItems.push(newPathItem(layer, pathsToDraw[i], selected, tolerance));

    return newItems;

};


/**
 * Draws a path item.
 * @author m1b
 * @version 2024-07-25
 * @param {Document|Layer|GroupItem|CompoundPathItem} container - the parent to the new path item.
 * @param {Array<PathPoint>} points - the points to draw.
 * @param {Boolean} selected - whether to select the new path item.
 * @param {Number} tolerance - used only to check if the path is closed.
 * @returns {PathItem}
 */
function newPathItem(container, points, selected, tolerance) {

    var closed = pointsAreEqual([points[0].anchor, points[points.length - 1].anchor], tolerance);

    if (closed) {

        if (controlsAreExtended(points[0]))
            // move the control point to the complementary point
            points[0].leftDirection = points[points.length - 1].leftDirection;

        // remove the extra point
        points.pop();
    };

    var newPathItem = container.pathItems.add();

    for (var i = 0; i < points.length; i++)
        newPathItem.pathPoints.add();

    for (var i = 0, p; i < points.length; i++) {
        p = newPathItem.pathPoints[i];
        p.anchor = points[i].anchor;
        p.leftDirection = points[i].leftDirection;
        p.rightDirection = points[i].rightDirection;
        // p.pointType = points[i].pointType;
    };

    if (selected)
        newPathItem.selected = true;

    if (closed)
        newPathItem.closed = true;

    return newPathItem;

};

/**
 * Returns true when points are equal, within `tolerance`.
 * @author m1b
 * @version 2024-07-25
 * @param {Array<point>} points - array of points [x, y].
 * @param {Number} tolerance - the tolerance.
 * @returns {Boolean}
 */
function pointsAreEqual(points, tolerance) {

    var first = points[0];

    // Check each point in the array
    for (var i = 1; i < points.length; i++) {

        if (
            Math.abs(points[i][0] - first[0]) > tolerance
            || Math.abs(points[i][1] - first[1]) > tolerance
        )
            return false;

    }

    return true;

};

/**
 * Returns true if point `p` has any control points extended.
 * @author m1b
 * @version 2024-07-25
 * @param {PathPoint} p - the path point to test.
 * @param {Number} tolerance - the tolerance.
 * @returns {Boolean}
 */
function controlsAreExtended(p, tolerance) {
    return !pointsAreEqual([p.anchor, p.leftDirection, p.rightDirection], tolerance);
};

/**
 * Flip the path points control points left-right.
 * @param {PathPoint} p - the point to flip.
 * @returns {PathPoint}
 */
function flipDirection(p) {
    var rightDirection = p.rightDirection;
    p.rightDirection = p.leftDirection;
    p.leftDirection = rightDirection;
    return p;
};

/**
 * Returns `objs` elements as an Array.
 * @param {*} objs - the object to iterate over.
 * @returns {Array<*>}
 */
function asArray(objs) {

    var arr = [];

    for (var i = 0; i < objs.length; i++)
        arr.push(objs[i]);

    return arr;

};
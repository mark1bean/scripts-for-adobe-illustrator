/**
 * @file Distribute Items.js
 *
 * This script is designed to push selected items
 * apart from each other, using several parameters.
 *
 * Look at the `settings` object below for explanations
 * of the different parameters.
 *
 * @author m1b
 * @discussion https://community.adobe.com/t5/illustrator-discussions/overlapping-objects/m-p/14967266#M426166
 */
(function () {

    var doc = app.activeDocument,
        items = doc.selection;

    if (
        0 === app.documents
        || 0 === app.activeDocument.selection.length
    )
        return alert('Please select some items to distribute.');

    // this isn't necessary, but I wondered if it might help
    // items.sort(sortByLeft);

    var points = getCenters(items);
    var medianDistanceApart = getMedianDistanceBetween(points);
    var medianItemSize = getMedianSize(items);

    // adjust the below object to suit your needs
    var settings = {

        // the items to distribute
        items: items,

        // the spread force (I'm using median distance, in points, as a guess)
        spread: medianDistanceApart / 8,

        // the force is scaled by this at each step
        damping: 0.95,

        // items further apart than this value, in points, will be ignored
        radius: medianItemSize * 1.5,

        // the number of steps applied (higher steps mean a more settled distribution)
        maxSteps: 100,

        // the number of times the distribution algorithm is re-applied to the points
        // (usually 1 is enough, but higher values can be very effective when `keepWithinBounds` is true)
        maxIterations: 1,

        // a scale applied to the entire points distribution
        scaleFactor: 1,

        // this will scale the distributed points to fit in the original points' bounds
        keepWithinBounds: false,

        // turn this to false to apply these settings without showing UI
        showUI: true,

    };

    if (settings.showUI) {

        settings.doNotShowWarning = false;

        // the center position, used when scaling
        settings.center = centerOfBounds(getPointsBounds(points));

        // the distribution function
        settings.doFunction = distributeItems;

        var result = ui(settings);

        if (2 === result)
            // user cancelled
            return;

    }

    else
        // perform with no UI
        distributeItems(settings);

})();

/**
 * Distribute items by simulating a `spread` force between them
 * over `maxStep` iterations, with `damping` at each iteration.
 * @author m1b
 * @version 2024-11-11
 * @param {Object} options
 * @param {Array<PageItem>} options.items - the items to distribute.
 * @param {Number} [options.spread] - the repulsive force between points, controlling the spread between points (default: 0.5).
 * @param {Number} [options.damping] - the damping of the force at each iteration (default: 0.3).
 * @param {Number} [options.radius] - the distance beyond which no distribution is necessary (default: 100).
 * @param {Number} [options.maxSteps] - the number of settling steps; higher number makes a more even, settled distribution (default: 500).
 * @param {Number} [options.scaleFactor] - a scale factor applied to the distrubuted points (default: 1, no scaling).
 * @param {Number} [options.maxIterations] - the number of iterations (default: 1).
 * @param {Boolean} [options.keepWithinBounds] - whether to scale distributed points to keep within the original bounds (default: false).
 */
function distributeItems(options) {

    options = options || {};

    if (!options.items)
        throw new Error('distributeItems: bad `items` supplied.');

    var items = options.items,
        points = options.points = getCenters(items);

    // calculate the distributed points
    var distributedPoints = distributePoints(options);

    // apply the new item positions
    for (var i = 0, item, dx, dy; i < items.length; i++) {

        item = items[i],
            dx = item.left - points[i][0],
            dy = item.top - points[i][1];

        item.position = [
            distributedPoints[i][0] + dx,
            distributedPoints[i][1] + dy,
        ];

    }

};

/**
 * Distribute points by simulating a `spread` force between them.
 * Performs `maxStep` iterations, with `damping` at each iteration.
 * More iterations tend to provide a more even, settled, distribution.
 * @author m1b
 * @version 2024-11-15
 * @param {Object} options
 * @param {Array<PageItem>} options.items - the items to distribute.
 * @param {Number} options.spread - the spreading force; larger number means further apart
 * @param {Array<point>} options.points - array of items' points [x, y] to distribute.
 * @param {Number} [options.spread] - the repulsive force between points, controlling the spread between points (default: 0.5).
 * @param {Number} [options.damping] - the damping of the force at each iteration (default: 0.3).
 * @param {Number} [options.radius] - the distance beyond which no distribution is necessary (default: 100).
 * @param {Number} [options.maxSteps] - the number of iterations; higher number tends to provide a more even, settled, distribution (default: 500).
 * @param {Number} [options.scaleFactor] - a scale factor applied to the distrubuted points (default: 1, no scaling).
 * @param {Number} [options.maxIterations] - the number of iterations (default: 1).
 * @param {Boolean} [options.keepWithinBounds] - whether to scale distributed points to keep within the original bounds (default: false).
 * @returns {Array<point>}
 */
function distributePoints(options) {

    options = options || {};

    var maxIterations = options.maxIterations || 1,
        points = copyPoints(options.points),
        spread = options.spread || 0.5,
        damping = options.damping || 0.3,
        radius = options.radius || 100,
        maxSteps = options.maxSteps || 500,
        scaleFactor = options.scaleFactor || 1,
        bounds = options.keepWithinBounds || 1 != scaleFactor ? getPointsBounds(points) : undefined;

    // progress bar
    var pb = options.pb,
        updateInterval = Math.floor(maxSteps / 10),
        nextUpdate = updateInterval;

    for (var k = 0; k < maxIterations; k++) {

        for (var step = 0, point, otherPoint, forceX, forceY, dx, dy, distance, spread, spreadAmount; step < maxSteps; step++) {

            if (pb && nextUpdate === step) {
                pb.update(step);
                nextUpdate += updateInterval;
            }

            for (var i = 0; i < points.length; i++) {

                point = points[i];
                forceX = 0;
                forceY = 0;

                for (var j = 0; j < points.length; j++) {

                    if (i === j)
                        // don't compare to self
                        continue;

                    otherPoint = points[j];
                    dx = point[0] - otherPoint[0];
                    dy = point[1] - otherPoint[1];
                    distance = Math.sqrt(dx * dx + dy * dy);

                    if (
                        distance > 0
                        && distance < radius
                    ) {
                        // assign a repulsion
                        spreadAmount = spread / distance;
                        forceX += spreadAmount * dx;
                        forceY += spreadAmount * dy;
                    }

                }

                // update point
                point[0] += damping * forceX;
                point[1] += damping * forceY;

            }

        }

        if (options.keepWithinBounds) {
            // scale points to fit within original bounds
            points = scalePointsToBoundingBox(points, bounds)
        }

        else if (1 != scaleFactor) {
            // scale points by scaleFactor
            points = scalePoints(points, scaleFactor, options.center);
        }

    }

    if (pb && nextUpdate === step) {
        pb.update(maxSteps * maxIterations);
        nextUpdate += updateInterval;
    }

    return points;

};

/**
 * Estimates the spread value based on the median distance between `points`.
 * @author m1b
 * @version 2024-11-11
 * @param {Array<point>} points - array of points [x, y].
 * @param {Number} [max] - the number of measurements (default: all).
 * @returns {Number}
 */
function getMedianDistanceBetween(points, max) {

    max = max || 2000;

    var distances = [];

    // calculate the distances
    for (var i = 0, test = 0; i < points.length - 1; i++) {

        if (test > max)
            break;

        for (var j = i + 1, dx, dy; j < points.length; j++, test++) {

            dx = points[i][0] - points[j][0];
            dy = points[i][1] - points[j][1];
            distances.push(Math.sqrt(dx * dx + dy * dy));

        }

    }

    // sort
    distances.sort();

    return getMedianValue(distances);

};

/**
 * Returns array of diagonal `sizes` of `items`.
 * `size` is the diagonal dimension of each item's bounds.
 * @param {Array<PageItem>} items - the items.
 * @returns {Number}
 */
function getMedianSize(items) {

    var sizes = [];

    for (var i = 0, item, size; i < items.length; i++) {

        item = items[i];
        size = Math.sqrt(item.width * item.height);
        sizes.push(size);

    }

    return getMedianValue(sizes);

};

/**
 * Returns median value of an array of numbers.
 * @author m1b
 * @version 2024-11-11
 * @param {Array<Number>} values - array of numbers.
 * @returns {Number}
 */
function getMedianValue(values) {

    values.sort(function (a, b) { return a - b; });

    var median,
        mid = Math.floor(values.length / 2);

    // get middle element, or an average of the two middle elements
    if (values.length % 2 === 0)
        median = (values[mid - 1] + values[mid]) / 2;
    else
        median = values[mid];

    return median;

};

/**
 * Returns array of center points [cx, cy] of items.
 * @author m1b
 * @version 2024-09-14
 * @param {Array<PageItem>} items - the items.
 * @returns {Array<point>}
 */
function getCenters(items) {

    var centers = [];

    for (var i = 0; i < items.length; i++)
        centers[i] = centerOfBounds(getItemBounds(items[i]), false);

    return centers;

};

/**
 * Returns point at center of bounds.
 * Works with Illustrator or Indesign bounds.
 * @author m1b
 * @version 2024-11-14
 * @param {Array<Number>} bounds - a bounds array.
 * @returns {point} - point [x, y].
 */
function centerOfBounds(bounds) {

    if (/indesign/i.test(app.name))

        return [
            (bounds[1] + bounds[3]) / 2,
            (bounds[0] + bounds[2]) / 2
        ];

    else if (/illustrator/i.test(app.name))

        return [
            (bounds[0] + bounds[2]) / 2,
            (bounds[1] + bounds[3]) / 2
        ];

};

/**
 * Returns bounds of item(s).
 * @author m1b
 * @version 2024-03-10
 * Attempts to get correct bounds
 * of clipped groups.
 * @param {PageItem|Array<PageItem>} item - an Illustrator PageItem or array of PageItems.
 * @param {Boolean} [geometric] - if false, returns visible bounds.
 * @param {Array} [bounds] - @private parameter, used when recursing.
 * @returns {Array} - the calculated bounds.
 */
function getItemBounds(item, geometric, bounds) {

    var newBounds = [],
        boundsKey = geometric ? 'geometricBounds' : 'visibleBounds';

    if (undefined == item)
        return;

    if (
        item.typename == 'GroupItem'
        || item.constructor.name == 'Array'
    ) {

        var children = item.typename == 'GroupItem' ? item.pageItems : item,
            contentBounds = [],
            isClippingGroup = (item.hasOwnProperty('clipped') && item.clipped == true),
            clipBounds;

        for (var i = 0, child; i < children.length; i++) {

            child = children[i];

            if (
                child.hasOwnProperty('clipping')
                && true === child.clipping
            )
                // the clipping item
                clipBounds = child.geometricBounds;

            else
                contentBounds.push(getItemBounds(child, geometric, bounds));

        }

        newBounds = combineBounds(contentBounds);

        if (isClippingGroup)
            newBounds = intersectionOfBounds([clipBounds, newBounds]);

    }

    else if (item.typename == 'TextFrame') {

        // get bounds of outlined text
        var dup = item.duplicate().createOutline();
        newBounds = dup[boundsKey];
        dup.remove();

    }

    else if (item.hasOwnProperty(boundsKey)) {

        newBounds = item[boundsKey];

    }

    // `bounds` will exist if this is a recursive execution
    bounds = (undefined == bounds)
        ? bounds = newBounds
        : bounds = combineBounds([newBounds, bounds]);

    return bounds;

};

/**
 * Returns the combined bounds of all bounds supplied.
 * Works with Illustrator or Indesign bounds.
 * @author m1b
 * @version 2024-03-09
 * @param {Array<bounds>} boundsArray - an array of bounds [L, T, R, B] or [T, L , B, R].
 * @returns {bounds} - the combine bounds.
 */
function combineBounds(boundsArray) {

    var combinedBounds = boundsArray[0].slice(),
        comparator;

    if (/indesign/i.test(app.name))
        comparator = [Math.min, Math.min, Math.max, Math.max];
    else if (/illustrator/i.test(app.name))
        comparator = [Math.min, Math.max, Math.max, Math.min];

    // Iterate through the rest of the bounds
    for (var i = 1; i < boundsArray.length; i++) {

        var bounds = boundsArray[i];
        combinedBounds[0] = comparator[0](combinedBounds[0], bounds[0]);
        combinedBounds[1] = comparator[1](combinedBounds[1], bounds[1]);
        combinedBounds[2] = comparator[2](combinedBounds[2], bounds[2]);
        combinedBounds[3] = comparator[3](combinedBounds[3], bounds[3]);

    }

    return combinedBounds;

};

/**
 * Returns the overlapping rectangle
 * of two or more rectangles.
 * NOTE: Returns undefined if ANY
 * rectangles do not intersect.
 * @author m1b
 * @version 2022-07-24
 * @param {Array} arrayOfBounds - an array of bounds arrays [l, t, r, b].
 * @returns {Array} - bounds array [l, t, r, b] of overlap.
 */
function intersectionOfBounds(arrayOfBounds) {

    // sort a copy of array
    var bounds = arrayOfBounds
        .slice(0)
        .sort(function (a, b) { return b[0] - a[0] || a[1] - b[1] });

    // start with first bounds
    var intersection = bounds.shift(),
        b;

    // compare each bounds, getting smaller
    while (b = bounds.shift()) {

        // if doesn't intersect, bail out
        if (!boundsDoIntersect(intersection, b))
            return;

        var l = Math.max(intersection[0], b[0]),
            t = Math.min(intersection[1], b[1]),
            r = Math.min(intersection[2], b[2]),
            b = Math.max(intersection[3], b[3]);

        intersection = [l, t, r, b];

    }

    return intersection;

};

/**
 * Returns true if the two bounds intersect.
 * @author m1b
 * @version 2024-03-10
 * @param {Array} bounds1 - bounds array.
 * @param {Array} bounds2 - bounds array.
 * @param {Boolean} [TLBR] - whether bounds arrays are interpreted as [t, l, b, r] or [l, t, r, b] (default: based on app).
 * @returns {Boolean}
 */
function boundsDoIntersect(bounds1, bounds2, TLBR) {

    if (undefined == TLBR)
        TLBR = (/indesign/i.test(app.name));

    return !(

        TLBR

            // TLBR
            ? (
                bounds2[0] > bounds1[2]
                || bounds2[1] > bounds1[3]
                || bounds2[2] < bounds1[0]
                || bounds2[3] < bounds1[1]
            )

            // LTRB
            : (
                bounds2[0] > bounds1[2]
                || bounds2[1] < bounds1[3]
                || bounds2[2] < bounds1[0]
                || bounds2[3] > bounds1[1]
            )
    );

};

/**
 * Shows UI for Distribute Items.
 * @author m1b
 * @version 2024-11-15
 * @param {Object} settings - the settings to adjust via UI.
 * @returns {1|2} - result code
 */
function ui(settings) {

    var reset = {
        spread: settings.spread,
        damping: settings.damping,
        maxSteps: settings.maxSteps,
        scaleFactor: settings.scaleFactor,
        maxIterations: settings.maxIterations,
        radius: settings.radius,
    };

    // keep track of the number of operations
    var ops = 0;

    // used later to check if items have been moved
    settings.positions = getPositionValues();

    const sliderMaxValue = 100,
        sliderMinValue = 1,
        sliderBounds = [5, 25, 350, 45],

        spreadMinValue = 0.01,
        spreadMaxValue = settings.radius * 2,

        // these constants are used to map a slider value to an exponential range 0..1000
        SLIDER_SCALE_FACTOR = 6.777,
        SLIDER_GROWTH_CONSTANT = 0.05,

        // show a warning when UI is configured for more than this many operations
        OPERATIONS_WARNING_TEXT_THRESHOLD = 50000000,
        OPERATIONS_WARNING_ALERT_THRESHOLD = 500000000,

        DIALOG_WIDTH = 450;

    var w = new Window("dialog", 'Distribute ' + settings.items.length + ' Items', undefined, { closeButton: false }),

        stack = w.add("group {orientation:'stack', alignment:['fill','fill'] }"),
        uiPage = stack.add("group {orientation:'column', alignment:['fill','fill'], visible: true }"),
        helpPage = stack.add("group {orientation:'column', alignment:['fill','fill'], visible: false }"),

        helpContent = helpPage.add("group {orientation:'column', alignment:['fill','fill'],alignChildren:['fill','top'], margins: [10,10,10,10] }"),
        helpButtonGroup = helpPage.add('group {orientation:"row", alignment:["fill","bottom"], alignChildren: ["left","bottom"], margins: [10,10,10,10] }'),
        closeHelpButton = helpButtonGroup.add("Button { text:'OK', margins:[0,0,0,0], size:[60,25] }"),

        spreadGroup = uiPage.add("group {orientation:'column', alignment:['left','top'], alignChildren: ['left','top'], margins:[10,0,10,10], preferredSize: [80,-1] }"),
        spreadLabel = spreadGroup.add('statictext { text: "Spread Amount" }'),
        spreadInputGroup = spreadGroup.add("group {orientation:'row', preferredSize: [300,-1], margins:[2,0,0,0] }"),
        spreadField = spreadInputGroup.add('edittext {text: "", preferredSize: [80,-1] }'),
        spreadSlider = spreadInputGroup.add('slider', sliderBounds, 0, spreadMinValue, spreadMaxValue),

        dampingGroup = uiPage.add("group {orientation:'column', alignment:['left','top'], alignChildren: ['left','top'], margins:[10,0,10,10], preferredSize: [80,-1] }"),
        dampingLabel = dampingGroup.add('statictext { text: "Damping %" }'),
        dampingInputGroup = dampingGroup.add("group {orientation:'row', preferredSize: [300,-1], margins:[2,0,0,0] }"),
        dampingField = dampingInputGroup.add('edittext {text: "", preferredSize: [80,-1] }'),
        dampingSlider = dampingInputGroup.add('slider', sliderBounds, 0, sliderMinValue, sliderMaxValue),

        radiusGroup = uiPage.add("group {orientation:'column', alignment:['left','top'], alignChildren: ['left','top'], margins:[10,0,10,10], preferredSize: [80,-1] }"),
        radiusLabel = radiusGroup.add('statictext { text: "Radius" }'),
        radiusInputGroup = radiusGroup.add("group {orientation:'row', preferredSize: [300,-1], margins:[2,0,0,0] }"),
        radiusField = radiusInputGroup.add('edittext {text: "", preferredSize: [80,-1] }'),
        radiusSlider = radiusInputGroup.add('slider', sliderBounds, 0, sliderMinValue, sliderMaxValue),

        maxStepsGroup = uiPage.add("group {orientation:'column', alignment:['left','top'], alignChildren: ['left','top'], margins:[10,0,10,10], preferredSize: [80,-1] }"),
        maxStepsLabel = maxStepsGroup.add('statictext { text: "Number of steps" }'),
        maxStepsInputGroup = maxStepsGroup.add("group {orientation:'row', preferredSize: [300,-1], margins:[2,0,0,0] }"),
        maxStepsField = maxStepsInputGroup.add('edittext {text: "", preferredSize: [80,-1] }'),
        maxStepsSlider = maxStepsInputGroup.add('slider', sliderBounds, 0, sliderMinValue, sliderMaxValue),

        scaleGroup = uiPage.add("group {orientation:'column', alignment:['left','top'], alignChildren: ['left','top'], margins:[10,0,10,10], preferredSize: [80,-1] }"),
        scaleLabel = scaleGroup.add('statictext { text: "Scale %" }'),
        scaleInputGroup = scaleGroup.add("group {orientation:'row', preferredSize: [300,-1], margins:[2,0,0,0] }"),
        scaleFactorField = scaleInputGroup.add('edittext {text: "", preferredSize: [80,-1] }'),
        scaleFactorSlider = scaleInputGroup.add('slider', sliderBounds, 0, 0, 200),

        maxIterationsGroup = uiPage.add("group {orientation:'column', alignment:['left','top'], alignChildren: ['left','top'], margins:[10,0,10,10], preferredSize: [80,-1] }"),
        maxIterationsLabel = maxIterationsGroup.add('statictext { text: "Number of iterations:" }'),
        maxIterationsInputGroup = maxIterationsGroup.add("group {orientation:'row', preferredSize: [300,-1], margins:[2,0,0,0] }"),
        maxIterationsField = maxIterationsInputGroup.add('edittext {text: "", preferredSize: [80,-1] }'),
        maxIterationsSlider = maxIterationsInputGroup.add('slider', sliderBounds, 1, 1, 100),

        checkboxGroup = uiPage.add('group {orientation:"row", alignment:["left","top"], alignChildren: ["left","top"], margins:[10,10,10,10], preferredSize: [120,-1] }'),
        keepWithinBoundsCheckbox = checkboxGroup.add("Checkbox { alignment:'left', text:'Keep within original bounds', margins:[0,10,0,0], value:false }"),

        infoGroup = uiPage.add('group {orientation:"stack", alignment:["left","top"], alignChildren: ["fill","bottom"], margins:[10,10,10,10], preferredSize: [120,-1] }'),
        warningText = infoGroup.add('statictext { text: "", alignment:["right","top"], preferredSize: [430,-1], justify:"right" }'),
        pb = infoGroup.add('progressbar { bounds: [0, 0, ' + DIALOG_WIDTH + ', 6], value: 0, maxvalue: ' + settings.positions.length + ', visible: false }'),

        buttonGroup = uiPage.add('group {orientation:"row", alignment:["fill","bottom"], alignChildren: ["right","bottom"], margins: [10,10,10,10] }'),
        extraButtons = buttonGroup.add('group {orientation:"row", alignment:["left","bottom"], alignChildren: ["left","bottom"], margins: [0,0,0,0] }'),
        helpButton = extraButtons.add("Button { text:'Help', margins:[0,0,0,0], size:[60,25] }"),
        resetButton = extraButtons.add("Button { text:'Reset', margins:[0,0,0,0], size:[60,25] }"),
        undoButton = extraButtons.add("Button { text:'Undo', margins:[0,0,0,0], size:[60,25] }"),
        cancelButton = buttonGroup.add('button', undefined, 'Cancel', { name: 'cancel' }),
        doButton = buttonGroup.add('button', undefined, 'Distribute', { name: 'ok' });

    w.preferredSize.width = DIALOG_WIDTH;

    // assign listeners to buttons
    undoButton.onClick = undo;
    resetButton.onClick = doReset;
    doButton.onClick = doDistribute;
    helpButton.onClick = toggleHelp;
    closeHelpButton.onClick = toggleHelp;

    // assign listeners to fields so that sliders are updated
    spreadField.onChanging = getFieldOnChangingFunction(undefined, spreadSlider, spreadMinValue, spreadMaxValue);
    dampingField.onChanging = getFieldOnChangingFunction(undefined, dampingSlider, sliderMinValue, sliderMaxValue);
    radiusField.onChanging = getFieldOnChangingFunction(getNumberInSliderUnits, radiusSlider, sliderMinValue, sliderMaxValue);
    maxStepsField.onChanging = getFieldOnChangingFunction(getNumberInSliderUnits, maxStepsSlider, sliderMinValue, sliderMaxValue);
    scaleFactorField.onChanging = getFieldOnChangingFunction(undefined, scaleFactorSlider, 0, 200);
    maxIterationsField.onChanging = getFieldOnChangingFunction(undefined, maxIterationsSlider, sliderMinValue, sliderMaxValue);

    // assign listeners to sliders so that fields are updated
    spreadSlider.onChanging = getSliderOnChangingFunction(spreadField, undefined, 2);
    dampingSlider.onChanging = getSliderOnChangingFunction(dampingField, undefined, 1);
    radiusSlider.onChanging = getSliderOnChangingFunction(radiusField, getFieldNumberFromSliderValue, 0);
    maxStepsSlider.onChanging = getSliderOnChangingFunction(maxStepsField, getFieldNumberFromSliderValue, 0);
    scaleFactorSlider.onChanging = getSliderOnChangingFunction(scaleFactorField, undefined, 0);
    maxIterationsSlider.onChanging = getSliderOnChangingFunction(maxIterationsField, undefined, 0);

    // fill out the help page
    addHelpEntry(helpContent, 'Spread Amount', 'The amount of spreading force applied.');
    addHelpEntry(helpContent, 'Damping %', 'A scaling factor applied to the spread force at each step.');
    addHelpEntry(helpContent, 'Radius', 'Items further apart than this value, in points, will be ignored.');
    addHelpEntry(helpContent, 'Number of Steps', 'More steps give a more even, settled, distribution.');
    addHelpEntry(helpContent, 'Scale %', 'A scaling factor applied to the point distribution. 100% means no extra scaling.');
    addHelpEntry(helpContent, 'Number of Iterations', 'The number of times the distribution algorithm is re-applied to the points. Usually 1 is enough, but higher values can be very effective when `keepWithinBounds` is true.');
    addHelpEntry(helpContent, 'Keep Within Bounds', 'Whether to scale the distributed points to maintain the original points\' bounds.');

    pb.update = function (n) { this.value = n; w.update(); };

    // update the UI
    updateUI();

    // show the dialog
    if (settings.windowLocation)
        w.location = settings.windowLocation;
    else
        w.center();

    return w.show();


    /**
     * Returns a function suitable for listening to the
     * `onChanging` event of an SUI Slider, such that
     * when the slider is changed, `field` is updated.
     * @param {SUI EditText Control} field - the field to set.
     * @param {Function} [valueFunction] - an optional custom function for converting the field text (default: Number).
     * @param {Number} decimalPlaces - the slider max value.
     * @returns {Function}
     */
    function getSliderOnChangingFunction(field, valueFunction, decimalPlaces) {

        return (function (field, decimalPlaces) {

            var fn = valueFunction || function (n) { return n.toFixed(decimalPlaces) };

            return function () {
                field.text = fn(this.value, decimalPlaces);
                updateWarningText();
            };

        })(field, decimalPlaces);

    };

    /**
     * Converts a slider value into a string suitable for a field numeric value.
     * The slider value is mapped from slider's range (0..100)
     * to 1..1000 with exponential scaling such that low slider values
     * can be accessed precisely, while still allowing large values to be
     * chosen (but with less precision).
     * @param {Number} n - the slider value (0..100).
     * @param {Number} [decimalPlaces] - the number of decimal places in the result (default: 0).
     * @returns {String}
     */
    function getFieldNumberFromSliderValue(n, decimalPlaces) {

        var exponenialValue = SLIDER_SCALE_FACTOR * (Math.exp(SLIDER_GROWTH_CONSTANT * n) - 1);
        return (exponenialValue + 1).toFixed(decimalPlaces || 0);

    };

    /**
     * Returns a function suitable for listening to the
     * `onChanging` event of an EditText field, such that
     * when the field is changed, the slider is updated.
     * @param {Function} [valueFunction] - an optional custom function for converting the field text (default: Number).
     * @param {SUI Slider Control} slider - the slider to set.
     * @param {Number} min - the slider min value.
     * @param {Number} max - the slider max value.
     * @returns {Function}
     */
    function getFieldOnChangingFunction(valueFunction, slider, min, max) {

        return (function (fn, slider, min, max) {

            fn = fn || Number;

            return function () {

                var n = fn(this.text);

                if (
                    isNaN(n)
                    || n < min
                    || n > max
                ) {
                    slider.enabled = false;
                }

                else {
                    slider.enabled = true;
                    slider.value = n;
                }

                updateWarningText();

            };

        })(valueFunction, slider, min, max);

    };

    /**
     * Adds a glossary term to the help page.
     * @param {SUI Container} container
     * @param {String} title
     * @param {String} text
     */
    function addHelpEntry(container, title, text) {

        var row = container.add("group {orientation:'row', alignment:['left','top'], alignChildren: ['left','top'], margins:[0,0,0,0] }"),
            text1 = row.add("statictext", undefined, title),
            text2 = row.add("statictext", undefined, text, { multiline: true });

        text1.preferredSize = [150, -1];
        text2.preferredSize = [220, -1];

    };

    /**
     * Returns `n` in slider units.
     * Maps 0..1000 to 1..100 with logarithmic scaling.
     * @param {Number} n - a number in the range 0..1000.
     * @returns {Number}
     */
    function getNumberInSliderUnits(n) {

        return Math.log(Number(n) / SLIDER_SCALE_FACTOR + 1) / SLIDER_GROWTH_CONSTANT;

    };

    /**
     * Shows/hides the help page.
     */
    function toggleHelp() {

        uiPage.visible = !uiPage.visible;
        helpPage.visible = !helpPage.visible;

    };

    /**
     * Performs an Undo.
     */
    function undo() {

        app.undo();
        app.redraw();
        updateUI();

    };

    /**
     * Resets the UI to the original settings object.
     */
    function doReset() {

        settings.spread = reset.spread;
        settings.damping = reset.damping;
        settings.radius = reset.radius;
        settings.maxSteps = reset.maxSteps;
        settings.scaleFactor = reset.scaleFactor;
        settings.maxIterations = reset.maxIterations;
        updateUI();

    };

    /**
     * Performs the distribution.
     */
    function doDistribute() {

        updateSettings();

        if (
            !settings.doNotShowWarning
            && ops > OPERATIONS_WARNING_ALERT_THRESHOLD
        ) {

            if (!confirm('CAUTION:\nYou are about to start a distribution that will involve ' + formatNumber(ops) + ' operations. It will be VERY slow to run, or may even fail. Do you wish to continue?'))
                return;

        }

        warningText.visible = false;
        pb.visible = true;
        settings.pb = pb;
        pb.maxvalue = settings.maxSteps * settings.maxIterations;
        pb.update(1);

        // do the distribution
        settings.doFunction(settings);

        app.redraw();
        updateUI();

        pb.visible = false;
        warningText.visible = true;

    };

    /**
     * Updates the UI.
     */
    function updateUI() {

        // update fields
        spreadField.text = settings.spread.toFixed(1);
        dampingField.text = (settings.damping * 100).toFixed(0);
        radiusField.text = settings.radius.toFixed(1);
        maxStepsField.text = settings.maxSteps.toFixed(0);
        scaleFactorField.text = (settings.scaleFactor * 100).toFixed(0);
        maxIterationsField.text = settings.maxIterations.toFixed(0);

        // update sliders
        spreadSlider.value = settings.spread;
        dampingSlider.value = settings.damping * 100;
        radiusSlider.value = getNumberInSliderUnits(settings.radius);
        maxStepsSlider.value = getNumberInSliderUnits(settings.maxSteps);
        scaleFactorSlider.value = settings.scaleFactor * 100;
        maxIterationsSlider.value = settings.maxIterations;

        // update checkboxes
        keepWithinBoundsCheckbox.value = settings.keepWithinBounds;

        // undo button
        undoButton.enabled = itemsAreDirty();

        updateWarningText();

    };

    /**
     * Sets the warning text according to how many operations are configured.
     */
    function updateWarningText() {

        ops = settings.positions.length * settings.positions.length * Number(maxStepsField.text) * Number(maxIterationsField.text);

        if (ops > OPERATIONS_WARNING_ALERT_THRESHOLD)
            warningText.text = 'WARNING: ' + formatNumber(ops) + ' operations WILL TAKE A LONG TIME!';
        else if (ops > OPERATIONS_WARNING_TEXT_THRESHOLD)
            warningText.text = 'WARNING: ' + formatNumber(ops) + ' operations may take a long time!';
        else
            warningText.text = '';

    };

    /**
     * Updates the settings object from the UI.
     */
    function updateSettings() {

        settings.spread = Number(spreadField.text);
        settings.damping = Number(dampingField.text) / 100;
        settings.radius = Number(radiusField.text);
        settings.maxSteps = Number(maxStepsField.text);
        settings.scaleFactor = Number(scaleFactorField.text) / 100;
        settings.maxIterations = Number(maxIterationsField.text);

        settings.keepWithinBounds = keepWithinBoundsCheckbox.value;

    };

    /**
     * Returns array of items' positions [x , y].
     * @returns {Array<position>}
     */
    function getPositionValues() {

        var positions = [];

        for (var i = 0; i < settings.items.length; i++)
            positions.push(settings.items[i].position);

        return positions;

    };

    /**
     * Returns true when the items have been moved.
     * @returns {Boolean}
     */
    function itemsAreDirty(len) {

        // only really need to check half the items
        len = Math.min(settings.positions.length, len || Math.ceil(settings.positions.length / 2));

        for (var i = 0; i < len; i++) {

            if (
                settings.positions[i][0] !== settings.items[i].position[0]
                || settings.positions[i][1] !== settings.items[i].position[1]
            )
                return true
        }

        return false;

    };

};

/**
 * Scales an array of points around the center of their bounding box.
 * @author m1b
 * @version 2024-11-14
 * @param {Array<point>} points - Array of points, each represented as [x, y].
 * @param {Number} scaleFactor - scaling factor, where 0.5 = scale to 50%, 2.0 = scale to 200%.
 * @param {point} [fulcrum] - a point to perform the scale about (default: center of bounds).
 * @returns {Array<point>}
 */
function scalePoints(points, scaleFactor, fulcrum) {

    if (undefined == fulcrum) {

        // get the bounds of the points
        var bounds = getPointsBounds(points);

        // center of bounds
        fulcrum = [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];

    }

    var scaledPoints = [];

    for (var i = 0; i < points.length; i++) {

        // scale point about fulcrum
        var scaledX = fulcrum[0] + (points[i][0] - fulcrum[0]) * scaleFactor,
            scaledY = fulcrum[1] + (points[i][1] - fulcrum[1]) * scaleFactor;

        scaledPoints.push([scaledX, scaledY]);

    }

    return scaledPoints;

};

/**
 * Returns an array of points by scaling `points` to fit within `bounds`.
 * @author m1b
 * @version 2024-11-13
 * @param {Array<point>} points - the points [x, y] to scale.
 * @param {Array<Number>} bounds - the target bounding box [L, T, R, B].
 * @returns {Array<point>}
 */
function scalePointsToBoundingBox(points, bounds) {

    var left = bounds[0],
        top = bounds[1],
        right = bounds[2],
        bottom = bounds[3];

    // get the bounds of the points
    var pointsBounds = getPointsBounds(points),
        minX = pointsBounds[0],
        minY = pointsBounds[1],
        maxX = pointsBounds[2],
        maxY = pointsBounds[3];

    // calculate scaling
    var scaleX = (right - left) / (maxX - minX);
    var scaleY = (bottom - top) / (maxY - minY);

    // scale and translate each point
    var scaledPoints = [];

    for (var i = 0; i < points.length; i++) {

        scaledPoints.push([
            left + (points[i][0] - minX) * scaleX,
            top + (points[i][1] - minY) * scaleY,
        ]);

    }

    return scaledPoints;

};

/**
 * Returns the bounding box of the `points`.
 * @author m1b
 * @version 2024-11-14
 * @param {Array<point>} points - the points [x, y] to analyze.
 * @returns {Array <Number>} - [L, T, R, B].
 */
function getPointsBounds(points) {

    // get the bounds of the points
    var minX = minY = Infinity,
        maxX = maxY = -Infinity;

    for (var i = 0; i < points.length; i++) {

        var x = points[i][0];
        var y = points[i][1];

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;

    }

    return [minX, minY, maxX, maxY];

};

/**
 * Makes a copy of array of points
 * @param {Array<point>} points - the points to copy.
 * @returns {Array<point>}
 */
function copyPoints(points) {

    var newPoints = [];

    for (var i = 0; i < points.length; i++)
        newPoints[i] = [points[i][0], points[i][1]];

    return newPoints;

};

/**
 * Returns `num` formatted as string, with magnitude suffixes.
 * @param {Number} num
 * @returns {String}
 */
function formatNumber(num) {

    var str = num.toString();

    if (num >= 1000000000)
        // billions
        str = (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    else if (num >= 1000000)
        // millions
        str = (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    else if (num >= 1000)
        // thousands
        str = (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';

    return str;

};

/**
 * Sort by left bounds.
 * @param {PageItem} a - item to sort.
 * @param {PageItem} b - item to sort.
 * @returns {Number} - the sort code.
 */
function sortByLeft(a, b) {

    return (

        // left bounds value rounded to 3 decimal places
        Math.round((b.visibleBounds[0] - a.visibleBounds[0]) * 1000) / 1000

        // same left, so we'll sort by top bounds value
        || a.visibleBounds[1] - b.visibleBounds[1]

    );

};
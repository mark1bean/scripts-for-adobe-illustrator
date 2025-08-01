/**
 * @file Page Switcher.js
 *
 * A simple interface to change the page
 * of a multi-page placed PDF or .ai file.
 *
 * Usage: Select one or more multi-page
 * placed PDFs and run this script.
 *
 * Example use case:
 *   1. I have a large project with many documents.
 *   2. Each document contains technical drawings and
 *      each uses numbering graphics.
 *   3. I need to be able to change the numbering graphics
 *      in one place, so they update everywhere.
 *   4. I save the numbering as a multi-page .ai doc.
 *      and place them in each document.
 *   5. If the numbering changes, eg. adding a number somewhere,
 *      I use this script to change the numbers as needed.
 *
 * Tip: you don't have to target the placed PDFs carefully,
 * you can just select everything in sight and the script
 * will only change the Placed PDFs.
 *
 * Tip: switching pages is often much better than placing the
 * graphic again, because it preserves the scale and position.
 *
 * @author m1b
 * @version 2025-08-01
 */
(function () {

    if (
        0 === app.documents.length
        || 0 === app.activeDocument.selection.length
    )
        return alert('Please select one or more multi-page Placed PDFs and try again.');

    var doc = app.activeDocument,
        items = getItems({ from: doc.selection, filter: getFilterForPDFs() });

    if (0 === items.length)
        return alert('Please select one or more multi-page Placed PDFs and try again.');

    ui(doc, items);

})();

/**
 * Returns a filter function that returns true
 * for PlacedItems with .ai or .pdf file extensions.
 * @returns {Function}
 */
function getFilterForPDFs() {

    var matchExtension = /\.(ai|pdf)$/i;

    return function isPlacedPDF(item) {

        return 'PlacedItem' === item.constructor.name
            && item.hasOwnProperty('file')
            && matchExtension.test(item.file.name);

    };

};

/**
 * Change the page of a placed PDF.
 * Must supply either `delta` for relative
 * change or `pageNumber` for absolute change.
 * @author m1b
 * @version 2025-08-01
 * @param {PDF} placedPDF - a multi-page linked graphic.
 * @param {Number} delta - the new page number offset, eg. -1 means previous page.
 * @param {Number} pageNumber - the absolute new page number offset.
 * @returns {PlacedItem?} - a new reference to the PlacedItem, the old will be invalid.
 */
function switchPageOfPlacedPDF(doc, placedPDF, delta, pageNumber) {

    if ('Array' === placedPDF.constructor.name) {

        var done = [];
        for (var i = placedPDF.length - 1; i >= 0; i--)
            done.push(placedPDF[i] = switchPageOfPlacedPDF(doc, placedPDF[i], delta, pageNumber));

        doc.selection = done;

        return;

    }

    if (
        'PlacedItem' !== placedPDF.constructor.name
        || !placedPDF.hasOwnProperty('file')
        || !/\.(ai|pdf)$/i.test(placedPDF.file.name)
    )
        // not the right kind of file
        return;

    pageNumber = pageNumber || getPlacedPDFPageNumber(placedPDF) + delta;

    app.preferences.setIntegerPreference('plugin/PDFImport/PageNumber', pageNumber);

    var newPlacedPDF = doc.placedItems.add();

    newPlacedPDF.move(placedPDF, ElementPlacement.PLACEBEFORE);
    newPlacedPDF.file = placedPDF.file;
    newPlacedPDF.matrix = placedPDF.matrix;
    newPlacedPDF.selected = true;

    // clean up
    placedPDF.remove();

    // return an item reference
    return newPlacedPDF;

};

/**
 * Returns the page number of `placedImage`.
 * @author CarlosCanto
 * @version 2025-08-01
 * @param {PlacedItem} placedItem
 * @returns {Number}
 */
function getPlacedPDFPageNumber(placedItem) {

    if (
        !placedItem
        || 'function' !== typeof placedItem.relink
    )
        return;

    placedItem.relink(placedItem.file);

    return app.preferences.getIntegerPreference("plugin/PDFImport/PageNumber");

};

/**
 * Provides UI for "Change Placed Page" with
 * "Previous Page" and "Next Page" buttons.
 * @author m1b
 * @version 2025-08-01
 * @returns {-1|1|2} - the result code (-1 means previous, 1 means next, 2 means cancel).
 */
function ui(doc, items) {

    var buttonSize = 45;
    var w = new Window("dialog", 'Change Placed PDF Page', undefined, { closeButton: false }),

        controls = w.add('group {orientation:"row", alignChildren:["center","top"],margins:[20,10,20,10] }'),
        prevButton = new PlainCircleButton(controls, [buttonSize, buttonSize], drawLeftArrow, function () { switchToRelativePage(-1) }),
        numberButton = new PlainCircleButton(controls, [buttonSize, buttonSize], drawPage, switchToAbsolutePage),
        nextButton = new PlainCircleButton(controls, [buttonSize, buttonSize], drawRightArrow, function () { switchToRelativePage(+1) }),

        buttons = w.add('group {orientation:"row", alignment:["fill","bottom"], alignChildren: ["right","bottom"], margins: [10,15,10,10] }'),
        extraButtons = buttons.add('group {orientation:"row", alignment:["left","bottom"], alignChildren: ["left","bottom"] }'),
        hideEdgesButton = new PlainCircleButton(extraButtons, [25, 25], drawEdgesButton, function () { app.executeMenuCommand('edge') }),
        doneButton = buttons.add('button', undefined, 'Done', { name: 'cancel' });

    w.center();

    return w.show();

    /** Switch items to an absolute page.   */
    function switchToAbsolutePage() {

        var pageNumber = prompt('Enter the new page number:', getPlacedPDFPageNumber(items[0]) + 1);

        if (
            !pageNumber
            || isNaN(Number(pageNumber))
        )
            return;

        switchPageOfPlacedPDF(doc, items, null, Number(pageNumber));
        app.redraw();

    };

    /** Switch items to a relative page.   */
    function switchToRelativePage(delta) {
        switchPageOfPlacedPDF(doc, items, delta);
        app.redraw();
    };

};

/** Draws a page icon on the button. */
function drawPage(gfx, width, height, pen, brush) {
    var points = [[26, 11], [26, 30], [8, 30], [8, 4], [19, 4], [26, 11], [19, 11], [19, 4]];
    var len = points.length - 1;
    var o = (width - 34) / 2;
    var s = 1;
    gfx.newPath();
    gfx.moveTo(points[len][0] * s + o, points[len][1] * s + o);
    while (len--)
        gfx.lineTo(points[len][0] * s + o, points[len][1] * s + o);
    gfx.strokePath(pen);
};

/** Draws a leftward arrow symbol on the button. */
function drawLeftArrow(gfx, width, height, pen, brush) {
    var points = [[13, 6], [3, 17], [30, 17], [3, 17], [13, 28]];
    var len = points.length - 1;
    var o = (width - 34) / 2;
    var s = 1;
    gfx.newPath();
    gfx.moveTo(points[len][0] * s + o, points[len][1] * s + o);
    while (len--)
        gfx.lineTo(points[len][0] * s + o, points[len][1] * s + o);
    gfx.strokePath(pen);
};

/** Draws a rightward arrow symbol on the button. */
function drawRightArrow(gfx, width, height, pen, brush) {
    var points = [[21, 6], [31, 17], [4, 17], [31, 17], [21, 28]];
    var len = points.length - 1;
    var o = (width - 34) / 2;
    var s = 1;
    gfx.newPath();
    gfx.moveTo(points[len][0] * s + o, points[len][1] * s + o);
    while (len--)
        gfx.lineTo(points[len][0] * s + o, points[len][1] * s + o);
    gfx.strokePath(pen);
};

/** Draws the "show/hide edges" icon on the button. */
function drawEdgesButton(gfx, width, height, pen, brush) {
    var points = [[4, 17], [13, 17], [13, 13], [21, 13], [21, 17], [30, 17], [21, 17], [21, 21], [13, 21], [13, 17]];
    var len = points.length - 1;
    var o = (width - 34) / 2;
    var s = 1;
    gfx.newPath();
    gfx.moveTo(points[len][0] * s + o, points[len][1] * s + o);
    while (len--)
        gfx.lineTo(points[len][0] * s + o, points[len][1] * s + o);
    gfx.strokePath(pen);
};

/**
 * A bare bones circle ScriptUI Button.
 * @author m1b
 * @version 2025-08-01
 * @constructor
 * @param {SUI container} container - the button's location.
 * @param {Array<Number>} preferredSize - the button's preferredSize
 * @param {Function} drawFunction - a function to draw over the circle background.
 * @param {Function} clickFunction - a function to handle a button click.
 */
function PlainCircleButton(container, preferredSize, drawFunction, clickFunction) {

    this.button = container.add('button {}');
    this.button.preferredSize = preferredSize;

    var gfx = this.button.graphics;
    var inactiveStroke = gfx.newPen(gfx.PenType.SOLID_COLOR, [.9, .9, .9], 2);
    var activeStroke = gfx.newPen(gfx.PenType.SOLID_COLOR, [.33, .33, .33], 2.5);
    var inactiveFill = gfx.newBrush(gfx.BrushType.SOLID_COLOR, [0.33, 0.33, 0.33]);
    var activeFill = gfx.newBrush(gfx.BrushType.SOLID_COLOR, [0.25, 0.8, 0.9]);
    var width = this.button.preferredSize[0];
    var height = this.button.preferredSize[1];

    if (clickFunction)
        this.button.onClick = clickFunction;

    this.button.onDraw = function (ev) {

        var m = ev.mouseOver;

        // circle background
        gfx.newPath();
        gfx.ellipsePath(0, 0, width, height);
        gfx.fillPath(m ? activeFill : inactiveFill);

        if (drawFunction)
            drawFunction(gfx, width, height, m ? activeStroke : inactiveStroke, m ? activeFill : inactiveFill, ev);

    };

};

/** ------------------------------------------------------------------- *
 *  GET ITEMS                                                           *
 * -------------------------------------------------------------------- *
 * @author m1b                                                          *
 * @version 2024-03-01                                                  *
 * -------------------------------------------------------------------- *
 * Collects page items from a `from` source, eg. a Document, Layer,     *
 * GroupItem, or Array. Will look inside group items up to `maxDepth`.  *
 * Search can be filtered using `filter` function. Note that the        *
 * filter function is evaluated last in the filtering process.          *
 * -------------------------------------------------------------------- *
 * Example 1. Get all items in document:                                *
 *                                                                      *
 *    var myItems = getItems({ from: app.activeDocument });             *
 *                                                                      *
 * -------------------------------------------------------------------- *
 * Example 2. Get all selected items except groups:                     *
 *                                                                      *
 *    var myItems = getItems({                                          *
 *      from: app.activeDocument.selection,                             *
 *      getGroupItems: false,                                           *
 *    });                                                               *
 *                                                                      *
 * -------------------------------------------------------------------- *
 * Example 3. Using `filter` function to choose item type:              *
 *                                                                      *
 *    var myItems = getItems({                                          *
 *      from: app.activeDocument,                                       *
 *      filter: function (item) {                                       *
 *        return (                                                      *
 *          'PathItem' === item.typename                                *
 *          || 'CompoundPathItem' === item.typename                     *
 *        );                                                            *
 *      }                                                               *
 *    });                                                               *
 *                                                                      *
 * -------------------------------------------------------------------- *
 * Example 4. Using `filter` function:                                  *
 *                                                                      *
 *    var myItems = getItems({                                          *
 *      from: app.activeDocument,                                       *
 *      filter: onlyPngLinks                                            *
 *    });                                                               *
 *                                                                      *
 *    function onlyPngLinks(item, depth) {                              *
 *       return (                                                       *
 *           'PlacedItem' === item.typename                             *
 *           && '.png' === item.file.name.slice(-4).toLowerCase()       *
 *       );                                                             *
 *    };                                                                *
 *                                                                      *
 * -------------------------------------------------------------------- *
 * Example 4. Using the `filter` function for custom collecting:        *
 *                                                                      *
 * This example bypasses the normal returned array and instead          *
 * captures items in an "external" array `itemsByDepth`.                *
 *                                                                      *
 *    var itemsByDepth = [];                                            *
 *                                                                      *
 *    function getItemsByDepth(item, depth) {                           *
 *      if (undefined == itemsByDepth[depth])                           *
 *        itemsByDepth[depth] = [];                                     *
 *      itemsByDepth[depth].push(item);                                 *
 *    };                                                                *
 *                                                                      *
 *    getItems({                                                        *
 *      from: app.activeDocument,                                       *
 *      filter: getItemsByDepth                                         *
 *    });                                                               *
 *                                                                      *
 * -------------------------------------------------------------------- *
 * @param {Object} options - parameters
 * @param {PageItem|Array<PageItem>|Document|Layer} options.from - the thing(s) to look in, eg. a selection.
 * @param {Function} [options.filter] - function that, given a found item, must return true (default: no filtering).
 * @param {Boolean} [options.getPageItems] - whether to include page items in returned items (default: true).
 * @param {Boolean} [options.getGroupItems] - whether to include GroupItems in returned items (default: true).
 * @param {Boolean} [options.getLayers] - whether to include Layers in returned items (default: false).
 * @param {Boolean} [options.getHiddenItems] - whether to include hidden items in returned items (default: true).
 * @param {Boolean} [options.getLockedItems] - whether to include locked items in returned items (default: true).
 * @param {Boolean} [options.getGuideItems] - whether to include guide items in returned items (default: false).
 * @param {Number} [options.maxDepth] - deepest folder level (recursion depth limit) (default: 99).
 * @param {Boolean} [options.returnFirstMatch] - whether to return only the first found item (default: false).
 * @param {Number} [depth] - the current depth (private).
 * @returns {Array|PageItem} - all the found items in a flat array, or the first found item if `returnFirstMatch`.
 */
function getItems(options, depth) {

    // defaults
    options = options || {};

    var found = [],
        depth = depth || 0,
        items = options.from;

    if (!options.initialized)
        // once-off initialization
        if (!initialize())
            return [];

    itemsLoop:
    for (var i = 0, item, len = items.length; i < len; i++) {

        item = items[i];

        if (
            false === excludeFilter(item)
            && true === includeFilter(item)
        ) {
            // item found!
            found.push(item);

            if (options.returnFirstMatch)
                break itemsLoop;
        }

        if (
            'GroupItem' !== item.constructor.name
            && 'Layer' !== item.typename
        )
            // only items with children from here
            continue itemsLoop;

        if (
            excludeHidden(item)
            || excludeLocked(item)
        )
            // don't look into excluded containers
            continue itemsLoop;

        if (depth >= options.maxDepth)
            // don't go deeper
            continue itemsLoop;

        // set up for the next depth
        options.from = item.pageItems;

        // look inside
        found = found.concat(getItems(options, depth + 1));

    }

    // this level done
    if (true == options.returnFirstMatch)
        return found[0];
    else
        return found;

    /**
     * Returns true when the item should be not be found.
     * @param {PageItem|Layer} item
     * @returns {Boolean}
     */
    function excludeFilter(item) {

        return (

            isAlreadyFound(item)

            // is hidden
            || excludeHidden(item)

            // is locked
            || excludeLocked(item)

            // is guide
            || (
                false === options.getGuideItems
                && true === item.guides
            )

            // is layer
            || (
                false === options.getLayers
                && 'Layer' === item.typename
            )

            // is group item
            || (
                false === options.getGroupItems
                && 'GroupItem' === item.typename
            )

            // is page item
            || (
                false === options.getPageItems
                && 'GroupItem' !== item.typename
                && undefined != item.uuid
            )

        );

    };

    /**
     * Returns true when the item should be included.
     * @param {PageItem|Layer} item
     * @returns {Boolean}
     */
    function includeFilter(item) {

        return (
            undefined == options.filter
            || options.filter(item, depth)
        );

    };

    /**
     * Returns true when the item should
     * be excluded because it is hidden.
     * @param {PageItem|Layer} item
     * @returns {Boolean}
     */
    function excludeHidden(item) {

        return (
            false === options.getHiddenItems
            && (
                true === item.hidden
                || false === item.visible
            )
        );

    };

    /**
     * Returns true when the item should
     * be excluded because it is locked.
     * @param {PageItem|Layer} item
     * @returns {Boolean}
     */
    function excludeLocked(item) {

        return (
            false === options.getLockedItems
            && true === item.locked
        );

    };

    /**
     * Returns true if item was already
     * found, and marks item as found,
     * to avoid finding same item twice.
     * @param {PageItem|Layer} item
     * @returns {Boolean}
     */
    function isAlreadyFound(item) {

        var uuid = item.hasOwnProperty('uuid')
            ? item.uuid
            : item.typename + item.zOrderPosition,

            isFound = !!options.isFound[uuid];

        options.isFound[uuid] = true;

        return isFound;

    }

    /**
     * Returns the initialised `options` object.
     * @returns {Object}
     */
    function initialize() {

        // make a new object, so we don't pollute the original
        options = {
            initialized: true,
            depth: 0,
            isFound: {},
            filter: options.filter,
            getPageItems: false !== options.getPageItems,
            getGroupItems: false !== options.getGroupItems,
            getLayers: true === options.getLayers,
            getHiddenItems: false !== options.getHiddenItems,
            getLockedItems: false !== options.getLockedItems,
            getGuideItems: true === options.getGuideItems,
            maxDepth: options.maxDepth,
            returnFirstMatch: options.returnFirstMatch,
        };

        if (
            undefined == options.maxDepth
            || !options.maxDepth instanceof Number
        )
            options.maxDepth = 99;

        // items is a single layer
        if ('Layer' === items.typename)
            items = [items];

        // items is a document
        else if ('Document' === items.constructor.name) {

            var layers = items.layers;
            items = [];

            for (var i = 0; i < layers.length; i++)
                items.push(layers[i]);

        }

        else if ('Array' !== items.constructor.name)
            items = [items];

        return items.length > 0;

    };

};
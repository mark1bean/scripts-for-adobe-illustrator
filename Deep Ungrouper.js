/**
 * @file Deep Ungrouper.js
 *
 * Allows removal of groups, including clipping groups
 * and masks, at specified depths of nesting.
 *
 * One use case is cleaning up dirty imported content
 * that often has ludicrously redundant masking.
 *
 * @author m1b
 * @version 2025-06-30
 */
(function () {

    /* ---------------- *
     *  User settings   *
     * ---------------- */
    var settings = {
        removeClippingGroups: true,
        removeClippingPaths: true,
        removeGroups: true,
        showUI: true,
    };

    // private settings:
    settings.groupsByDepth = [];
    settings.depths = undefined;

    var doc = app.activeDocument;

    /* ------------------------------------ *
     *  Collect groups from the selection   *
     * ------------------------------------ */
    getItems({
        from: doc.selection,
        getGroupItems: true,
        getPageItems: false,
        filter: getGroupsByDepth,
    });

    if (0 === settings.groupsByDepth.length)
        return alert('Please make a selection and try again.');

    /* ------------- *
     *  Show ui      *
     * ------------- */
    if (settings.showUI) {

        var result = ui(settings);

        if (2 === result)
            // user cancelled
            return;

    }

    // traverse the depths, starting deep
    for (var d = settings.groupsByDepth.length - 1, groups; d >= 0; d--) {

        if (
            settings.depths
            && -1 === indexOfArray(settings.depths, d)
        )
            // nothing to do at this depth
            continue;

        groups = settings.groupsByDepth[d];

        for (var i = groups.length - 1, group, maskID; i >= 0; i--) {

            group = groups[i];
            maskID = undefined;

            /* -------------------- *
             *  Do the ungrouping   *
             * -------------------- */

            if (
                group.clipped
            ) {

                maskID = (group.pageItems[0] || 0).uuid;

                if (settings.removeClippingGroups) {

                    group.clipped = false;

                    if (settings.removeGroups)
                        ungroup(group);

                }

                if (
                    settings.removeClippingPaths
                    && undefined != maskID
                )
                    doc.getPageItemFromUuid(maskID).remove();

            }

            else if (settings.removeGroups)
                ungroup(group);

        }

    }

    /**
     * Helper function: collects items in settings indexed by depth.
     * Intended for use as a getItems `filter` parameter.
     * @param { PageItem } item - an Illustraotr Page Item.
     * @param {Number} depth - the current depth
     */
    function getGroupsByDepth(item, depth) {

        if (undefined == settings.groupsByDepth[depth])
            settings.groupsByDepth[depth] = [];

        settings.groupsByDepth[depth].push(item);

    };

})();

/**
 * UI for Ungrouper.
 * @param {Object} settings - an object accessed by the UI.
 * @returns {1|2} - the result code (1 means go, 2 means cancel).
 */
function ui(settings) {

    // these will be displayed in the listbox
    var groupsDisplay = [];

    for (var d = 0, clippingCount; d < settings.groupsByDepth.length; d++) {

        groupsCount = 0;
        clippingCount = 0;

        for (var c = 0; c < settings.groupsByDepth[d].length; c++) {
            if (settings.groupsByDepth[d][c].clipped)
                clippingCount++;
            else
                groupsCount++;
        }

        groupsDisplay.push([d, groupsCount, clippingCount]);

    }

    var w = new Window("dialog", 'Deep Ungrouper'),
        wrapper = w.add('group {orientation:"column", alignment:["fill","fill"], margins:[10,10,10,10], preferredSize: [120,-1] }'),

        // artboard listbox
        groupsListBox = wrapper.add("ListBox {alignment:'fill', properties:{multiselect:true, showHeaders:true, numberOfColumns:3, columnTitles:['Depth','Groups','Clipping Masks'], preferredSize: [200,-1], columnWidths:[80,80,120]} }"),

        checkboxes = wrapper.add('group {orientation:"column", alignment:["left","top"], alignChildren: ["left","top"], margins:[0,0,0,0], preferredSize: [120,-1] }'),
        removeGroupsCheckbox = checkboxes.add("Checkbox { text:'Remove Groups', alignment:'left', value:true }"),
        removeClippingGroupsCheckbox = checkboxes.add("Checkbox { text:'Remove Clipping Groups', alignment:'left', value:true }"),
        removeClippingPathsCheckbox = checkboxes.add("Checkbox { text:'Remove Clipping Paths', alignment:'left', value:true }"),

        buttons = w.add("Group {orientation:'row', alignment:['right','top'], margins:[10,10,10,10] }"),
        cancelButton = buttons.add('button', undefined, 'Cancel', { name: 'cancel' }),
        removeButton = buttons.add('button', undefined, 'Remove', { name: 'ok' });

    // set the ui values
    removeClippingGroupsCheckbox.value = settings.removeClippingGroups;
    removeClippingPathsCheckbox.value = settings.removeClippingPaths;
    removeGroupsCheckbox.value = settings.removeGroups;

    // populate the groups listbox
    buildListBox(groupsListBox, groupsDisplay);

    // event listeners
    groupsListBox.onChange = update;
    removeGroupsCheckbox.onClick = update;
    removeClippingGroupsCheckbox.onClick = update;
    removeClippingPathsCheckbox.onClick = update;
    removeButton.onClick = apply;

    update();

    w.center();
    return w.show();

    function update() {

        var clippingMaskCount = 0,
            groupsCount = 0;

        for (var i = 0; i < (groupsListBox.selection || []).length; i++) {
            groupsCount += groupsDisplay[groupsListBox.selection[i].index][1];
            clippingMaskCount += groupsDisplay[groupsListBox.selection[i].index][2];
        }

        removeGroupsCheckbox.enabled = groupsCount > 0;
        removeClippingGroupsCheckbox.enabled = clippingMaskCount > 0;
        removeClippingPathsCheckbox.enabled = removeClippingGroupsCheckbox.value && clippingMaskCount > 0;

        if (!removeClippingGroupsCheckbox.value)
            removeClippingPathsCheckbox.value = false;

        removeButton.enabled = (
            (removeGroupsCheckbox.value && groupsCount > 0)
            || (removeClippingGroupsCheckbox.value && clippingMaskCount > 0)
        );

    };

    function apply() {

        // update settings object
        settings.removeClippingGroups = removeClippingGroupsCheckbox.value;
        settings.removeClippingPaths = removeClippingPathsCheckbox.value;
        settings.removeGroups = removeGroupsCheckbox.value;

        settings.depths = [];
        for (var i = 0; i < (groupsListBox.selection || []).length; i++)
            settings.depths.push(groupsListBox.selection[i].index);

        // return approval code
        w.close(1);

    };

    /**
     * Returns a full selection array.
     */
    function selectAllItems(obj) {

        var sel = [];

        for (var i = 0; i < obj.items.length; i++)
            sel[i] = i;

        return sel;

    };

    /**
     * Builds listbox items.
     */
    function buildListBox(listbox, arr, index) {

        for (var i = 0, menuItem; i < arr.length; i++) {
            // depth
            menuItem = listbox.add('item', String(arr[i][0] + 1));
            // groups
            menuItem.subItems[0].text = arr[i][1];
            // groups
            menuItem.subItems[1].text = arr[i][2];
        }

        if (index == undefined)
            listbox.selection = selectAllItems(listbox);
        else
            listbox.selection = index;

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

    };

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

/**
 * Ungroup a group.
 * @author m1b
 * @version 2022-07-24
 * @param {GroupItem} group - an Illustrator GroupItem.
 * @param {Document|Layer|GroupItem} whereToUngroup - the new container for the previously grouped items.
 * @returns {Array<PageItem>} - the ungrouped items.
 */
function ungroup(group, whereToUngroup) {

    if (!group.pageItems)
        return false;

    var placement,
        items = [];

    if (whereToUngroup == undefined) {
        // behave like manual ungroup
        whereToUngroup = group;
        placement = ElementPlacement.PLACEAFTER;
    }

    else {
        // put the ungrouped items "into" the new location
        placement = ElementPlacement.PLACEATBEGINNING;
    }

    for (var i = group.pageItems.length - 1; i >= 0; i--) {
        items.push(group.pageItems[i]);
        group.pageItems[i].move(whereToUngroup, placement);
    }

    return items.reverse();

};

/**
 * Returns index of `obj` within `array`,
 * or undefined if `obj` not found.
 * @param {Array<*>} array - the array to search in.
 * @param {*} obj - the object to look for.
 * @returns {Number?}
 */
function indexOfArray(array, obj) {

    for (var i = 0; i < array.length; i++)
        if (array[i] == obj)
            return i;

    return -1;

};
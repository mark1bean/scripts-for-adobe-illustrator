# Scripts for Adobe Illustrator

Some scripts I've written to do useful things in Adobe Illustrator.

## Contents

1. [Distribute Items](#distribute-items)
1. [Deep Ungrouper](#deep-ungrouper)
1. [Page Switcher](#page-switcher)

---

## Distribute Items

[![Download Copy Things script](https://img.shields.io/badge/Download_Script-*_FREE!_*_-F50?style=flat-square)](https://raw.githubusercontent.com/mark1bean/scripts-for-adobe-illustrator/main/Distribute%20Items.js)   ![Language: ExtendScript](https://img.shields.io/badge/Language-ExtendScript-99B?style=flat-square)   ![Version: 2025-05-12](https://img.shields.io/badge/Version-2025--05--12-5A5?style=flat-square)   [![Donate](https://img.shields.io/badge/Donate-PayPal-blue?style=flat-square)](https://www.paypal.com/donate?hosted_button_id=SBQHVWHSSTA9Q)

Adjusts the spacing between selected page items, using several parameters.

![Demo of Distribute Items script](./docs/distribute-items-1.gif)

1. Adjust parameters:
   - **Spread Amount**: The amount of spreading force applied.
   - **Damping %**: A scaling factor applied to the spread force at each step.
   - **Radius**: Items further apart than this value, in points, will be ignored.
   - **Number of Steps**: More steps give a more even, settled, distribution, but take longer to calculate.
   - **Scale %**: A scaling factor applied to the point distribution. 100% means no extra scaling.
   - **Number of Iterations**: The number of times the distribution algorithm is re-applied to the points. Often 1 is enough, but higher values can be very effective when `keepWithinBounds` is true.
   - **Keep Within Bounds**: Whether to scale the distributed points to maintain the original points\' bounds.

1. Click **Distribute** button to perform the distribution.
   - You can perform multiple distributions, one-after-another, or clicking the **Undo** button to revert.
   - Click **Help** button to see the parameter descriptions.
   - Click **Reset** button to revert parameters to defaults.
   - Caution: some parameters settings, such as a high **number of iterations** will be very slow.

![Demo of Distribute Items script](./docs/distribute-items-2.gif)

---

## Deep Ungrouper

[![Download Copy Things script](https://img.shields.io/badge/Download_Script-*_FREE!_*_-F50?style=flat-square)](https://raw.githubusercontent.com/mark1bean/scripts-for-adobe-illustrator/main/Deep%20Ungrouper.js)   ![Language: ExtendScript](https://img.shields.io/badge/Language-ExtendScript-99B?style=flat-square)   ![Version: 2025-05-12](https://img.shields.io/badge/Version-2025--06--30-5A5?style=flat-square)   [![Donate](https://img.shields.io/badge/Donate-PayPal-blue?style=flat-square)](https://www.paypal.com/donate?hosted_button_id=SBQHVWHSSTA9Q)

Script allows the removal of groups, including clipping groups and masks, at specified depths of nesting.

One use case is cleaning up dirty imported content with ludicrously redundant grouping and clipping.

#### Example 1

Removing all groups and clipping masks at all depths:

![Removing all groups and clipping masks at all depths](./docs/deep-ungrouper-demo-1.png)

#### Example 2

Removing all groups and clipping masks except the top level groups:

![Removing all groups and clipping masks except the top level groups](./docs/deep-ungrouper-demo-2.png)

#### Example 3

Removing *only* groups at all depths:

![Removing only groups at all depths](./docs/deep-ungrouper-demo-3.png)

#### Example 4

Removing groups at depths 3 and 4:

![Removing groups at depths 3 and 4](./docs/deep-ungrouper-demo-4.png)

---

## Page Switcher

[![Download Copy Things script](https://img.shields.io/badge/Download_Script-*_FREE!_*_-F50?style=flat-square)](https://raw.githubusercontent.com/mark1bean/scripts-for-adobe-illustrator/main/Page%20Switcher.js)   ![Language: ExtendScript](https://img.shields.io/badge/Language-ExtendScript-99B?style=flat-square)   ![Version: 2025-08-01](https://img.shields.io/badge/Version-2025--08--01-5A5?style=flat-square)   [![Donate](https://img.shields.io/badge/Donate-PayPal-blue?style=flat-square)](https://www.paypal.com/donate?hosted_button_id=SBQHVWHSSTA9Q)

A simple interface to change the page of a multi-page placed .pdf or .ai file.

Just select the placed graphics, run the script and click forward or backwards to switch pages.

![Demo of Page Switcher script](./docs/page-switcher-1.gif)

---

## Installation

Step 1: Download the individual scripts (see buttons under script names), or
[![Download](https://img.shields.io/badge/Download_all_scripts_(.zip)-*_FREE!_*-F50?style=flat-square)](https://github.com/mark1bean/scripts-for-adobe-indesign/archive/refs/heads/main.zip)

(Note: If the script shows as raw text in the browser, save it to your computer with the extension ".js".)

Step 2: Expand the zipped file and move the downloaded scripts to Illustrator's scripts folder.

See [How To Install Scripts in Adobe Illustrator](https://creativepro.com/how-to-install-scripts-in-adobe-illustrator).

---

## Author

Created by Mark Bean (Adobe Community Expert "[m1b](https://community.adobe.com/t5/user/viewprofilepage/user-id/13791991)").

If any of these scripts will save you time, please consider supporting me!

[![Donate](https://img.shields.io/badge/Donate-PayPal-blue.svg?style=flat-square)](https://www.paypal.com/donate?hosted_button_id=SBQHVWHSSTA9Q)

![Profile picture](https://github.com/mark1bean.png)

---

## License

These scripts are open-source and available under the MIT License. See the [LICENSE](LICENSE) file for details.

/**
 * A simple FireFox add-on, which saves the current tabs title to a text file.
 * The text file is updated when a new page loads, or the title text has changed.
 * When first enabled the location of the text file is copied to the clipboard.
 */

/**
 * FireFox SDK requirements.
 */
const tabs = require("sdk/tabs");
const fileIO = require("sdk/io/file");
const buttons = require('sdk/ui/button/toggle');
const clipboard = require("sdk/clipboard");
const panels = require("sdk/panel");
const self = require("sdk/self");

/**
 * Global variables.
 */
/** The path to the text file which contains the tabs title. */
var profilePath = require('sdk/system').pathFor('ProfD') + "\\savetabtitle.txt";

/** The tab whose title we should save, or undefined when disabled. */
var saveTitleTab = undefined;

/** The last known title which was saved, used to check if the title has changed. */
var lastSaveTitle = undefined;

/** Icons used for the button when the add-on is disabled. */
var iconsDisabled = {
    "16": "./icon-16.png",
    "32": "./icon-32.png",
    "64": "./icon-64.png"
  };

/** Icons used for the button when the add-on is enabled. */
var iconsEnabled = {
    "16": "./icon-e-16.png",
    "32": "./icon-e-32.png",
    "64": "./icon-e-64.png"
  };

/**
 * Event listeners.
 */ 
tabs.on("ready", onTabReady);
tabs.on("close", onTabClosed);

/**
 * Create an action button for the add-on.
 *
 * @property id The ID of the action button.
 * @property label The label of the action button (shown on hover).
 * @property icon The icon-set of the action button.
 * @property onClick The function callback to call when the button is clicked.
 */
var saveTitleButton = buttons.ToggleButton({
  id: "mozilla-link",
  label: "Save Tab Title [Disabled]",
  icon: iconsDisabled,
  onChange: onStartSavingTitle
});

/**
 * Create a panel, which is shown when the add-on button is clicked.
 * The panel contains the path to the text file, and a button to copy the
 * path to the clipboard.
 *
 * @property contentURL The url on the panel.
 * @property width The width of the panel.
 * @property height The height of the panel.
 * @property contentScript A script used to interact with the panel from this add-on.
 */
var saveTitlePanel = panels.Panel({
  contentURL: self.data.url("panel.html"),
  width: 565,
  height: 40,
  contentScript:"  self.port.on('setFilePath', function(filepath) {" +
                "    var editBox = document.getElementById('pathToTitleFile');" + 
                "    editBox.value = filepath;" + 
                "  });" +
                "  window.addEventListener('click', function(event) {" +
                "  var t = event.target;" +
                "  if (t.id == 'copyToClipboard')" +
                "    self.port.emit('click-copyToClipboard');" +
                "}, false);"
});

/**
 * Called when the user clicks the 'cop to clipboard' button on the panel.
 */
saveTitlePanel.port.on("click-copyToClipboard", function() {
  // Copy the path to the clipboard.
  clipboard.set(profilePath);
  
  // Hide the panel.
  saveTitlePanel.hide();
});

/**
 * Called when a tab is ready.
 *
 * @param tab The tab which is ready.
 */
function onTabReady(tab) {
  saveTabTitleToFile(tab);
}

/**
 * Called when a tab is closed.
 *
 * @param tab The tab which has been closed.
 */
function onTabClosed(tab) {
  if (tab === saveTitleTab && saveTitleTab !== undefined) {
    disableTabTitleSaving();
  }
}

/**
 * A timer called every 1000ms, to check if the title of tab has changed.
 */
var { setInterval } = require("sdk/timers");
setInterval(function() {
  // Is the add-on enabled?
  if (saveTitleTab == undefined) {
    return;
  }

  // Has the tabs title changed?
  if (saveTitleTab.title != lastSaveTitle) {
    saveTabTitleToFile(saveTitleTab);
  }
}, 1000)

/**
 * Called when the add-ons action button has been clicked.
 * Used to setup the tab we wish to use and copy the text file location to the clipboard.
 *
 * @param state The button's state. This includes all the button's properties. [@see https://developer.mozilla.org/en-US/Add-ons/SDK/Low-Level_APIs/ui_button_toggle#change]
 */
function onStartSavingTitle(state) {
  // If the active tab is the save tab, disable saving.
  if (saveTitleTab !== undefined && tabs.activeTab == saveTitleTab) {
    disableTabTitleSaving();
    return;
  }

  // Change the action buttons state.
  saveTitleButton.label = "Save Tab Title [Enabled]";
  saveTitleButton.icon = iconsEnabled;

  // Set the tab we wish to save, and call the save method.
  saveTitleTab = tabs.activeTab;
  saveTabTitleToFile(saveTitleTab);
  
  // Show a panel with the path to the file and a button which allows the user to copy the
  // path to the clipboard.
  saveTitlePanel.port.emit("setFilePath", profilePath);
  saveTitlePanel.show({position: saveTitleButton});
}

/**
 * Used to save a given tabs title to file.
 * Handles check to see if the tab is the active tab and if the add-on is enabled.
 *
 * @param tab The tab we want to save.
 */
function saveTabTitleToFile(tab) {
  // Is this the active tab? is the add-on enabled?
  if (tab !== saveTitleTab || tab === undefined) {
    return;
  }

  // Save to the file and set the last known title text variable.
  try {
    var stream = fileIO.open(profilePath, "w");
    if (!stream.closed) {
      stream.write(tab.title);
      stream.close();
      lastSaveTitle = tab.title;
    }
  } catch (ex) {
    console.log(ex);
  }
}

/**
 * Disable the add-on, resetting the button state.
 */
function disableTabTitleSaving() {
  saveTitleTab = undefined;
  saveTitleButton.label = "Save Tab Title [Disabled]";
  saveTitleButton.icon = iconsDisabled;
}

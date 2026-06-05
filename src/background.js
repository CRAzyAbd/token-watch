// background.js — Service worker for Token Watch

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "OPEN_SETTINGS") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("settings/settings.html"),
    });
  }
});

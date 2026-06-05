// popup.js — Token Watch popup logic

document.getElementById("open-settings").addEventListener("click", () => {
  chrome.tabs.create({
    url: chrome.runtime.getURL("settings/settings.html"),
  });
});

document.getElementById("open-claude").addEventListener("click", () => {
  chrome.tabs.create({ url: "https://claude.ai" });
});

// Check if extension is active on a claude.ai tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  const badge = document.getElementById("status-badge");
  if (tab?.url?.includes("claude.ai")) {
    badge.textContent = "Active";
    badge.style.color = "#4caf82";
  } else {
    badge.textContent = "Inactive";
    badge.style.color = "#f0a500";
    badge.style.background = "#3a2e1a";
    badge.style.borderColor = "#5a4a2e";
  }
});

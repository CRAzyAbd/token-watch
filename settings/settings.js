// settings.js — Save and load Token Watch settings

const DEFAULTS = {
  warnThreshold: 70,
  dangerThreshold: 90,
  showCost: true,
  showTimer: true,
  showUsage: true,
};

function loadSettings() {
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    document.getElementById("warn-threshold").value   = settings.warnThreshold;
    document.getElementById("danger-threshold").value = settings.dangerThreshold;
    document.getElementById("show-cost").checked      = settings.showCost;
    document.getElementById("show-timer").checked     = settings.showTimer;
    document.getElementById("show-usage").checked     = settings.showUsage;
  });
}

function saveSettings() {
  const settings = {
    warnThreshold:   parseInt(document.getElementById("warn-threshold").value, 10),
    dangerThreshold: parseInt(document.getElementById("danger-threshold").value, 10),
    showCost:        document.getElementById("show-cost").checked,
    showTimer:       document.getElementById("show-timer").checked,
    showUsage:       document.getElementById("show-usage").checked,
  };

  chrome.storage.sync.set(settings, () => {
    const msg = document.getElementById("saved-msg");
    msg.classList.add("visible");
    setTimeout(() => msg.classList.remove("visible"), 2000);
  });
}

document.getElementById("save-btn").addEventListener("click", saveSettings);

loadSettings();

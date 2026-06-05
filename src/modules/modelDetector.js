// modelDetector.js — Detects the active Claude model from the page

const ModelDetector = (() => {
  const MODEL_DISPLAY_NAMES = {
    "claude-opus-4":     "Claude Opus 4",
    "claude-sonnet-4":   "Claude Sonnet 4",
    "claude-haiku-4":    "Claude Haiku 4",
    "claude-opus-3":     "Claude Opus 3",
    "claude-sonnet-3-7": "Claude Sonnet 3.7",
    "claude-sonnet-3-5": "Claude Sonnet 3.5",
    "claude-haiku-3":    "Claude Haiku 3",
  };

  const MODEL_CONTEXT_LIMITS = {
    "claude-opus-4":     200000,
    "claude-sonnet-4":   200000,
    "claude-haiku-4":    200000,
    "claude-opus-3":     200000,
    "claude-sonnet-3-7": 200000,
    "claude-sonnet-3-5": 200000,
    "claude-haiku-3":    200000,
  };

  let detectedModel = null;
  let listeners = [];

  // Intercept fetch to catch model info from API responses
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url;
      if (url && url.includes("chat_conversations")) {
        const clone = response.clone();
        clone.json().then(data => {
          const model = data?.model ?? data?.settings?.model ?? null;
          if (model && model !== detectedModel) {
            detectedModel = model;
            listeners.forEach(fn => fn(detectedModel));
          }
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  // Also try reading from the DOM as fallback
  function detectFromDOM() {
    const selectors = [
      '[data-testid="model-selector"]',
      '[class*="model-name"]',
      '[class*="ModelSelector"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el?.textContent) {
        const text = el.textContent.trim().toLowerCase();
        for (const key of Object.keys(MODEL_DISPLAY_NAMES)) {
          if (text.includes(key.toLowerCase())) {
            detectedModel = key;
            return key;
          }
        }
      }
    }
    return null;
  }

  function getModel() {
    return detectedModel || detectFromDOM() || "claude-sonnet-4";
  }

  function getDisplayName(modelKey) {
    if (!modelKey) return "Unknown Model";
    const key = Object.keys(MODEL_DISPLAY_NAMES).find(k =>
      modelKey.toLowerCase().includes(k.toLowerCase())
    );
    return key ? MODEL_DISPLAY_NAMES[key] : modelKey;
  }

  function getContextLimit(modelKey) {
    const key = Object.keys(MODEL_CONTEXT_LIMITS).find(k =>
      (modelKey || "").toLowerCase().includes(k.toLowerCase())
    );
    return key ? MODEL_CONTEXT_LIMITS[key] : 200000;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  return { getModel, getDisplayName, getContextLimit, onChange };
})();

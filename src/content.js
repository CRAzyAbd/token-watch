// content.js — Main entry point, injects Token Watch UI into claude.ai

(() => {
  const PANEL_ID = "token-watch-panel";
  const UPDATE_INTERVAL = 5000; // refresh every 5 seconds

  let conversationTokens = 0;
  let updateTimer = null;
  let isCollapsed = false;

  // ─── Intercept XHR/fetch to grab conversation data ───────────────────────

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("chat_conversations") && !url.includes("usage")) {
        const clone = response.clone();
        clone.json().then(data => {
          const messages = data?.chat_messages ?? data?.messages ?? [];
          if (messages.length > 0) {
            conversationTokens = TokenCounter.countConversationTokens(messages);
          }
        }).catch(() => {});
      }
    } catch (_) {}
    return response;
  };

  // ─── Build the widget HTML ────────────────────────────────────────────────

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="tw-header">
        <span class="tw-logo">⟨/⟩ token-watch</span>
        <div class="tw-header-actions">
          <button class="tw-btn-icon" id="tw-settings-btn" title="Settings">⚙</button>
          <button class="tw-btn-icon" id="tw-collapse-btn" title="Collapse">−</button>
        </div>
      </div>
      <div class="tw-body" id="tw-body">

        <div class="tw-section">
          <div class="tw-row">
            <span class="tw-label">Model</span>
            <span class="tw-value" id="tw-model">Detecting...</span>
          </div>
        </div>

        <div class="tw-divider"></div>

        <div class="tw-section">
          <div class="tw-row">
            <span class="tw-label">Tokens</span>
            <span class="tw-value" id="tw-token-count">—</span>
          </div>
          <div class="tw-bar-wrap">
            <div class="tw-bar" id="tw-token-bar"></div>
          </div>
          <div class="tw-row">
            <span class="tw-sublabel" id="tw-token-percent">0% of context used</span>
            <span class="tw-sublabel" id="tw-token-limit">/ 200k</span>
          </div>
        </div>

        <div class="tw-divider"></div>

        <div class="tw-section">
          <div class="tw-row">
            <span class="tw-label">Est. Cost</span>
            <span class="tw-value" id="tw-cost">—</span>
          </div>
          <div class="tw-row">
            <span class="tw-sublabel">Based on current model pricing</span>
          </div>
        </div>

        <div class="tw-divider"></div>

        <div class="tw-section">
          <div class="tw-row">
            <span class="tw-label">Session (5h)</span>
            <span class="tw-value" id="tw-session-val">—</span>
          </div>
          <div class="tw-bar-wrap">
            <div class="tw-bar" id="tw-session-bar"></div>
          </div>
          <div class="tw-row">
            <span class="tw-sublabel" id="tw-session-reset">Resets in —</span>
          </div>
        </div>

        <div class="tw-section">
          <div class="tw-row">
            <span class="tw-label">Weekly (7d)</span>
            <span class="tw-value" id="tw-weekly-val">—</span>
          </div>
          <div class="tw-bar-wrap">
            <div class="tw-bar" id="tw-weekly-bar"></div>
          </div>
          <div class="tw-row">
            <span class="tw-sublabel" id="tw-weekly-reset">Resets in —</span>
          </div>
        </div>

        <div class="tw-divider"></div>

        <div class="tw-section">
          <div class="tw-row">
            <span class="tw-label">Last Response</span>
            <span class="tw-value" id="tw-resp-last">—</span>
          </div>
          <div class="tw-row">
            <span class="tw-label">Avg Response</span>
            <span class="tw-value" id="tw-resp-avg">—</span>
          </div>
        </div>

      </div>
    `;
    return panel;
  }

  // ─── Update bar width and color ───────────────────────────────────────────

  function updateBar(barEl, percent, level) {
    if (!barEl) return;
    barEl.style.width = `${Math.min(percent, 100)}%`;
    barEl.className = "tw-bar";
    if (level === "danger")  barEl.classList.add("tw-bar-danger");
    else if (level === "warning") barEl.classList.add("tw-bar-warning");
  }

  // ─── Main UI refresh ──────────────────────────────────────────────────────

  async function refreshUI() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || isCollapsed) return;

    // Model
    const model = ModelDetector.getModel();
    const modelName = ModelDetector.getDisplayName(model);
    const el = id => panel.querySelector(`#${id}`);
    el("tw-model").textContent = modelName;

    // Tokens
    const contextLimit = ModelDetector.getContextLimit(model);
    const pct = Math.min((conversationTokens / contextLimit) * 100, 100);
    const level = TokenCounter.getWarningLevel(conversationTokens);
    el("tw-token-count").textContent = TokenCounter.formatTokenCount(conversationTokens);
    el("tw-token-percent").textContent = `${pct.toFixed(1)}% of context used`;
    el("tw-token-limit").textContent = `/ ${(contextLimit / 1000).toFixed(0)}k`;
    updateBar(el("tw-token-bar"), pct, level);

    // Alert if near limit
    if (level === "danger" && !panel.dataset.alerted) {
      panel.dataset.alerted = "true";
      panel.classList.add("tw-alert");
    } else if (level !== "danger") {
      panel.dataset.alerted = "";
      panel.classList.remove("tw-alert");
    }

    // Cost
    const cost = CostEstimator.estimate(conversationTokens, model);
    el("tw-cost").textContent = cost.formatted;

    // Usage
    const usage = await UsageTracker.getUsage();
    if (usage) {
      const { session, weekly } = usage;

      const sPct = session.percent != null ? session.percent * 100 : 0;
      el("tw-session-val").textContent = session.limit
        ? `${session.used} / ${session.limit} msgs`
        : `${session.used} msgs`;
      el("tw-session-reset").textContent = `Resets in ${session.timeLeft}`;
      updateBar(el("tw-session-bar"), sPct, sPct >= 90 ? "danger" : sPct >= 70 ? "warning" : "normal");

      const wPct = weekly.percent != null ? weekly.percent * 100 : 0;
      el("tw-weekly-val").textContent = weekly.limit
        ? `${weekly.used} / ${weekly.limit} msgs`
        : `${weekly.used} msgs`;
      el("tw-weekly-reset").textContent = `Resets in ${weekly.timeLeft}`;
      updateBar(el("tw-weekly-bar"), wPct, wPct >= 90 ? "danger" : wPct >= 70 ? "warning" : "normal");
    }

    // Response timer
    const timerStats = ResponseTimer.getStats();
    el("tw-resp-last").textContent = timerStats.lastFormatted;
    el("tw-resp-avg").textContent = timerStats.avgFormatted;
  }

  // ─── Collapse / expand ────────────────────────────────────────────────────

  function toggleCollapse() {
    const body = document.getElementById("tw-body");
    const btn  = document.getElementById("tw-collapse-btn");
    isCollapsed = !isCollapsed;
    if (isCollapsed) {
      body.style.display = "none";
      btn.textContent = "+";
    } else {
      body.style.display = "block";
      btn.textContent = "−";
    }
  }

  // ─── Inject panel into page ───────────────────────────────────────────────

  function inject() {
    if (document.getElementById(PANEL_ID)) return;
    const panel = createPanel();
    document.body.appendChild(panel);

    document.getElementById("tw-collapse-btn")
      .addEventListener("click", toggleCollapse);

    document.getElementById("tw-settings-btn")
      .addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_SETTINGS" });
      });

    ResponseTimer.init();
    refreshUI();
    updateTimer = setInterval(refreshUI, UPDATE_INTERVAL);
  }

  // ─── Watch for page navigation (SPA) ─────────────────────────────────────

  function observeNavigation() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        conversationTokens = 0;
        UsageTracker.invalidateCache();
        setTimeout(inject, 1000);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────

  function init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        inject();
        observeNavigation();
      });
    } else {
      inject();
      observeNavigation();
    }
  }

  init();
})();

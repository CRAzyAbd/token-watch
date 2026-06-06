// content.js — Token Watch main entry, runs in MAIN world at document_start

(() => {
  const WRAPPER_ID = "token-watch-wrapper";
  const PANEL_ID = "token-watch-panel";
  const REFRESH_INTERVAL = 2000;

  let conversationTokens = 0;
  let isCollapsed = false;

  // ─── HOOK FETCH IMMEDIATELY ──────────────────────────────────────────────
  const _fetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _fetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
      if (url.includes("/chat_conversations/") && !url.includes("/usage")) {
        res.clone().json().then(data => processConversationData(data)).catch(() => {});
      }
    } catch (_) {}
    return res;
  };

  function processConversationData(data) {
    if (!data) return;
    const messages = data?.chat_messages ?? data?.messages ?? [];
    if (messages.length > 0) {
      conversationTokens = TokenCounter.countConversationTokens(messages);
      CacheTimer.updateFromMessages(messages);
    }
    refreshUI();
  }

  function getOrgId() {
    const m = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return m ? m[1] : null;
  }

  function getConversationIdFromUrl() {
    const m = location.pathname.match(/\/chat\/([a-f0-9-]+)/i);
    return m ? m[1] : null;
  }

  async function loadCurrentConversation() {
    const orgId = getOrgId();
    const convId = getConversationIdFromUrl();
    if (!orgId || !convId) return;
    try {
      const r = await fetch(
        `https://claude.ai/api/organizations/${orgId}/chat_conversations/${convId}?tree=True&rendering_mode=messages&render_all_tools=true`,
        { credentials: "include" }
      );
      if (r.ok) processConversationData(await r.json());
    } catch (e) {
      console.warn("[token-watch] load conv failed:", e);
    }
  }

  // ─── BUILD WIDGET ────────────────────────────────────────────────────────
  function createWrapper() {
    const wrapper = document.createElement("div");
    wrapper.id = WRAPPER_ID;
    wrapper.innerHTML = `
      <div class="tw-cache-pill" id="tw-cache-pill" title="Conversation cache — replies are cheaper while active">
        <span class="tw-cache-dot"></span>
        <span class="tw-cache-label">Cache</span>
        <span class="tw-cache-text" id="tw-cache-text">—</span>
      </div>

      <div id="${PANEL_ID}">
        <div class="tw-header">
          <span class="tw-logo">⟨/⟩ token-watch</span>
          <button class="tw-btn-icon" id="tw-collapse-btn" title="Collapse">−</button>
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
            <div class="tw-bar-wrap"><div class="tw-bar" id="tw-token-bar"></div></div>
            <div class="tw-row">
              <span class="tw-sublabel" id="tw-token-percent">0% of context used</span>
              <span class="tw-sublabel" id="tw-token-limit">/ 200k</span>
            </div>
          </div>

          <div class="tw-divider"></div>

          <div class="tw-section">
            <div class="tw-row">
              <span class="tw-label">Session (5h)</span>
              <span class="tw-value" id="tw-session-val">—</span>
            </div>
            <div class="tw-bar-wrap"><div class="tw-bar" id="tw-session-bar"></div></div>
            <div class="tw-row">
              <span class="tw-sublabel" id="tw-session-reset">Resets in —</span>
            </div>
          </div>

          <div class="tw-section">
            <div class="tw-row">
              <span class="tw-label">Weekly (7d)</span>
              <span class="tw-value" id="tw-weekly-val">—</span>
            </div>
            <div class="tw-bar-wrap"><div class="tw-bar" id="tw-weekly-bar"></div></div>
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
      </div>
    `;
    return wrapper;
  }

  function updateBar(barEl, percent, level) {
    if (!barEl) return;
    barEl.style.width = `${Math.min(percent, 100)}%`;
    barEl.classList.remove("tw-bar-warning", "tw-bar-danger");
    if (level === "danger")  barEl.classList.add("tw-bar-danger");
    else if (level === "warning") barEl.classList.add("tw-bar-warning");
  }

  async function refreshUI() {
    const wrapper = document.getElementById(WRAPPER_ID);
    if (!wrapper) return;

    const el = id => wrapper.querySelector(`#${id}`);

    // Cache pill (always update, even when collapsed)
    const cache = CacheTimer.getStatus();
    const cachePill = document.getElementById("tw-cache-pill");
    if (cache.state === "active") {
      cachePill.classList.add("tw-cache-visible");
      el("tw-cache-text").textContent = cache.text;
    } else {
      cachePill.classList.remove("tw-cache-visible");
    }

    if (isCollapsed) return;

    const panel = document.getElementById(PANEL_ID);

    // Model
    const model = ModelDetector.getModel();
    el("tw-model").textContent = ModelDetector.getDisplayName(model);

    // Tokens
    const contextLimit = ModelDetector.getContextLimit(model);
    const pct = Math.min((conversationTokens / contextLimit) * 100, 100);
    const isCompacting = conversationTokens > contextLimit;
    const level = isCompacting ? "danger" : TokenCounter.getWarningLevel(conversationTokens);
    el("tw-token-count").textContent = isCompacting
      ? `${TokenCounter.formatTokenCount(conversationTokens)} raw`
      : TokenCounter.formatTokenCount(conversationTokens);
    el("tw-token-percent").textContent = isCompacting
      ? `100% · compacted`
      : `${pct.toFixed(1)}% of context used`;
    el("tw-token-limit").textContent = isCompacting
      ? `active ~${(contextLimit / 1000).toFixed(0)}k`
      : `/ ${(contextLimit / 1000).toFixed(0)}k`;
    updateBar(el("tw-token-bar"), pct, level);

    if (level === "danger") panel.classList.add("tw-alert");
    else panel.classList.remove("tw-alert");

    // Usage
    const usage = await UsageTracker.getUsage();
    if (usage) {
      const { session, weekly } = usage;
      el("tw-session-val").textContent = `${session.percent.toFixed(0)}%`;
      el("tw-session-reset").textContent = `Resets in ${session.timeLeft}`;
      const sLevel = session.percent >= 90 ? "danger" : session.percent >= 70 ? "warning" : "normal";
      updateBar(el("tw-session-bar"), session.percent, sLevel);

      el("tw-weekly-val").textContent = `${weekly.percent.toFixed(0)}%`;
      el("tw-weekly-reset").textContent = `Resets in ${weekly.timeLeft}`;
      const wLevel = weekly.percent >= 90 ? "danger" : weekly.percent >= 70 ? "warning" : "normal";
      updateBar(el("tw-weekly-bar"), weekly.percent, wLevel);
    }

    // Response timer
    const timer = ResponseTimer.getStats();
    el("tw-resp-last").textContent = timer.lastFormatted;
    el("tw-resp-avg").textContent = timer.avgFormatted;
  }

  function toggleCollapse() {
    const body = document.getElementById("tw-body");
    const btn  = document.getElementById("tw-collapse-btn");
    isCollapsed = !isCollapsed;
    if (isCollapsed) { body.style.display = "none"; btn.textContent = "+"; }
    else { body.style.display = "block"; btn.textContent = "−"; refreshUI(); }
  }

  function inject() {
    if (!document.body) return;
    if (document.getElementById(WRAPPER_ID)) return;
    document.body.appendChild(createWrapper());
    document.getElementById("tw-collapse-btn").addEventListener("click", toggleCollapse);
    ResponseTimer.init();
    loadCurrentConversation();
    refreshUI();
    setInterval(refreshUI, REFRESH_INTERVAL);
  }

  function waitForBodyAndInject() {
    if (document.body) { inject(); watchNav(); return; }
    new MutationObserver((mut, obs) => {
      if (document.body) { obs.disconnect(); inject(); watchNav(); }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  function watchNav() {
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        conversationTokens = 0;
        CacheTimer.reset();
        UsageTracker.invalidateCache();
        setTimeout(loadCurrentConversation, 800);
      }
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForBodyAndInject);
  }
  waitForBodyAndInject();
})();

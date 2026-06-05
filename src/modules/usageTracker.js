// usageTracker.js — Fetches session and weekly usage from Claude's native API

const UsageTracker = (() => {
  const USAGE_ENDPOINT = "https://claude.ai/api/usage";
  const SESSION_WINDOW_MS = 5 * 60 * 60 * 1000;   // 5 hours
  const WEEKLY_WINDOW_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days

  let cachedUsage = null;
  let lastFetched = 0;
  const CACHE_TTL = 60 * 1000; // refresh every 60 seconds

  function getOrgId() {
    const match = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return match ? match[1] : null;
  }

  async function fetchUsage() {
    const now = Date.now();
    if (cachedUsage && now - lastFetched < CACHE_TTL) return cachedUsage;

    const orgId = getOrgId();
    if (!orgId) return null;

    try {
      const res = await fetch(`https://claude.ai/api/organizations/${orgId}/usage`, {
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      cachedUsage = data;
      lastFetched = now;
      return data;
    } catch (e) {
      console.warn("[token-watch] Usage fetch failed:", e);
      return null;
    }
  }

  function formatTimeLeft(resetTimestamp) {
    if (!resetTimestamp) return "N/A";
    const diff = new Date(resetTimestamp) - Date.now();
    if (diff <= 0) return "Resetting...";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function parseUsageData(data) {
    if (!data) return null;
    return {
      session: {
        used: data.message_count_session ?? 0,
        limit: data.message_limit_session ?? null,
        percent: data.session_utilization ?? null,
        resetsAt: data.session_reset_at ?? null,
        timeLeft: formatTimeLeft(data.session_reset_at),
      },
      weekly: {
        used: data.message_count_week ?? 0,
        limit: data.message_limit_week ?? null,
        percent: data.week_utilization ?? null,
        resetsAt: data.week_reset_at ?? null,
        timeLeft: formatTimeLeft(data.week_reset_at),
      },
    };
  }

  async function getUsage() {
    const raw = await fetchUsage();
    return parseUsageData(raw);
  }

  function invalidateCache() {
    cachedUsage = null;
    lastFetched = 0;
  }

  return { getUsage, invalidateCache };
})();

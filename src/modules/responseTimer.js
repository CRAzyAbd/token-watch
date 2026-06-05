// responseTimer.js — Tracks Claude's response time per message

const ResponseTimer = (() => {
  let startTime = null;
  let lastResponseTime = null;
  let avgResponseTime = null;
  let responseTimes = [];
  const MAX_SAMPLES = 20;

  // Watch for streaming to start/stop via DOM mutations
  let isStreaming = false;
  let observer = null;

  function start() {
    startTime = Date.now();
    isStreaming = true;
  }

  function stop() {
    if (!startTime) return;
    const elapsed = Date.now() - startTime;
    lastResponseTime = elapsed;
    responseTimes.push(elapsed);
    if (responseTimes.length > MAX_SAMPLES) responseTimes.shift();
    avgResponseTime = Math.round(
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    );
    startTime = null;
    isStreaming = false;
    return elapsed;
  }

  function formatTime(ms) {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function observeStreaming() {
    if (observer) observer.disconnect();
    observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          // Claude starts streaming — detected by streaming indicator
          if (
            node.matches?.('[data-is-streaming="true"]') ||
            node.querySelector?.('[data-is-streaming="true"]')
          ) {
            if (!isStreaming) start();
          }
        }
        // Streaming stopped
        if (isStreaming) {
          const stillStreaming = document.querySelector('[data-is-streaming="true"]');
          if (!stillStreaming) stop();
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function getStats() {
    return {
      last: lastResponseTime,
      avg: avgResponseTime,
      lastFormatted: formatTime(lastResponseTime),
      avgFormatted: formatTime(avgResponseTime),
      isStreaming,
      samples: responseTimes.length,
    };
  }

  function init() {
    observeStreaming();
  }

  return { init, getStats, formatTime };
})();

// tokenCounter.js — Approximate token counting for Claude conversations

const TokenCounter = (() => {
  // Rough approximation: ~4 characters per token (standard heuristic)
  const CHARS_PER_TOKEN = 4;
  const CONTEXT_LIMIT = 200000;
  const WARN_THRESHOLD_1 = 0.7;  // 70% — yellow warning
  const WARN_THRESHOLD_2 = 0.9;  // 90% — red warning

  function countTokens(text) {
    if (!text || typeof text !== "string") return 0;
    return Math.ceil(text.length / CHARS_PER_TOKEN);
  }

  function countConversationTokens(messages) {
    if (!Array.isArray(messages)) return 0;
    return messages.reduce((total, msg) => {
      const content = typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content || "");
      return total + countTokens(content);
    }, 0);
  }

  function getUsagePercent(tokenCount) {
    return Math.min((tokenCount / CONTEXT_LIMIT) * 100, 100);
  }

  function getWarningLevel(tokenCount) {
    const ratio = tokenCount / CONTEXT_LIMIT;
    if (ratio >= WARN_THRESHOLD_2) return "danger";
    if (ratio >= WARN_THRESHOLD_1) return "warning";
    return "normal";
  }

  function formatTokenCount(count) {
    if (count >= 1000) return (count / 1000).toFixed(1) + "k";
    return count.toString();
  }

  return {
    countTokens,
    countConversationTokens,
    getUsagePercent,
    getWarningLevel,
    formatTokenCount,
    CONTEXT_LIMIT,
  };
})();

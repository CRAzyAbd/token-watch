// costEstimator.js — Rough cost estimation based on tokens and model

const CostEstimator = (() => {
  // Pricing per 1M tokens (input/output) in USD — as of mid-2025
  const MODEL_PRICING = {
    "claude-opus-4":     { input: 15.00, output: 75.00 },
    "claude-sonnet-4":   { input: 3.00,  output: 15.00 },
    "claude-haiku-4":    { input: 0.80,  output: 4.00  },
    "claude-opus-3":     { input: 15.00, output: 75.00 },
    "claude-sonnet-3-7": { input: 3.00,  output: 15.00 },
    "claude-sonnet-3-5": { input: 3.00,  output: 15.00 },
    "claude-haiku-3":    { input: 0.80,  output: 4.00  },
    "default":           { input: 3.00,  output: 15.00 },
  };

  // Rough assumption: 70% of tokens are input, 30% are output
  const INPUT_RATIO  = 0.7;
  const OUTPUT_RATIO = 0.3;

  function getPricing(modelKey) {
    if (!modelKey) return MODEL_PRICING["default"];
    const key = Object.keys(MODEL_PRICING).find(k =>
      modelKey.toLowerCase().includes(k.toLowerCase())
    );
    return key ? MODEL_PRICING[key] : MODEL_PRICING["default"];
  }

  function estimate(totalTokens, modelKey) {
    if (!totalTokens || totalTokens <= 0) return { total: 0, formatted: "$0.0000" };

    const pricing = getPricing(modelKey);
    const inputTokens  = totalTokens * INPUT_RATIO;
    const outputTokens = totalTokens * OUTPUT_RATIO;

    const inputCost  = (inputTokens  / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    const total = inputCost + outputCost;

    return {
      total,
      formatted: total < 0.0001 ? "<$0.0001" : `$${total.toFixed(4)}`,
      inputCost,
      outputCost,
      pricing,
    };
  }

  function getModelList() {
    return Object.keys(MODEL_PRICING).filter(k => k !== "default");
  }

  return { estimate, getPricing, getModelList };
})();

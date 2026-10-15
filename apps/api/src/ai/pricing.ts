// List prices in USD per million tokens, used for the cost estimate on the
// admin insights page. Cached input is billed at roughly a tenth of the
// normal input price on both providers.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number, cachedTokens: number) {
  const price = PRICES[model];
  if (!price) return null;
  const input = inputTokens * price.input + cachedTokens * price.input * 0.1;
  const output = outputTokens * price.output;
  return (input + output) / 1_000_000;
}

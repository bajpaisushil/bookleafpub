// List prices in USD per million tokens, used for the cost estimate on the
// admin insights page. `cached` is the share of the input price charged for
// cache reads: about a tenth on Anthropic, half on OpenAI's gpt-4o-mini.
const PRICES: Record<string, { input: number; output: number; cached: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cached: 0.1 },
  "claude-sonnet-5-5": { input: 2, output: 10, cached: 0.1 },
  "claude-opus-5-5": { input: 4, output: 20, cached: 0.05 },
  "gpt-4o-mini": { input: 0.15, output: 0.6, cached: 0.5 },
};

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number, cachedTokens: number) {
  const price = PRICES[model];
  if (!price) return null;
  const input = inputTokens * price.input + cachedTokens * price.input * price.cached;
  const output = outputTokens * price.output;
  return (input + output) / 1_000_000;
}

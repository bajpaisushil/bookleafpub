import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmRequest, LlmResult } from "../llm";

export class AnthropicProvider implements LlmProvider {
  readonly name = "anthropic";
  private client: Anthropic;

  constructor(apiKey: string) {
    // The SDK retries rate limits (429), 5xx and network errors with backoff.
    // A short timeout keeps a slow provider from holding requests open.
    this.client = new Anthropic({ apiKey, timeout: 20_000, maxRetries: 2 });
  }

  async complete(model: string, request: LlmRequest): Promise<LlmResult> {
    const response = await this.client.messages.create({
      model,
      max_tokens: request.maxTokens,
      // Same system prompt for every ticket, so it's marked for prompt caching:
      // repeat calls within a few minutes read it at a fraction of the price.
      system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: request.prompt }],
      output_config: {
        effort: request.effort ?? "low",
        ...(request.jsonSchema && { format: { type: "json_schema", schema: request.jsonSchema } }),
      },
    });

    if (response.stop_reason === "refusal") throw new Error("The model declined to answer.");
    if (response.stop_reason === "max_tokens") throw new Error("The response was cut off.");

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    const usage = response.usage;
    return {
      text,
      inputTokens: usage.input_tokens + (usage.cache_creation_input_tokens ?? 0),
      outputTokens: usage.output_tokens,
      cachedTokens: usage.cache_read_input_tokens ?? 0,
    };
  }
}

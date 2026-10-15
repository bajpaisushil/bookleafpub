import OpenAI from "openai";
import type { LlmProvider, LlmRequest, LlmResult } from "../llm";

export class OpenAIProvider implements LlmProvider {
  readonly name = "openai";
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey, timeout: 20_000, maxRetries: 2 });
  }

  async complete(model: string, request: LlmRequest): Promise<LlmResult> {
    // OpenAI caches long identical prompt prefixes automatically, so keeping
    // the system prompt first and unchanged gives the same saving as Anthropic.
    const response = await this.client.chat.completions.create({
      model,
      max_completion_tokens: request.maxTokens,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.prompt },
      ],
      ...(request.jsonSchema && {
        response_format: {
          type: "json_schema" as const,
          json_schema: { name: "result", schema: request.jsonSchema, strict: true },
        },
      }),
    });

    const choice = response.choices[0];
    if (!choice) throw new Error("The model returned no choices.");
    if (choice.message.refusal) throw new Error("The model declined to answer.");
    if (choice.finish_reason === "length") throw new Error("The response was cut off.");

    const usage = response.usage;
    const cachedTokens = usage?.prompt_tokens_details?.cached_tokens ?? 0;
    return {
      text: (choice.message.content ?? "").trim(),
      inputTokens: (usage?.prompt_tokens ?? 0) - cachedTokens,
      outputTokens: usage?.completion_tokens ?? 0,
      cachedTokens,
    };
  }
}

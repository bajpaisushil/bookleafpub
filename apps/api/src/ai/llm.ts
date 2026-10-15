import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";

export type AiTask = "classify" | "draft";

export interface LlmRequest {
  system: string; // identical across tickets, so providers can cache it
  prompt: string; // the per-ticket part
  maxTokens: number;
  effort?: "low" | "medium";
  jsonSchema?: Record<string, unknown>; // ask for structured JSON output
}

export interface LlmResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  complete(model: string, request: LlmRequest): Promise<LlmResult>;
}

export class AiUnavailableError extends Error {}

// Cheap, fast models by default: classification is a short structured task
// and drafts are always reviewed by a person before they're sent.
const DEFAULT_MODELS: Record<string, Record<AiTask, string>> = {
  anthropic: { classify: "claude-haiku-5-5", draft: "claude-haiku-5-5" },
  openai: { classify: "gpt-4o-mini", draft: "gpt-4o-mini" },
};

function createProvider(): LlmProvider | null {
  if (env.AI_PROVIDER === "anthropic" && env.ANTHROPIC_API_KEY) {
    return new AnthropicProvider(env.ANTHROPIC_API_KEY);
  }
  if (env.AI_PROVIDER === "openai" && env.OPENAI_API_KEY) {
    return new OpenAIProvider(env.OPENAI_API_KEY);
  }
  return null;
}

let provider = createProvider();

// Lets tests swap in a fake provider.
export function setLlmProvider(next: LlmProvider | null) {
  provider = next;
}

export function aiInfo() {
  if (!provider) return { enabled: false as const, provider: null, models: null };
  return {
    enabled: true as const,
    provider: provider.name,
    models: { classify: modelFor("classify"), draft: modelFor("draft") },
  };
}

function modelFor(task: AiTask) {
  const override = task === "classify" ? env.AI_CLASSIFY_MODEL : env.AI_DRAFT_MODEL;
  return override ?? DEFAULT_MODELS[provider?.name ?? "anthropic"]?.[task] ?? "";
}

/**
 * Sends one request to the configured LLM, turns the reply into something
 * usable with `parse`, and records tokens, latency and outcome in the AiCall
 * table. A reply that `parse` rejects (bad JSON, unknown category, empty
 * draft) counts as a failed call, just like a timeout or a 5xx, so the
 * failure rate on the Insights page is honest.
 *
 * Throws AiUnavailableError on any failure so callers can fall back to
 * rules/templates.
 */
export async function runLlm<T>(
  task: AiTask,
  request: LlmRequest,
  parse: (text: string) => T,
  ticketId?: string,
): Promise<T> {
  if (!provider) throw new AiUnavailableError("No AI provider is configured.");

  const model = modelFor(task);
  const startedAt = Date.now();
  let result: LlmResult | undefined;

  try {
    result = await provider.complete(model, request);
    const value = parse(result.text);
    void logCall({ task, model, ticketId, startedAt, result, success: true });
    return value;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`AI ${task} failed for ticket ${ticketId ?? "-"}: ${message}`);
    void logCall({ task, model, ticketId, startedAt, result, success: false, error: message });
    throw new AiUnavailableError(message);
  }
}

// Tokens are recorded even for failed calls when the provider answered,
// because unusable output is still billed.
async function logCall(call: {
  task: AiTask;
  model: string;
  ticketId?: string;
  startedAt: number;
  result?: LlmResult;
  success: boolean;
  error?: string;
}) {
  try {
    await prisma.aiCall.create({
      data: {
        task: call.task,
        model: call.model,
        ticketId: call.ticketId,
        provider: provider?.name ?? "none",
        latencyMs: Date.now() - call.startedAt,
        success: call.success,
        error: call.error?.slice(0, 500),
        inputTokens: call.result?.inputTokens ?? 0,
        outputTokens: call.result?.outputTokens ?? 0,
        cachedTokens: call.result?.cachedTokens ?? 0,
      },
    });
  } catch (error) {
    console.error("Failed to log AI call", error);
  }
}

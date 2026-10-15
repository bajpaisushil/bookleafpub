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
 * Sends one request to the configured LLM and records tokens, latency and
 * failures in the AiCall table. Throws AiUnavailableError on any failure so
 * callers can fall back to rules/templates.
 */
export async function runLlm(task: AiTask, request: LlmRequest, ticketId?: string): Promise<string> {
  if (!provider) throw new AiUnavailableError("No AI provider is configured.");

  const model = modelFor(task);
  const startedAt = Date.now();

  try {
    const result = await provider.complete(model, request);
    void logCall({
      task,
      model,
      ticketId,
      latencyMs: Date.now() - startedAt,
      success: true,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cachedTokens: result.cachedTokens,
    });
    return result.text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void logCall({ task, model, ticketId, latencyMs: Date.now() - startedAt, success: false, error: message });
    throw new AiUnavailableError(message);
  }
}

async function logCall(data: {
  task: AiTask;
  model: string;
  ticketId?: string;
  latencyMs: number;
  success: boolean;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedTokens?: number;
}) {
  try {
    await prisma.aiCall.create({
      data: { ...data, provider: provider?.name ?? "none", error: data.error?.slice(0, 500) },
    });
  } catch (error) {
    console.error("Failed to log AI call", error);
  }
}

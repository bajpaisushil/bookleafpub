"use client";

import { Bot, CircleCheck, Coins, Gauge, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import useSWR from "swr";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { Card, CardHeader, StatTile } from "@/components/ui/card";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { formatNumber } from "@/lib/format";
import { PRIORITIES, STATUSES } from "@/lib/labels";
import type { AdminStats } from "@/lib/types";

const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

function formatUsd(value: number) {
  if (value === 0) return "$0.00";
  return value < 0.01 ? `$${value.toFixed(4)}` : `$${value.toFixed(2)}`;
}

const COST_CONTROLS = [
  "Classification runs once per ticket on a small, fast model with a short structured-JSON output.",
  "Drafts are generated only when an admin opens a ticket that's waiting on us, then cached and reused.",
  "Each draft carries only the policy section and examples for the ticket's category, not the whole knowledge base.",
  "Conversation history is capped to the latest messages and long text is truncated.",
  "System prompts are static, so the provider's prompt caching bills repeated instructions at a fraction of the price.",
  "AI endpoints are rate limited per admin to stop runaway regenerate loops.",
];

export default function InsightsPage() {
  const { data, error, mutate } = useSWR<AdminStats>("/admin/stats");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Insights</h1>
        <p className="mt-1 text-sm text-stone-500">
          Queue health and how the AI assistant is performing over the last 30 days.
        </p>
      </div>

      {error && <ErrorState onRetry={() => mutate()} />}
      {!data && !error && <Skeleton className="h-96" />}

      {data && (
        <>
          <AiStatusBanner ai={data.ai} />

          <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="AI usage">
            <StatTile
              label="AI calls"
              icon={<Bot className="size-4" aria-hidden />}
              value={formatNumber(data.ai.last30Days.calls)}
              detail="Classification + drafts"
            />
            <StatTile
              label="Estimated cost"
              icon={<Coins className="size-4" aria-hidden />}
              value={formatUsd(data.ai.last30Days.estimatedCostUsd)}
              detail="At list prices"
            />
            <StatTile
              label="Failure rate"
              icon={<TriangleAlert className="size-4" aria-hidden />}
              value={percent(data.ai.last30Days.failureRate)}
              detail={`${data.ai.last30Days.failedCalls} failed, all handled by fallbacks`}
              tone={data.ai.last30Days.failureRate > 0.1 ? "attention" : "default"}
            />
            <StatTile
              label="Category kept"
              icon={<CircleCheck className="size-4" aria-hidden />}
              value={percent(data.ai.accuracy.categoryKeptRate)}
              detail={`of ${data.ai.accuracy.classified} AI-classified tickets`}
            />
            <StatTile
              label="Priority kept"
              icon={<Gauge className="size-4" aria-hidden />}
              value={percent(data.ai.accuracy.priorityKeptRate)}
              detail="Not overridden by an admin"
            />
          </section>

          <Card>
            <CardHeader title="Usage by task and model" />
            {data.ai.last30Days.byTaskAndModel.length === 0 ? (
              <p className="p-4 text-sm text-stone-500">No AI calls yet in the last 30 days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-stone-100 text-left text-xs text-stone-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Task</th>
                      <th className="px-4 py-2 font-medium">Model</th>
                      <th className="px-4 py-2 font-medium">Result</th>
                      <th className="px-4 py-2 text-right font-medium">Calls</th>
                      <th className="px-4 py-2 text-right font-medium">Input tokens</th>
                      <th className="px-4 py-2 text-right font-medium">Cached</th>
                      <th className="px-4 py-2 text-right font-medium">Output tokens</th>
                      <th className="px-4 py-2 text-right font-medium">Avg latency</th>
                      <th className="px-4 py-2 text-right font-medium">Est. cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 tabular-nums">
                    {data.ai.last30Days.byTaskAndModel.map((row) => (
                      <tr key={`${row.task}-${row.model}-${row.success}`}>
                        <td className="px-4 py-2.5 font-medium text-stone-900 capitalize">{row.task}</td>
                        <td className="px-4 py-2.5 font-mono text-xs text-stone-600">{row.model}</td>
                        <td className="px-4 py-2.5">
                          {row.success ? "Success" : <span className="text-red-700">Failed</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(row.calls)}</td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(row.inputTokens)}</td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(row.cachedTokens)}</td>
                        <td className="px-4 py-2.5 text-right">{formatNumber(row.outputTokens)}</td>
                        <td className="px-4 py-2.5 text-right">{(row.avgLatencyMs / 1000).toFixed(1)}s</td>
                        <td className="px-4 py-2.5 text-right">
                          {row.estimatedCostUsd === null ? "—" : formatUsd(row.estimatedCostUsd)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Tickets by status" />
              <ul className="divide-y divide-stone-100">
                {STATUSES.map((status) => (
                  <li key={status} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <StatusBadge status={status} />
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {data.tickets.byStatus[status] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Unresolved by priority" />
              <ul className="divide-y divide-stone-100">
                {PRIORITIES.map((priority) => (
                  <li key={priority} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <PriorityBadge priority={priority} />
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {data.tickets.unresolvedByPriority[priority] ?? 0}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <ShieldCheck className="size-4 text-brand-700" aria-hidden />
              How AI spend is kept under control
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-stone-600 md:grid-cols-2">
              {COST_CONTROLS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-brand-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

function AiStatusBanner({ ai }: { ai: AdminStats["ai"] }) {
  if (!ai.enabled) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          <strong className="font-semibold">AI is not configured.</strong> Tickets are classified by keyword rules and
          drafts come from policy templates. Set <code className="rounded bg-amber-100 px-1">AI_PROVIDER</code> and an
          API key on the API server to enable it.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-stone-700">
      <span className="flex items-center gap-2 font-medium text-brand-900">
        <Sparkles className="size-4" aria-hidden />
        AI enabled · {ai.provider}
      </span>
      <span>
        Classification: <code className="font-mono text-xs">{ai.models?.classify}</code>
      </span>
      <span>
        Drafts: <code className="font-mono text-xs">{ai.models?.draft}</code>
      </span>
    </div>
  );
}

"use client";

import { RefreshCw, Sparkles, UserCheck, UserMinus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { useSession } from "@/hooks/use-session";
import { ApiError, api } from "@/lib/api";
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS } from "@/lib/labels";
import type { AdminTicket } from "@/lib/types";

type Patch = Partial<Pick<AdminTicket, "status" | "category" | "priority">> & { assigneeId?: string | null };

export function TriagePanel({ ticket, onUpdated }: { ticket: AdminTicket; onUpdated: (ticket: AdminTicket) => void }) {
  const toast = useToast();
  const { user } = useSession();
  const [saving, setSaving] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  async function update(patch: Patch, message: string) {
    setSaving(true);
    try {
      const result = await api<{ ticket: AdminTicket }>(`/tickets/${ticket.id}`, { method: "PATCH", body: patch });
      onUpdated(result.ticket);
      toast(message);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't save the change.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function reclassify() {
    setReclassifying(true);
    try {
      const result = await api<{ ticket: AdminTicket }>(`/tickets/${ticket.id}/classify`, { method: "POST" });
      onUpdated(result.ticket);
      toast(
        result.ticket.ai.status === "COMPLETED"
          ? "AI triage refreshed."
          : "AI unavailable; refreshed with keyword rules.",
      );
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't re-run triage.", "error");
    } finally {
      setReclassifying(false);
    }
  }

  const ai = ticket.ai;
  const assignedToMe = ticket.assignee?.id === user?.id;

  return (
    <Card>
      <CardHeader
        title="Triage"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={reclassify}
            loading={reclassifying}
            title="Ask the AI to classify again"
          >
            {!reclassifying && <RefreshCw className="size-3.5" aria-hidden />}
            Re-run AI
          </Button>
        }
      />
      <div className="space-y-4 p-4">
        <TriageField label="Status">
          <Select
            value={ticket.status}
            disabled={saving}
            onChange={(e) => {
              const status = e.target.value as AdminTicket["status"];
              void update({ status }, `Status set to ${STATUS_LABELS[status]}.`);
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </TriageField>

        <TriageField
          label="Priority"
          suggestion={
            ai.priority && (
              <AiSuggestion
                value={PRIORITY_LABELS[ai.priority]}
                overridden={ticket.priority !== ai.priority}
                byRules={ai.status === "FALLBACK"}
              />
            )
          }
        >
          <Select
            value={ticket.priority ?? ""}
            disabled={saving}
            onChange={(e) => {
              const priority = e.target.value as NonNullable<AdminTicket["priority"]>;
              void update({ priority }, `Priority set to ${PRIORITY_LABELS[priority]}.`);
            }}
          >
            {!ticket.priority && <option value="">Classifying…</option>}
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </TriageField>

        <TriageField
          label="Category"
          suggestion={
            ai.category && (
              <AiSuggestion
                value={CATEGORY_LABELS[ai.category]}
                overridden={ticket.category !== ai.category}
                byRules={ai.status === "FALLBACK"}
              />
            )
          }
        >
          <Select
            value={ticket.category ?? ""}
            disabled={saving}
            onChange={(e) => {
              const category = e.target.value as NonNullable<AdminTicket["category"]>;
              void update({ category }, `Category set to ${CATEGORY_LABELS[category]}.`);
            }}
          >
            {!ticket.category && <option value="">Classifying…</option>}
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </TriageField>

        {ai.reason && (
          <div className="rounded-lg bg-stone-50 p-3 text-xs leading-5 text-stone-600">
            <span className="mb-1 flex items-center gap-1 font-medium text-stone-800">
              <Sparkles className="size-3 text-brand-700" aria-hidden />
              {ai.status === "COMPLETED" ? "Why the AI chose this" : "Rule-based triage (AI unavailable)"}
            </span>
            {ai.reason}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
          <div className="text-sm">
            <div className="text-xs text-stone-500">Assignee</div>
            <div className="font-medium text-stone-900">{ticket.assignee?.name ?? "Unassigned"}</div>
          </div>
          {assignedToMe ? (
            <Button
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => update({ assigneeId: null }, "Ticket unassigned.")}
            >
              <UserMinus className="size-3.5" aria-hidden />
              Unassign
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={saving || !user}
              onClick={() => update({ assigneeId: user!.id }, "Assigned to you.")}
            >
              <UserCheck className="size-3.5" aria-hidden />
              Assign to me
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function TriageField({
  label,
  suggestion,
  children,
}: {
  label: string;
  suggestion?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-stone-500">{label}</span>
        {suggestion}
      </div>
      {children}
    </div>
  );
}

function AiSuggestion({ value, overridden, byRules }: { value: string; overridden: boolean; byRules: boolean }) {
  const source = byRules ? "Rules" : "AI";
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] text-stone-500"
      title={`What the ${source.toLowerCase()} suggested`}
    >
      <Sparkles className="size-3 text-brand-700" aria-hidden />
      {overridden ? `${source} said ${value} · overridden` : `${source} suggested`}
    </span>
  );
}

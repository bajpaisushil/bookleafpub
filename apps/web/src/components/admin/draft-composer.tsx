"use client";

import { Lock, RefreshCw, Send, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/feedback";
import { ApiError, api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { timeAgo } from "@/lib/format";
import type { AdminTicket, Draft, TicketStatus } from "@/lib/types";

type Tab = "reply" | "note";

/**
 * Reply composer with the AI draft built in. When an admin opens a ticket
 * that is waiting on us, the draft is requested automatically and dropped
 * into the editor. The admin always reviews and edits before sending.
 */
export function DraftComposer({ ticket, onUpdated }: { ticket: AdminTicket; onUpdated: (ticket: AdminTicket) => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("reply");
  const [reply, setReply] = useState(ticket.ai.draft ?? "");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<Pick<Draft, "source" | "generatedAt"> | null>(
    ticket.ai.draft && ticket.ai.draftSource
      ? { source: ticket.ai.draftSource, generatedAt: ticket.ai.draftGeneratedAt }
      : null,
  );
  const [usedAiDraft, setUsedAiDraft] = useState(!!ticket.ai.draft);
  const [drafting, setDrafting] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [sending, setSending] = useState<"reply" | "resolve" | "note" | null>(null);
  const [edited, setEdited] = useState(false);
  const requestedFor = useRef<string | null>(null);

  const publicMessages = ticket.messages.filter((m) => !m.isInternal);
  const lastPublic = publicMessages.at(-1);
  const unresolved = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const awaitingUs = unresolved && (!lastPublic || lastPublic.sender.role === "AUTHOR");
  // One automatic draft per author message, never for tickets we've already answered.
  const draftKey = `${ticket.id}:${lastPublic?.id ?? "first"}`;

  async function generate(regenerate: boolean) {
    setDrafting(true);
    setDraftError(null);
    try {
      const result = await api<Draft>(`/tickets/${ticket.id}/draft`, { method: "POST", body: { regenerate } });
      if (regenerate || !edited) {
        setReply(result.draft);
        setUsedAiDraft(true);
        setEdited(false);
      }
      setDraft({ source: result.source, generatedAt: result.generatedAt });
    } catch (err) {
      setDraftError(err instanceof ApiError ? err.message : "Couldn't generate a draft. You can still write a reply.");
    } finally {
      setDrafting(false);
    }
  }

  useEffect(() => {
    if (!awaitingUs || ticket.ai.draft || requestedFor.current === draftKey) return;
    requestedFor.current = draftKey;
    void generate(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey, awaitingUs]);

  async function send(kind: "reply" | "resolve" | "note") {
    const isNote = kind === "note";
    const body = isNote ? note : reply;
    if (!body.trim()) return;

    setSending(kind);
    try {
      const status: TicketStatus | undefined = kind === "resolve" ? "RESOLVED" : undefined;
      const result = await api<{ ticket: AdminTicket }>(`/tickets/${ticket.id}/messages`, {
        method: "POST",
        body: { body, internal: isNote, usedAiDraft: !isNote && usedAiDraft, status },
      });
      onUpdated(result.ticket);
      if (isNote) {
        setNote("");
        toast("Internal note added.");
      } else {
        setReply("");
        setDraft(null);
        setUsedAiDraft(false);
        setEdited(false);
        toast(kind === "resolve" ? "Reply sent and ticket resolved." : "Reply sent to the author.");
      }
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Couldn't send. Please try again.", "error");
    } finally {
      setSending(null);
    }
  }

  return (
    <Card>
      <div className="flex border-b border-stone-100 px-2" role="tablist">
        {(
          [
            ["reply", "Reply to author"],
            ["note", "Internal note"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium",
              tab === id ? "border-brand-700 text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800",
            )}
          >
            {id === "note" && <Lock className="size-3.5" aria-hidden />}
            {label}
          </button>
        ))}
      </div>

      {tab === "reply" ? (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-stone-800">
              <Sparkles className="size-4 text-brand-700" aria-hidden />
              AI draft
            </span>
            {drafting && <span className="text-stone-500">Drafting from the knowledge base and account data…</span>}
            {!drafting && draft && (
              <span className="text-xs text-stone-500">
                {draft.source === "AI" ? "Generated" : "Template"} {draft.generatedAt ? timeAgo(draft.generatedAt) : ""}
                {usedAiDraft && edited && " · edited"}
              </span>
            )}
            {!drafting && !draft && !awaitingUs && (
              <span className="text-xs text-stone-500">Not generated, since the author hasn&apos;t written since our last reply.</span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => generate(!!draft)}
              disabled={drafting}
            >
              <RefreshCw className={cn("size-3.5", drafting && "animate-spin")} aria-hidden />
              {draft ? "Regenerate" : "Generate draft"}
            </Button>
          </div>

          {draft?.source === "TEMPLATE" && !drafting && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              The AI is unavailable right now, so this draft was built from a policy template. Check the details before sending.
            </div>
          )}
          {draftError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{draftError}</div>
          )}

          {drafting && !reply ? (
            <div className="space-y-2 rounded-lg border border-stone-200 p-3" aria-busy>
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : (
            <Textarea
              aria-label="Reply to author"
              rows={12}
              value={reply}
              maxLength={5000}
              placeholder="Write a reply to the author…"
              onChange={(e) => {
                setReply(e.target.value);
                setEdited(true);
              }}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-stone-400">The author sees this reply instantly in their portal.</p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => send("resolve")}
                loading={sending === "resolve"}
                disabled={!reply.trim() || !!sending}
              >
                Send & resolve
              </Button>
              <Button onClick={() => send("reply")} loading={sending === "reply"} disabled={!reply.trim() || !!sending}>
                <Send className="size-4" aria-hidden />
                Send reply
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 p-4">
          <Textarea
            aria-label="Internal note"
            rows={5}
            value={note}
            maxLength={5000}
            placeholder="Context for the team: what you checked, who you escalated to…"
            onChange={(e) => setNote(e.target.value)}
            className="bg-amber-50/40"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-stone-500">Only visible to the BookLeaf team. Regenerated drafts take notes into account.</p>
            <Button onClick={() => send("note")} loading={sending === "note"} disabled={!note.trim() || !!sending}>
              Add note
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

"use client";

import { ArrowLeft, BookOpen, CircleCheck, Clock, Lock, Send, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import useSWR from "swr";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { Conversation } from "@/components/conversation";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError, api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { AuthorTicket, TicketStatus } from "@/lib/types";

const STATUS_NOTES: Record<TicketStatus, { icon: typeof Clock; text: string; className: string }> = {
  OPEN: {
    icon: Clock,
    text: "We've received your ticket and our team will reply soon, usually within 24–48 hours.",
    className: "border-sky-200 bg-sky-50 text-sky-900",
  },
  IN_PROGRESS: {
    icon: Wrench,
    text: "Our team is working on this. You'll see updates here as soon as they're sent.",
    className: "border-violet-200 bg-violet-50 text-violet-900",
  },
  RESOLVED: {
    icon: CircleCheck,
    text: "We've marked this as resolved. If you still need help, just reply and the ticket will reopen.",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  CLOSED: {
    icon: Lock,
    text: "This ticket is closed. If something else comes up, please raise a new ticket.",
    className: "border-stone-200 bg-stone-100 text-stone-700",
  },
};

export default function AuthorTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<{ ticket: AuthorTicket }>(`/tickets/${id}`);
  const ticket = data?.ticket;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/author/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My tickets
      </Link>

      {error && (
        <ErrorState
          message={error instanceof ApiError && error.status === 404 ? "We couldn't find this ticket." : undefined}
          onRetry={() => mutate()}
        />
      )}

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
        </div>
      )}

      {ticket && (
        <>
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
              <span className="font-medium">#{ticket.number}</span>
              <span aria-hidden>·</span>
              <span>Opened {formatDate(ticket.createdAt)}</span>
            </div>
            <h1 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">{ticket.subject}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <CategoryBadge category={ticket.category} />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs text-stone-600 ring-1 ring-stone-200">
                <BookOpen className="size-3.5" aria-hidden />
                {ticket.book?.title ?? "General / Account"}
              </span>
            </div>
          </header>

          <StatusNote status={ticket.status} />

          <Conversation
            viewer="AUTHOR"
            authorName="You"
            description={ticket.description}
            createdAt={ticket.createdAt}
            attachmentName={ticket.attachmentName}
            messages={ticket.messages}
          />

          {ticket.status !== "CLOSED" && (
            <ReplyBox ticket={ticket} onSent={(next) => mutate({ ticket: next }, false)} />
          )}
        </>
      )}
    </div>
  );
}

function StatusNote({ status }: { status: TicketStatus }) {
  const note = STATUS_NOTES[status];
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${note.className}`}>
      <note.icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      {note.text}
    </div>
  );
}

function ReplyBox({ ticket, onSent }: { ticket: AuthorTicket; onSent: (ticket: AuthorTicket) => void }) {
  const toast = useToast();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      const result = await api<{ ticket: AuthorTicket }>(`/tickets/${ticket.id}/messages`, {
        method: "POST",
        body: { body },
      });
      setBody("");
      onSent(result.ticket);
      toast(ticket.status === "RESOLVED" ? "Reply sent. We've reopened your ticket." : "Reply sent.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send your reply. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={onSubmit} className="space-y-3">
        <label htmlFor="reply" className="text-sm font-medium text-stone-800">
          Add a reply
        </label>
        <Textarea
          id="reply"
          rows={4}
          value={body}
          maxLength={5000}
          placeholder="Share any extra details or answer our questions here…"
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onSubmit(e);
          }}
        />
        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-stone-400">
            {ticket.status === "RESOLVED" ? "Replying will reopen this ticket." : "Ctrl + Enter to send"}
          </p>
          <Button type="submit" loading={sending} disabled={!body.trim()}>
            <Send className="size-4" aria-hidden />
            Send reply
          </Button>
        </div>
      </form>
    </Card>
  );
}

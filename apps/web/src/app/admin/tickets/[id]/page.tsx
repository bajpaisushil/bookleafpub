"use client";

import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { ActivityPanel, AuthorPanel, BookPanel } from "@/components/admin/context-panels";
import { DraftComposer } from "@/components/admin/draft-composer";
import { TriagePanel } from "@/components/admin/triage-panel";
import { CategoryBadge, PriorityBadge, StatusBadge } from "@/components/badges";
import { Conversation } from "@/components/conversation";
import { ErrorState, Skeleton } from "@/components/ui/feedback";
import { ApiError } from "@/lib/api";
import { formatDateTime, timeAgo } from "@/lib/format";
import type { AdminTicket } from "@/lib/types";

export default function AdminTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading, mutate } = useSWR<{ ticket: AdminTicket }>(`/tickets/${id}`);
  const ticket = data?.ticket;
  const onUpdated = (next: AdminTicket) => mutate({ ticket: next }, false);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Ticket queue
      </Link>

      {error && (
        <ErrorState
          message={error instanceof ApiError && error.status === 404 ? "This ticket doesn't exist." : undefined}
          onRetry={() => mutate()}
        />
      )}

      {isLoading && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-96" />
        </div>
      )}

      {ticket && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <header className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-500">
                <span className="font-medium">#{ticket.number}</span>
                <span aria-hidden>·</span>
                <span className="inline-flex items-center gap-1" title={formatDateTime(ticket.createdAt)}>
                  <Clock className="size-3.5" aria-hidden />
                  Opened {timeAgo(ticket.createdAt)}
                </span>
                <span aria-hidden>·</span>
                <span>
                  {ticket.author.name} · {ticket.book?.title ?? "General / Account"}
                </span>
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">{ticket.subject}</h1>
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
                <CategoryBadge category={ticket.category} />
              </div>
            </header>

            <Conversation
              viewer="ADMIN"
              authorName={ticket.author.name}
              description={ticket.description}
              createdAt={ticket.createdAt}
              attachmentName={ticket.attachmentName}
              messages={ticket.messages}
            />

            <DraftComposer key={ticket.id} ticket={ticket} onUpdated={onUpdated} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6">
            <TriagePanel ticket={ticket} onUpdated={onUpdated} />
            {ticket.book && <BookPanel book={ticket.book} />}
            <AuthorPanel author={ticket.author} />
            <ActivityPanel events={ticket.events} />
          </aside>
        </div>
      )}
    </div>
  );
}

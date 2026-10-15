"use client";

import { ChevronRight, Inbox, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";
import { CategoryBadge, StatusBadge } from "@/components/badges";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";
import { formatDate, timeAgo } from "@/lib/format";
import type { TicketListItem, TicketPage } from "@/lib/types";

const TABS = [
  { id: "active", label: "Active", status: "OPEN,IN_PROGRESS" },
  { id: "done", label: "Resolved & closed", status: "RESOLVED,CLOSED" },
  { id: "all", label: "All", status: "" },
];

export default function MyTicketsPage() {
  const [tab, setTab] = useState(TABS[0]);
  const { data, error, isLoading, mutate } = useSWR<TicketPage>(
    `/tickets?sort=updated&pageSize=100${tab.status ? `&status=${tab.status}` : ""}`,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">My tickets</h1>
          <p className="mt-1 text-stone-500">Replies from our team appear here as soon as they&apos;re sent.</p>
        </div>
        <ButtonLink href="/author/tickets/new">
          <Plus className="size-4" aria-hidden />
          New ticket
        </ButtonLink>
      </div>

      <div className="flex gap-1 border-b border-stone-200" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={tab.id === item.id}
            onClick={() => setTab(item)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab.id === item.id ? "border-brand-700 text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <ErrorState onRetry={() => mutate()} />}

      {isLoading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {data && data.tickets.length === 0 && (
        <Card>
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={tab.id === "active" ? "No open tickets" : "Nothing here yet"}
            description="Questions about royalties, ISBNs, printing or your book's progress? We're happy to help."
            action={<ButtonLink href="/author/tickets/new">Raise a ticket</ButtonLink>}
          />
        </Card>
      )}

      {data && data.tickets.length > 0 && (
        <Card className="divide-y divide-stone-100 overflow-hidden">
          {data.tickets.map((ticket) => (
            <TicketRow key={ticket.id} ticket={ticket} />
          ))}
        </Card>
      )}
    </div>
  );
}

function TicketRow({ ticket }: { ticket: TicketListItem }) {
  const newReply = ticket.lastMessageFrom === "SUPPORT" && ticket.status !== "CLOSED";

  return (
    <Link href={`/author/tickets/${ticket.id}`} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-stone-50">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-stone-400">#{ticket.number}</span>
          <span className="truncate font-medium text-stone-900">{ticket.subject}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>{ticket.book?.title ?? "General / Account"}</span>
          <span aria-hidden>·</span>
          <span>Opened {formatDate(ticket.createdAt)}</span>
          <CategoryBadge category={ticket.category} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={ticket.status} />
        {newReply ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-800">
            <MessageSquare className="size-3.5" aria-hidden />
            BookLeaf replied {timeAgo(ticket.lastMessageAt!)}
          </span>
        ) : (
          <span className="text-xs text-stone-400">Updated {timeAgo(ticket.updatedAt)}</span>
        )}
      </div>
      <ChevronRight className="size-4 shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-stone-500" aria-hidden />
    </Link>
  );
}

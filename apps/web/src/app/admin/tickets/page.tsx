"use client";

import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  Inbox,
  MessageSquare,
  Search,
  TriangleAlert,
  UserMinus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import useSWR from "swr";
import { AiBadge, CategoryBadge, PriorityBadge, StatusBadge } from "@/components/badges";
import { Card, StatTile } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { formatDate, formatDuration, hoursSince, timeAgo } from "@/lib/format";
import { CATEGORIES, CATEGORY_LABELS, PRIORITIES, PRIORITY_LABELS } from "@/lib/labels";
import type { AdminStats, TicketListItem, TicketPage } from "@/lib/types";

// Unresolved tickets older than this are flagged in the queue.
const SLA_HOURS = 48;

const STATUS_FILTERS = [
  { value: "", label: "Unresolved", api: "OPEN,IN_PROGRESS" },
  { value: "OPEN", label: "Open", api: "OPEN" },
  { value: "IN_PROGRESS", label: "In progress", api: "IN_PROGRESS" },
  { value: "RESOLVED", label: "Resolved", api: "RESOLVED" },
  { value: "CLOSED", label: "Closed", api: "CLOSED" },
  { value: "all", label: "All statuses", api: "" },
];

const SORTS = [
  { value: "urgency", label: "Most urgent first" },
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "updated", label: "Recently updated" },
];

const ASSIGNEE_FILTERS = [
  { value: "", label: "Everyone" },
  { value: "me", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
];

export default function QueuePage() {
  return (
    <Suspense>
      <Queue />
    </Suspense>
  );
}

function Queue() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Filters live in the URL so a filtered view can be bookmarked or shared.
  const filter = (key: string) => params.get(key) ?? "";
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
  }

  const status = STATUS_FILTERS.find((s) => s.value === filter("status")) ?? STATUS_FILTERS[0];
  const page = Number(filter("page")) || 1;

  const query = new URLSearchParams({ sort: filter("sort") || "urgency", page: String(page), pageSize: "20" });
  if (status.api) query.set("status", status.api);
  for (const key of ["category", "priority", "assignee", "from", "to", "q"]) {
    if (filter(key)) query.set(key, filter(key));
  }

  const { data, error, isLoading, mutate } = useSWR<TicketPage>(`/tickets?${query}`, { keepPreviousData: true });
  const hasFilters = ["status", "category", "priority", "assignee", "from", "to", "q"].some((key) => filter(key));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Ticket queue</h1>
        <p className="mt-1 text-sm text-stone-500">
          Sorted by urgency: critical first, then the longest-waiting tickets within each priority.
        </p>
      </div>

      <QueueStats />

      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox value={filter("q")} onChange={(value) => setFilter("q", value)} />
          <div className="w-40">
            <Select aria-label="Status" value={status.value} onChange={(e) => setFilter("status", e.target.value)}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-56">
            <Select
              aria-label="Category"
              value={filter("category")}
              onChange={(e) => setFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-40">
            <Select
              aria-label="Priority"
              value={filter("priority")}
              onChange={(e) => setFilter("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-48">
            <Select
              aria-label="Sort"
              value={filter("sort") || "urgency"}
              onChange={(e) => setFilter("sort", e.target.value)}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-stone-100 p-0.5" role="group" aria-label="Assignee">
            {ASSIGNEE_FILTERS.map((a) => (
              <button
                key={a.value}
                onClick={() => setFilter("assignee", a.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition",
                  filter("assignee") === a.value
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800",
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-500">
            From
            <Input
              type="date"
              className="h-8 w-40"
              value={filter("from")}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-500">
            To
            <Input
              type="date"
              className="h-8 w-40"
              value={filter("to")}
              onChange={(e) => setFilter("to", e.target.value)}
            />
          </label>
          {hasFilters && (
            <button
              onClick={() => router.replace(pathname)}
              className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-stone-500 hover:text-stone-900"
            >
              <X className="size-4" aria-hidden />
              Clear filters
            </button>
          )}
        </div>
      </Card>

      {error && <ErrorState onRetry={() => mutate()} />}

      <Card className="overflow-hidden">
        {isLoading && !data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : data && data.tickets.length === 0 ? (
          <EmptyState
            icon={<Inbox className="size-5" />}
            title={hasFilters ? "No tickets match these filters" : "The queue is clear"}
            description={
              hasFilters ? "Try widening the filters." : "New tickets from authors will appear here instantly."
            }
          />
        ) : (
          data && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-left text-sm">
                  <thead className="border-b border-stone-200 bg-stone-50 text-xs font-medium text-stone-500">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Priority</th>
                      <th className="px-4 py-2.5 font-medium">Ticket</th>
                      <th className="px-4 py-2.5 font-medium">Category</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium">Assignee</th>
                      <th className="px-4 py-2.5 text-right font-medium">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.tickets.map((ticket) => (
                      <QueueRow
                        key={ticket.id}
                        ticket={ticket}
                        onOpen={() => router.push(`/admin/tickets/${ticket.id}`)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                onChange={(next) => setFilter("page", String(next))}
              />
            </>
          )
        )}
      </Card>
    </div>
  );
}

function QueueStats() {
  const { data } = useSWR<AdminStats>("/admin/stats");

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
    );
  }

  const t = data.tickets;
  const critical = t.unresolvedByPriority.CRITICAL ?? 0;
  const high = t.unresolvedByPriority.HIGH ?? 0;
  const oldest = t.oldestUnresolved;

  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-5" aria-label="Queue health">
      <StatTile
        label="Unresolved"
        icon={<Inbox className="size-4" aria-hidden />}
        value={t.unresolved}
        detail={`${t.byStatus.OPEN ?? 0} open · ${t.byStatus.IN_PROGRESS ?? 0} in progress`}
      />
      <StatTile
        label="Critical & high"
        icon={<TriangleAlert className="size-4" aria-hidden />}
        value={critical + high}
        detail={`${critical} critical · ${high} high`}
        tone={critical > 0 ? "attention" : "default"}
      />
      <StatTile
        label="Unassigned"
        icon={<UserMinus className="size-4" aria-hidden />}
        value={t.unassigned}
        detail={`${t.assignedToMe} assigned to you`}
      />
      <StatTile
        label="Avg first response"
        icon={<Clock className="size-4" aria-hidden />}
        value={t.avgFirstResponseHours === null ? "—" : formatDuration(t.avgFirstResponseHours)}
        detail="Last 30 days"
      />
      <StatTile
        label="Oldest unresolved"
        icon={<Hourglass className="size-4" aria-hidden />}
        value={oldest ? formatDuration(hoursSince(oldest.createdAt)) : "—"}
        detail={
          oldest ? (
            <Link href={`/admin/tickets/${oldest.id}`} className="block truncate hover:text-stone-800 hover:underline">
              #{oldest.number} · {oldest.subject}
            </Link>
          ) : (
            "Nothing waiting"
          )
        }
      />
    </section>
  );
}

function QueueRow({ ticket, onOpen }: { ticket: TicketListItem; onOpen: () => void }) {
  const unresolved = ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
  const age = hoursSince(ticket.createdAt);
  const overdue = unresolved && age > SLA_HOURS;
  const overridden = ticket.aiStatus === "COMPLETED" && ticket.category !== ticket.aiCategory;

  return (
    <tr
      onClick={onOpen}
      className={cn(
        "cursor-pointer transition-colors hover:bg-stone-50",
        ticket.priority === "CRITICAL" && unresolved && "bg-red-50/40",
      )}
    >
      <td className="px-4 py-3 align-top">
        <PriorityBadge priority={ticket.priority} />
      </td>
      <td className="max-w-md px-4 py-3">
        <Link href={`/admin/tickets/${ticket.id}`} className="block" onClick={(e) => e.stopPropagation()}>
          <span className="flex items-center gap-2">
            <span className="text-xs text-stone-400">#{ticket.number}</span>
            <span className="truncate font-medium text-stone-900">{ticket.subject}</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-stone-500">
            {ticket.author?.name} · {ticket.book?.title ?? "General / Account"}
          </span>
        </Link>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <CategoryBadge category={ticket.category} />
          {ticket.aiStatus === "COMPLETED" && !overridden && <AiBadge title="Classified by AI" />}
          {ticket.aiStatus === "FALLBACK" && (
            <span className="text-[11px] text-stone-400" title="AI was unavailable; classified by keyword rules">
              rules
            </span>
          )}
          {overridden && (
            <span className="text-[11px] text-stone-400" title="An admin changed the AI's category">
              edited
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={ticket.status} />
          {ticket.needsReply && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-800">
              <MessageSquare className="size-3" aria-hidden />
              Awaiting reply
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-stone-600">
        {ticket.assignee?.name ?? <span className="text-stone-400">Unassigned</span>}
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <span
          className={cn("inline-flex items-center gap-1", overdue ? "font-medium text-red-700" : "text-stone-500")}
          title={`Opened ${formatDate(ticket.createdAt)}${overdue ? ` · waiting over ${SLA_HOURS}h` : ""}`}
        >
          {overdue && <Clock className="size-3.5" aria-hidden />}
          {timeAgo(ticket.createdAt)}
        </span>
      </td>
    </tr>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);

  // Keep the box in sync when the URL changes elsewhere (e.g. "Clear filters").
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  // Debounce so we don't hit the API on every keystroke.
  useEffect(() => {
    if (text === value) return;
    const timer = setTimeout(() => onChange(text), 300);
    return () => clearTimeout(timer);
  }, [text, value, onChange]);

  return (
    <div className="relative min-w-56 flex-1">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400"
        aria-hidden
      />
      <Input
        aria-label="Search tickets"
        placeholder="Search subject, author, book or #number"
        className="pl-9"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-stone-100 px-4 py-3 text-sm text-stone-500">
      <span>
        {from}–{to} of {total}
      </span>
      <div className="flex gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md p-1.5 hover:bg-stone-100 disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md p-1.5 hover:bg-stone-100 disabled:opacity-40"
          aria-label="Next page"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

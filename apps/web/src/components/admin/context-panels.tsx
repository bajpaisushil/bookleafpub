import { Activity, BookOpen, Mail, MapPin, Phone, User } from "lucide-react";
import type { ReactNode } from "react";
import { StageTracker } from "@/components/stage-tracker";
import { Card, CardHeader } from "@/components/ui/card";
import { formatDate, formatDateTime, formatNumber, formatRupees } from "@/lib/format";
import { bookStatusLabel } from "@/lib/labels";
import type { AdminTicket } from "@/lib/types";

// Everything an agent needs to answer without leaving the ticket.

export function AuthorPanel({ author }: { author: AdminTicket["author"] }) {
  const pending = author.books.reduce((sum, book) => sum + book.royaltyPending, 0);

  return (
    <Card>
      <CardHeader title="Author" icon={<User className="size-4 text-stone-400" aria-hidden />} />
      <div className="space-y-3 p-4 text-sm">
        <div>
          <p className="font-semibold text-stone-900">{author.name}</p>
          <p className="text-xs text-stone-500">
            {author.id} · Author since {formatDate(author.joinedDate)}
          </p>
        </div>
        <ul className="space-y-1.5 text-stone-600">
          <li className="break-anywhere flex items-center gap-2">
            <Mail className="size-3.5 shrink-0 text-stone-400" aria-hidden />
            {author.email}
          </li>
          {author.phone && (
            <li className="flex items-center gap-2">
              <Phone className="size-3.5 shrink-0 text-stone-400" aria-hidden />
              {author.phone}
            </li>
          )}
          {author.city && (
            <li className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0 text-stone-400" aria-hidden />
              {author.city}
            </li>
          )}
        </ul>
        <div className="border-t border-stone-100 pt-3">
          <p className="mb-2 flex justify-between text-xs text-stone-500">
            <span>
              {author.books.length} book{author.books.length === 1 ? "" : "s"}
            </span>
            <span>Total pending {formatRupees(pending)}</span>
          </p>
          <ul className="space-y-1.5">
            {author.books.map((book) => (
              <li key={book.id} className="flex items-baseline justify-between gap-2">
                <span className="truncate text-stone-800">{book.title}</span>
                <span className="shrink-0 text-xs text-stone-500">{bookStatusLabel(book.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function BookPanel({ book }: { book: NonNullable<AdminTicket["book"]> }) {
  const published = book.status === "PUBLISHED";

  return (
    <Card>
      <CardHeader title="Book" icon={<BookOpen className="size-4 text-stone-400" aria-hidden />} />
      <div className="space-y-3 p-4 text-sm">
        <div>
          <p className="font-semibold text-stone-900">{book.title}</p>
          <p className="break-anywhere font-mono text-xs text-stone-500">ISBN {book.isbn}</p>
        </div>
        {published ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            <Fact label="Status" value="Published & Live" />
            <Fact label="Published" value={formatDate(book.publicationDate)} />
            <Fact label="MRP" value={formatRupees(book.mrp)} />
            <Fact label="Royalty / copy" value={formatRupees(book.authorRoyaltyPerCopy)} />
            <Fact label="Copies sold" value={formatNumber(book.totalCopiesSold)} />
            <Fact label="Earned" value={formatRupees(book.totalRoyaltyEarned)} />
            <Fact label="Paid" value={formatRupees(book.royaltyPaid)} />
            <Fact label="Pending" value={formatRupees(book.royaltyPending)} />
            <Fact
              label="Last payout"
              value={book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : "Never"}
            />
            <Fact label="Printed by" value={book.printPartner ?? "—"} />
            <Fact label="Available on" value={book.availableOn.join(", ") || "—"} wide />
          </dl>
        ) : (
          <div className="space-y-3">
            <p className="text-stone-600">{bookStatusLabel(book.status)}</p>
            <StageTracker status={book.status} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function ActivityPanel({ events }: { events: AdminTicket["events"] }) {
  return (
    <Card>
      <CardHeader title="Activity" icon={<Activity className="size-4 text-stone-400" aria-hidden />} />
      <ol className="max-h-72 space-y-3 overflow-y-auto p-4">
        {events.map((event) => (
          <li key={event.id} className="relative pl-4 text-xs">
            <span className="absolute top-1.5 left-0 size-1.5 rounded-full bg-stone-300" aria-hidden />
            <p className="text-stone-800">{event.message}</p>
            <p className="text-stone-400">
              {event.actor} · {formatDateTime(event.createdAt)}
            </p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function Fact({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : undefined}>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-900">{value}</dd>
    </div>
  );
}

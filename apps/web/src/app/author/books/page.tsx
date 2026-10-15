"use client";

import {
  BookOpen,
  CalendarClock,
  IndianRupee,
  Library,
  MessageSquarePlus,
  Printer,
  Store,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import useSWR from "swr";
import { StageTracker } from "@/components/stage-tracker";
import { Card, StatTile } from "@/components/ui/card";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/feedback";
import { useSession } from "@/hooks/use-session";
import { formatDate, formatNumber, formatRupees, firstName } from "@/lib/format";
import { BOOK_STAGES } from "@/lib/labels";
import type { Book, BooksResponse } from "@/lib/types";

export default function MyBooksPage() {
  const { user } = useSession();
  const { data, error, isLoading, mutate } = useSWR<BooksResponse>("/books");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-stone-900">
          {user ? `Welcome back, ${firstName(user.name)}` : "My books"}
        </h1>
        <p className="mt-1 text-stone-500">
          Sales, royalties and production progress for every book you publish with us.
        </p>
      </div>

      {error && <ErrorState onRetry={() => mutate()} />}

      {isLoading && <BooksSkeleton />}

      {data && data.books.length === 0 && (
        <Card>
          <EmptyState
            icon={<Library className="size-5" />}
            title="No books yet"
            description="Once your manuscript is with us, you'll be able to follow its progress here."
          />
        </Card>
      )}

      {data && data.books.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Totals">
            <StatTile
              label="Copies sold"
              icon={<TrendingUp className="size-4" aria-hidden />}
              value={formatNumber(data.summary.copiesSold)}
              detail={`${data.summary.published} published · ${data.summary.inProduction} in production`}
            />
            <StatTile
              label="Royalty earned"
              icon={<IndianRupee className="size-4" aria-hidden />}
              value={formatRupees(data.summary.royaltyEarned)}
              detail="Lifetime, all books"
            />
            <StatTile
              label="Paid to you"
              icon={<Wallet className="size-4" aria-hidden />}
              value={formatRupees(data.summary.royaltyPaid)}
            />
            <StatTile
              label="Pending"
              icon={<CalendarClock className="size-4" aria-hidden />}
              value={formatRupees(data.summary.royaltyPending)}
              detail={
                data.summary.royaltyPending === 0
                  ? "All paid up"
                  : data.summary.nextPayout.eligible
                    ? `Due by ${formatDate(data.summary.nextPayout.dueBy)}`
                    : `Below ${formatRupees(data.summary.nextPayout.threshold)} minimum · rolls over`
              }
            />
          </section>

          <PayoutNotice summary={data.summary} />

          <section className="grid gap-5 lg:grid-cols-2" aria-label="Books">
            {data.books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function PayoutNotice({ summary }: { summary: BooksResponse["summary"] }) {
  const { nextPayout, royaltyPending } = summary;

  let message: string;
  if (royaltyPending === 0) {
    message = "You're all paid up. New royalties will appear here as your books sell.";
  } else if (nextPayout.eligible) {
    message = `Your pending ${formatRupees(royaltyPending)} is above the ${formatRupees(nextPayout.threshold)} minimum and will be paid by bank transfer to the account linked in your dashboard.`;
  } else {
    message = `Your pending ${formatRupees(royaltyPending)} is below the ${formatRupees(nextPayout.threshold)} minimum payout, so it rolls over to the next quarter. Nothing is lost.`;
  }

  return (
    <Card className="flex flex-col gap-4 border-brand-200 bg-brand-50/60 p-5 sm:flex-row sm:items-center">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-800">
        <CalendarClock className="size-5" aria-hidden />
      </div>
      <div className="flex-1">
        <p className="font-medium text-stone-900">
          Next royalty payout: {nextPayout.quarter} quarter, due by {formatDate(nextPayout.dueBy)}
        </p>
        <p className="mt-0.5 text-sm text-stone-600">{message}</p>
      </div>
      <Link
        href="/author/tickets/new"
        className="text-sm font-medium whitespace-nowrap text-brand-800 underline-offset-2 hover:underline"
      >
        Question about royalties?
      </Link>
    </Card>
  );
}

function BookCard({ book }: { book: Book }) {
  const published = book.status === "PUBLISHED";

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold text-stone-900">{book.title}</h2>
          <p className="mt-0.5 text-sm text-stone-500">{book.genre}</p>
          <p className="break-anywhere mt-1 font-mono text-xs text-stone-400">ISBN {book.isbn}</p>
        </div>
        {published ? (
          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
            Published & Live
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            In production
          </span>
        )}
      </div>

      <div className="flex-1 px-5 pb-5">
        {published ? <PublishedDetails book={book} /> : <ProductionDetails book={book} />}
      </div>

      <div className="border-t border-stone-100 px-5 py-3">
        <Link
          href={`/author/tickets/new?bookId=${book.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-800 hover:text-brand-900"
        >
          <MessageSquarePlus className="size-4" aria-hidden />
          Ask about this book
        </Link>
      </div>
    </Card>
  );
}

function PublishedDetails({ book }: { book: Book }) {
  const paidShare = book.totalRoyaltyEarned ? (book.royaltyPaid / book.totalRoyaltyEarned) * 100 : 0;

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-3 rounded-lg bg-stone-50 p-3 text-sm">
        <Metric label="MRP" value={formatRupees(book.mrp)} />
        <Metric label="Royalty / copy" value={formatRupees(book.authorRoyaltyPerCopy)} />
        <Metric label="Copies sold" value={formatNumber(book.totalCopiesSold)} />
      </dl>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-stone-600">Royalty earned</span>
          <span className="font-semibold text-stone-900">{formatRupees(book.totalRoyaltyEarned)}</span>
        </div>
        {book.totalRoyaltyEarned > 0 ? (
          <>
            <div
              className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label={`${formatRupees(book.royaltyPaid)} paid, ${formatRupees(book.royaltyPending)} pending`}
            >
              {book.royaltyPaid > 0 && <div className="rounded-full bg-brand-600" style={{ width: `${paidShare}%` }} />}
              {book.royaltyPending > 0 && <div className="flex-1 rounded-full bg-brand-200" />}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand-600" aria-hidden />
                Paid {formatRupees(book.royaltyPaid)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand-200" aria-hidden />
                Pending {formatRupees(book.royaltyPending)}
              </span>
              <span className="ml-auto text-stone-500">
                Last payout: {book.lastRoyaltyPayoutDate ? formatDate(book.lastRoyaltyPayoutDate) : "none yet"}
              </span>
            </div>
          </>
        ) : (
          <p className="mt-1 text-xs text-stone-500">
            No royalties yet. They&apos;ll appear here after your first sales.
          </p>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-start gap-2 text-stone-600">
          <Store className="mt-0.5 size-4 shrink-0 text-stone-400" aria-hidden />
          <div className="flex flex-wrap gap-1.5">
            {book.availableOn.length ? (
              book.availableOn.map((platform) => (
                <span key={platform} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                  {platform}
                </span>
              ))
            ) : (
              <span className="text-xs text-stone-500">Not listed on any platform yet</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <Printer className="size-4 text-stone-400" aria-hidden />
          Printed by {book.printPartner ?? "—"} · Published {formatDate(book.publicationDate)}
        </div>
      </div>
    </div>
  );
}

function ProductionDetails({ book }: { book: Book }) {
  const stage = BOOK_STAGES.find((s) => s.status === book.status)?.label;
  return (
    <div className="space-y-4">
      <StageTracker status={book.status} />
      <div className="rounded-lg bg-amber-50/60 p-3 text-sm text-stone-700">
        <p>
          Your book is at the <strong className="font-semibold text-stone-900">{stage}</strong> stage. We email you at
          every step, and sales and royalties will show up here once it&apos;s live.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-stone-500">{label}</dt>
      <dd className="mt-0.5 font-semibold text-stone-900">{value}</dd>
    </div>
  );
}

function BooksSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-20" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <span className="sr-only">
        <BookOpen /> Loading your books
      </span>
    </div>
  );
}

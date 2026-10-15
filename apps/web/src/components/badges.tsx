import { ArrowDown, ArrowUp, Minus, OctagonAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { CATEGORY_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/labels";
import type { TicketCategory, TicketPriority, TicketStatus } from "@/lib/types";

const pill = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap";

const STATUS_STYLES: Record<TicketStatus, { pill: string; dot: string }> = {
  OPEN: { pill: "bg-sky-50 text-sky-800 ring-1 ring-sky-200", dot: "bg-sky-500" },
  IN_PROGRESS: { pill: "bg-violet-50 text-violet-800 ring-1 ring-violet-200", dot: "bg-violet-500" },
  RESOLVED: { pill: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200", dot: "bg-emerald-500" },
  CLOSED: { pill: "bg-stone-100 text-stone-600 ring-1 ring-stone-200", dot: "bg-stone-400" },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={cn(pill, style.pill)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />
      {STATUS_LABELS[status]}
    </span>
  );
}

// Priority uses the reserved status colours, always with an icon and a label.
const PRIORITY_STYLES: Record<TicketPriority, { pill: string; icon: typeof ArrowUp; iconClass: string }> = {
  CRITICAL: { pill: "bg-red-50 text-red-800 ring-1 ring-red-200", icon: OctagonAlert, iconClass: "text-critical" },
  HIGH: { pill: "bg-orange-50 text-orange-900 ring-1 ring-orange-200", icon: ArrowUp, iconClass: "text-serious" },
  MEDIUM: { pill: "bg-amber-50 text-amber-900 ring-1 ring-amber-200", icon: Minus, iconClass: "text-warning" },
  LOW: { pill: "bg-stone-100 text-stone-700 ring-1 ring-stone-200", icon: ArrowDown, iconClass: "text-stone-500" },
};

export function PriorityBadge({ priority }: { priority: TicketPriority | null | undefined }) {
  if (!priority) return <span className={cn(pill, "bg-stone-50 text-stone-500 ring-1 ring-stone-200")}>Triaging…</span>;
  const style = PRIORITY_STYLES[priority];
  const Icon = style.icon;
  return (
    <span className={cn(pill, style.pill)}>
      <Icon className={cn("size-3.5", style.iconClass)} strokeWidth={2.5} aria-hidden />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TicketCategory | null | undefined }) {
  if (!category) return <span className="text-xs text-stone-400">Classifying…</span>;
  return <span className={cn(pill, "bg-stone-100 text-stone-700")}>{CATEGORY_LABELS[category]}</span>;
}

export function AiBadge({ label = "AI", title }: { label?: string; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-800 ring-1 ring-brand-200"
    >
      <Sparkles className="size-3" aria-hidden />
      {label}
    </span>
  );
}

import { CircleAlert, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("size-4 animate-spin text-stone-400", className)} aria-label="Loading" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-stone-200/70", className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-stone-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-stone-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <CircleAlert className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">{message ?? "We couldn't load this. Please try again."}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-medium underline underline-offset-2 hover:no-underline">
          Retry
        </button>
      )}
    </div>
  );
}

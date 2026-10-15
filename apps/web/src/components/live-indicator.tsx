import { cn } from "@/lib/cn";
import type { LiveStatus } from "@/hooks/use-live-updates";

const LABELS: Record<LiveStatus, string> = {
  live: "Live",
  connecting: "Connecting…",
  offline: "Offline · refreshing every 30s",
};

export function LiveIndicator({ status, inverted = false }: { status: LiveStatus; inverted?: boolean }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs", inverted ? "text-brand-100/80" : "text-stone-500")}
      title="Updates appear here automatically without refreshing"
    >
      <span className="relative flex size-2">
        {status === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            status === "live" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-400" : "bg-stone-400",
          )}
        />
      </span>
      {LABELS[status]}
    </span>
  );
}

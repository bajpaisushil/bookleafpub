import { Leaf } from "lucide-react";
import { cn } from "@/lib/cn";

export function Logo({ inverted = false, subtitle }: { inverted?: boolean; subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          "flex size-8 items-center justify-center rounded-lg",
          inverted ? "bg-white/10 text-brand-200" : "bg-brand-700 text-white",
        )}
      >
        <Leaf className="size-4.5" aria-hidden />
      </div>
      <div className="leading-tight">
        <div className={cn("font-display text-lg font-semibold", inverted ? "text-white" : "text-stone-900")}>
          BookLeaf
        </div>
        {subtitle && (
          <div
            className={cn(
              "text-[11px] font-medium tracking-wide uppercase",
              inverted ? "text-brand-200/80" : "text-stone-500",
            )}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOK_STAGES } from "@/lib/labels";
import type { BookStatus } from "@/lib/types";

// Shows where an unpublished book sits in BookLeaf's production pipeline.
export function StageTracker({ status }: { status: BookStatus }) {
  const current = BOOK_STAGES.findIndex((stage) => stage.status === status);

  return (
    <ol className="grid grid-cols-9 gap-1" aria-label="Production progress">
      {BOOK_STAGES.map((stage, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={stage.status} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[10px] font-semibold",
                done && "bg-brand-600 text-white",
                active && "bg-white text-brand-800 ring-2 ring-brand-600",
                !done && !active && "bg-stone-100 text-stone-400",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : index + 1}
            </span>
            <span
              className={cn(
                "hidden text-[10px] leading-tight sm:block",
                active ? "font-semibold text-brand-800" : done ? "text-stone-600" : "text-stone-400",
              )}
            >
              {stage.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

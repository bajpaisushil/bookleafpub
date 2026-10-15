import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOK_STAGES } from "@/lib/labels";
import type { BookStatus } from "@/lib/types";

// Where an unpublished book sits in BookLeaf's production pipeline.
export function StageTracker({ status }: { status: BookStatus }) {
  const current = BOOK_STAGES.findIndex((stage) => stage.status === status);
  const next = BOOK_STAGES[current + 1];

  return (
    <div>
      <ol className="flex items-center" aria-label="Production progress">
        {BOOK_STAGES.map((stage, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={stage.status} className="flex flex-1 items-center last:flex-none">
              <span
                title={stage.label}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                  done && "bg-brand-600 text-white",
                  active && "bg-white text-brand-800 ring-2 ring-brand-600",
                  !done && !active && "bg-stone-100 text-stone-400",
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : index + 1}
                <span className="sr-only">
                  {stage.label}
                  {done ? " (done)" : active ? " (current)" : ""}
                </span>
              </span>
              {index < BOOK_STAGES.length - 1 && (
                <span
                  className={cn("mx-0.5 h-0.5 flex-1 rounded-full", done ? "bg-brand-600" : "bg-stone-200")}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex flex-wrap justify-between gap-x-3 text-xs text-stone-500">
        <span>
          Step {current + 1} of {BOOK_STAGES.length}:{" "}
          <strong className="font-semibold text-stone-800">{BOOK_STAGES[current]?.label}</strong>
        </span>
        {next && <span>Next: {next.label}</span>}
      </p>
    </div>
  );
}

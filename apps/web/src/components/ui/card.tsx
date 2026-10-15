import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-stone-200 bg-white shadow-xs", className)} {...props} />;
}

export function CardHeader({ title, action, icon }: { title: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "attention";
}) {
  return (
    <Card className={cn("p-4", tone === "attention" && "border-red-200 bg-red-50/40")}>
      <div className="flex items-center gap-2 text-sm text-stone-600">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">{value}</div>
      {detail && <div className="mt-1 text-xs text-stone-500">{detail}</div>}
    </Card>
  );
}

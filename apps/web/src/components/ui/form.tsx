import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-lg border bg-white px-3 text-sm text-stone-900 shadow-xs placeholder:text-stone-400 " +
  "focus:border-brand-600 focus:ring-3 focus:ring-brand-600/15 focus:outline-none disabled:bg-stone-50 disabled:text-stone-500";

const border = (invalid?: boolean) => (invalid ? "border-red-400" : "border-stone-300");

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-stone-800">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-stone-500">{hint}</p>
      )}
    </div>
  );
}

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input className={cn(control, border(invalid), "h-10", className)} aria-invalid={invalid} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return <textarea className={cn(control, border(invalid), "py-2 leading-6", className)} aria-invalid={invalid} {...props} />;
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return <select className={cn(control, border(invalid), "h-10 pr-8", className)} aria-invalid={invalid} {...props} />;
}

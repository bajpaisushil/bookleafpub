"use client";

import { ChartColumn, Inbox, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LiveIndicator } from "@/components/live-indicator";
import { Logo } from "@/components/logo";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/admin/tickets", label: "Ticket queue", icon: Inbox },
  { href: "/admin/insights", label: "Insights", icon: ChartColumn },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const live = useLiveUpdates();

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-brand-950 px-4 py-5 lg:flex">
        <Link href="/admin/tickets" className="px-2">
          <Logo inverted subtitle="Support Ops" />
        </Link>
        <nav className="mt-8 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-white/10 text-white"
                  : "text-brand-100/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-4">
          <div className="px-3">
            <LiveIndicator status={live} inverted />
          </div>
          {user && (
            <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{user.name}</p>
                <p className="truncate text-xs text-brand-100/60">{user.email}</p>
              </div>
              <button onClick={logout} className="text-brand-100/60 hover:text-white" aria-label="Sign out" title="Sign out">
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-stone-200 bg-white px-4 lg:hidden">
        <Logo subtitle="Support Ops" />
        <nav className="ml-auto flex gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg p-2",
                pathname.startsWith(item.href) ? "bg-brand-50 text-brand-800" : "text-stone-500",
              )}
              aria-label={item.label}
            >
              <item.icon className="size-5" />
            </Link>
          ))}
          <button onClick={logout} className="rounded-lg p-2 text-stone-500" aria-label="Sign out">
            <LogOut className="size-5" />
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

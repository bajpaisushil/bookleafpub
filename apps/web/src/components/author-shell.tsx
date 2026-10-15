"use client";

import { BookOpen, LogOut, MessageSquare, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { LiveIndicator } from "@/components/live-indicator";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { useLiveUpdates } from "@/hooks/use-live-updates";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const NAV = [
  { href: "/author/books", label: "My books", icon: BookOpen },
  { href: "/author/tickets", label: "My tickets", icon: MessageSquare },
];

export function AuthorShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useSession();
  const live = useLiveUpdates();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/author/books" aria-label="BookLeaf home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href) && !pathname.startsWith("/author/tickets/new");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-brand-50 text-brand-800" : "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
                  )}
                >
                  <item.icon className="size-4" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden md:inline-flex">
              <LiveIndicator status={live} />
            </span>
            <ButtonLink href="/author/tickets/new" size="sm">
              <Plus className="size-4" aria-hidden />
              <span className="hidden sm:inline">New ticket</span>
            </ButtonLink>
            {user && (
              <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
                <span
                  className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
                  title={user.name}
                >
                  {initials(user.name)}
                </span>
                <button
                  onClick={logout}
                  className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="flex gap-1 border-t border-stone-100 px-4 py-2 sm:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-center text-sm font-medium",
                pathname.startsWith(item.href) ? "bg-brand-50 text-brand-800" : "text-stone-600",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

"use client";

import { ArrowRight, BookOpen, Headset, Hourglass } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { ApiError, api } from "@/lib/api";
import type { User } from "@/lib/types";

const DEMO_ACCOUNTS = [
  {
    name: "Priya Sharma",
    note: "Author · 2 live books",
    email: "priya.sharma@email.com",
    password: "author123",
    icon: BookOpen,
  },
  {
    name: "Kavita Deshmukh",
    note: "Author · book in production",
    email: "kavita.deshmukh@email.com",
    password: "author123",
    icon: Hourglass,
  },
  {
    name: "Neha Verma",
    note: "Admin · support team",
    email: "admin@bookleaf.demo",
    password: "admin123",
    icon: Headset,
  },
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function signIn(credentials: { email: string; password: string }) {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const { user } = await api<{ user: User }>("/auth/login", { method: "POST", body: credentials });
      const next = searchParams.get("next");
      const home = user.role === "ADMIN" ? "/admin/tickets" : "/author/books";
      // Only follow `next` within the user's own portal.
      const prefix = user.role === "ADMIN" ? "/admin" : "/author";
      router.replace(next?.startsWith(prefix) ? next : home);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors());
        setError(err.code === "VALIDATION_ERROR" ? null : err.message);
      } else {
        setError("Couldn't reach the server. Please check your connection.");
      }
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void signIn({ email, password });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </div>
        )}
        <Field label="Email" htmlFor="email" error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            invalid={!!fieldErrors.email}
            autoFocus
          />
        </Field>
        <Field label="Password" htmlFor="password" error={fieldErrors.password}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!fieldErrors.password}
          />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>
      </form>

      <div className="mt-10">
        <div className="flex items-center gap-3 text-xs font-medium tracking-wide text-stone-400 uppercase">
          <span className="h-px flex-1 bg-stone-200" />
          Demo accounts
          <span className="h-px flex-1 bg-stone-200" />
        </div>
        <div className="mt-4 space-y-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={loading}
              onClick={() => {
                setEmail(account.email);
                setPassword(account.password);
                void signIn(account);
              }}
              className="group flex w-full items-center gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/50 disabled:opacity-60"
            >
              <span className="flex size-8 items-center justify-center rounded-md bg-stone-100 text-stone-600 group-hover:bg-brand-100 group-hover:text-brand-800">
                <account.icon className="size-4" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-stone-900">{account.name}</span>
                <span className="block text-xs text-stone-500">{account.note}</span>
              </span>
              <ArrowRight
                className="size-4 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-brand-700"
                aria-hidden
              />
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { CircleCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const HIGHLIGHTS = [
  "Track sales, royalties and payouts for every book",
  "Raise a query and follow every reply in one place",
  "Answers grounded in BookLeaf policy, reviewed by our team",
];

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-brand-700/40 blur-3xl"
          aria-hidden
        />
        <Logo inverted subtitle="Author Support" />
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            Every author question, answered properly.
          </h1>
          <p className="mt-4 text-brand-100/80">
            One place for your books, your royalties and your conversations with the BookLeaf team.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-brand-50">
                <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-200/70">BookLeaf Publishing · India & US</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo subtitle="Author Support" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Sign in</h2>
          <p className="mt-1 text-sm text-stone-500">Use the email linked to your BookLeaf account.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

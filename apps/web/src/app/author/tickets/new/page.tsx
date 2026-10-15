"use client";

import { ArrowLeft, CircleHelp, FileText, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import useSWR from "swr";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ApiError, api } from "@/lib/api";
import { bookStatusLabel } from "@/lib/labels";
import type { AuthorTicket, BooksResponse } from "@/lib/types";

const MAX_FILE_MB = 10;
const ACCEPTED_FILES = "image/*,.pdf,.doc,.docx";

const QUICK_ANSWERS = [
  {
    q: "When are royalties paid?",
    a: "Quarterly, within 45 days of the quarter ending, once your balance reaches ₹1,000.",
  },
  {
    q: "My book is published but not on Amazon yet",
    a: "New listings usually go live within 7–10 business days after publication.",
  },
  {
    q: "Can I change my book description?",
    a: "Yes, even after it's live. Changes reach all platforms within 3–5 business days.",
  },
  {
    q: "My printed copies have defects",
    a: "Tell us and attach photos. We'll arrange a free reprint once verified.",
  },
];

export default function NewTicketPage() {
  return (
    <Suspense>
      <NewTicketForm />
    </Suspense>
  );
}

function NewTicketForm() {
  const router = useRouter();
  const toast = useToast();
  const searchParams = useSearchParams();
  const { data: books } = useSWR<BooksResponse>("/books");

  const [bookId, setBookId] = useState(searchParams.get("bookId") ?? "");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next: Record<string, string> = {};
    if (subject.trim().length < 5) next.subject = "Subject should be at least 5 characters";
    if (description.trim().length < 20) next.description = "Please describe the issue in at least 20 characters";
    if (file && file.size > MAX_FILE_MB * 1024 * 1024) next.attachment = `Files can be up to ${MAX_FILE_MB} MB`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const { ticket } = await api<{ ticket: AuthorTicket }>("/tickets", {
        method: "POST",
        body: { bookId: bookId || null, subject, description, attachmentName: file?.name ?? null },
      });
      toast(`Ticket #${ticket.number} created. We'll get back to you soon.`);
      router.push(`/author/tickets/${ticket.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors());
        if (err.code !== "VALIDATION_ERROR") setFormError(err.message);
      } else {
        setFormError("Couldn't reach the server. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/author/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My tickets
      </Link>

      <div>
        <h1 className="font-display text-3xl font-semibold text-stone-900">Raise a ticket</h1>
        <p className="mt-1 text-stone-500">Tell us what&apos;s going on. The more specific, the faster we can help.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {formError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {formError}
              </div>
            )}

            <Field label="Which book is this about?" htmlFor="book" error={errors.bookId}>
              <Select id="book" value={bookId} onChange={(e) => setBookId(e.target.value)} invalid={!!errors.bookId}>
                <option value="">General / Account level</option>
                {books?.books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} ({bookStatusLabel(book.status)})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Subject" htmlFor="subject" error={errors.subject} hint={`${subject.length}/150`}>
              <Input
                id="subject"
                value={subject}
                maxLength={150}
                placeholder="e.g. Royalty for last quarter not received"
                onChange={(e) => setSubject(e.target.value)}
                invalid={!!errors.subject}
              />
            </Field>

            <Field
              label="Describe the issue"
              htmlFor="description"
              error={errors.description}
              hint={
                <span className="flex justify-between gap-4">
                  <span>Include dates, amounts, platforms or order details where you can.</span>
                  <span>{description.length}/5000</span>
                </span>
              }
            >
              <Textarea
                id="description"
                rows={7}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                invalid={!!errors.description}
              />
            </Field>

            <Field
              label="Attachment (optional)"
              htmlFor="attachment"
              error={errors.attachment}
              hint={`Screenshots, photos of printed copies or documents, up to ${MAX_FILE_MB} MB. We record the file name with your ticket; our team will ask for the file by email if needed.`}
            >
              {file ? (
                <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
                  <FileText className="size-5 text-stone-500" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-stone-800">{file.name}</p>
                    <p className="text-xs text-stone-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-stone-700"
                    aria-label="Remove attachment"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="attachment"
                  className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center transition hover:border-brand-400 hover:bg-brand-50/40"
                >
                  <Paperclip className="size-5 text-stone-400" aria-hidden />
                  <span className="text-sm font-medium text-stone-700">Choose a file</span>
                  <span className="text-xs text-stone-500">PNG, JPG, PDF or DOC</span>
                  <input
                    id="attachment"
                    type="file"
                    accept={ACCEPTED_FILES}
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              )}
            </Field>

            <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-5">
              <Link href="/author/tickets" className="text-sm font-medium text-stone-600 hover:text-stone-900">
                Cancel
              </Link>
              <Button type="submit" loading={submitting}>
                Submit ticket
              </Button>
            </div>
          </form>
        </Card>

        <aside>
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900">
              <CircleHelp className="size-4 text-brand-700" aria-hidden />
              Quick answers
            </h2>
            <dl className="mt-4 space-y-4">
              {QUICK_ANSWERS.map((item) => (
                <div key={item.q}>
                  <dt className="text-sm font-medium text-stone-800">{item.q}</dt>
                  <dd className="mt-0.5 text-sm text-stone-500">{item.a}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

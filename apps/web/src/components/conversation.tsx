import { Lock, Paperclip, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDateTime, initials } from "@/lib/format";
import type { Message, Role } from "@/lib/types";

interface Props {
  authorName: string;
  description: string;
  createdAt: string;
  attachmentName: string | null;
  messages: Message[];
  viewer: Role;
}

// The author's original query followed by the thread. Admins also see
// internal notes, styled so they can't be mistaken for replies.
export function Conversation({ authorName, description, createdAt, attachmentName, messages, viewer }: Props) {
  return (
    <ol className="space-y-4">
      <MessageItem
        name={viewer === "AUTHOR" ? "You" : authorName}
        role="AUTHOR"
        body={description}
        createdAt={createdAt}
        badge="Original query"
        attachmentName={attachmentName}
      />
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          name={viewer === "AUTHOR" && message.sender.role === "AUTHOR" ? "You" : message.sender.name}
          role={message.sender.role}
          body={message.body}
          createdAt={message.createdAt}
          internal={message.isInternal}
          usedAiDraft={message.usedAiDraft}
        />
      ))}
    </ol>
  );
}

function MessageItem({
  name,
  role,
  body,
  createdAt,
  badge,
  internal,
  usedAiDraft,
  attachmentName,
}: {
  name: string;
  role: Role;
  body: string;
  createdAt: string;
  badge?: string;
  internal?: boolean;
  usedAiDraft?: boolean;
  attachmentName?: string | null;
}) {
  const fromSupport = role === "ADMIN";

  return (
    <li className="flex gap-3">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          internal
            ? "bg-amber-100 text-amber-900"
            : fromSupport
              ? "bg-brand-700 text-white"
              : "bg-stone-200 text-stone-700",
        )}
        aria-hidden
      >
        {internal ? <Lock className="size-4" /> : initials(name)}
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-xl border px-4 py-3",
          internal && "border-dashed border-amber-300 bg-amber-50/70",
          !internal && fromSupport && "border-brand-200 bg-brand-50/50",
          !internal && !fromSupport && "border-stone-200 bg-white",
        )}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-semibold text-stone-900">{name}</span>
          {fromSupport && !internal && <span className="text-xs text-brand-800">BookLeaf Support</span>}
          {internal && (
            <span className="text-xs font-medium text-amber-900">Internal note · not visible to the author</span>
          )}
          {badge && <span className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px] text-stone-600">{badge}</span>}
          {usedAiDraft && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-stone-500"
              title="Started from the AI draft"
            >
              <Sparkles className="size-3" aria-hidden /> AI-assisted
            </span>
          )}
          <time className="ml-auto text-xs text-stone-400" dateTime={createdAt}>
            {formatDateTime(createdAt)}
          </time>
        </div>
        <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-stone-800 break-anywhere">{body}</p>
        {attachmentName && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs text-stone-600">
            <Paperclip className="size-3.5" aria-hidden />
            {attachmentName}
          </p>
        )}
      </div>
    </li>
  );
}

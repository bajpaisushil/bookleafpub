// Response shapes of the BookLeaf API (see apps/api/openapi.yaml).

export type Role = "AUTHOR" | "ADMIN";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type TicketCategory =
  "ROYALTY_PAYMENTS" | "ISBN_METADATA" | "PRINTING_QUALITY" | "DISTRIBUTION" | "BOOK_STATUS" | "GENERAL";
export type TicketPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type AiStatus = "PENDING" | "COMPLETED" | "FALLBACK";
export type BookStatus =
  | "MANUSCRIPT_RECEIVED"
  | "EDITING"
  | "COVER_DESIGN"
  | "TYPESETTING"
  | "PROOFREADING"
  | "ISBN_ASSIGNMENT"
  | "PRINTING"
  | "DISTRIBUTION_SETUP"
  | "PUBLISHED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  authorId: string | null;
}

export interface Book {
  id: string;
  authorId: string;
  title: string;
  isbn: string;
  genre: string;
  publicationDate: string | null;
  status: BookStatus;
  mrp: number | null;
  authorRoyaltyPerCopy: number | null;
  totalCopiesSold: number;
  totalRoyaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastRoyaltyPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
}

export interface BooksResponse {
  books: (Book & { author: { id: string; name: string } })[];
  summary: {
    totalBooks: number;
    published: number;
    inProduction: number;
    copiesSold: number;
    royaltyEarned: number;
    royaltyPaid: number;
    royaltyPending: number;
    nextPayout: { quarter: string; dueBy: string; threshold: number; eligible: boolean };
  };
}

export interface TicketListItem {
  id: string;
  number: number;
  subject: string;
  status: TicketStatus;
  category: TicketCategory | null;
  book: { id: string; title: string } | null;
  replyCount: number;
  lastMessageAt: string | null;
  lastMessageFrom: "AUTHOR" | "SUPPORT" | null;
  createdAt: string;
  updatedAt: string;
  // Admin only
  priority?: TicketPriority | null;
  aiStatus?: AiStatus;
  aiCategory?: TicketCategory | null;
  aiPriority?: TicketPriority | null;
  author?: { id: string; name: string };
  assignee?: { id: string; name: string } | null;
  needsReply?: boolean;
}

export interface TicketPage {
  tickets: TicketListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Message {
  id: string;
  body: string;
  createdAt: string;
  sender: { id: string; name: string; role: Role };
  isInternal?: boolean;
  usedAiDraft?: boolean;
}

export interface AuthorTicket {
  id: string;
  number: number;
  subject: string;
  description: string;
  status: TicketStatus;
  category: TicketCategory | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  book: { id: string; title: string; isbn: string; status: BookStatus } | null;
  messages: Message[];
}

export interface AdminTicket extends Omit<AuthorTicket, "book"> {
  priority: TicketPriority | null;
  book: Book | null;
  author: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    city: string | null;
    joinedDate: string;
    books: { id: string; title: string; status: BookStatus; royaltyPending: number }[];
  };
  assignee: { id: string; name: string } | null;
  firstResponseAt: string | null;
  ai: {
    status: AiStatus;
    category: TicketCategory | null;
    priority: TicketPriority | null;
    reason: string | null;
    draft: string | null;
    draftSource: "AI" | "TEMPLATE" | null;
    draftGeneratedAt: string | null;
  };
  events: { id: string; message: string; actor: string; createdAt: string }[];
}

export interface Draft {
  draft: string;
  source: "AI" | "TEMPLATE";
  generatedAt: string | null;
}

export interface AdminStats {
  tickets: {
    byStatus: Partial<Record<TicketStatus, number>>;
    unresolvedByPriority: Partial<Record<TicketPriority | "UNCLASSIFIED", number>>;
    unresolved: number;
    unassigned: number;
    assignedToMe: number;
    oldestUnresolved: { id: string; number: number; subject: string; createdAt: string } | null;
    avgFirstResponseHours: number | null;
  };
  ai: {
    enabled: boolean;
    provider: string | null;
    models: { classify: string; draft: string } | null;
    last30Days: {
      calls: number;
      failedCalls: number;
      failureRate: number;
      estimatedCostUsd: number;
      byTaskAndModel: {
        task: string;
        model: string;
        success: boolean;
        calls: number;
        inputTokens: number;
        outputTokens: number;
        cachedTokens: number;
        avgLatencyMs: number;
        estimatedCostUsd: number | null;
      }[];
    };
    accuracy: { classified: number; categoryKeptRate: number | null; priorityKeptRate: number | null };
  };
}

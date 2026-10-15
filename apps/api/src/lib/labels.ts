import type { BookStatus, TicketCategory, TicketPriority, TicketStatus } from "../generated/prisma/client";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata Issues",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION: "Distribution & Availability",
  BOOK_STATUS: "Book Status & Production Updates",
  GENERAL: "General Inquiry",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  CRITICAL: "Critical",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

// In pipeline order.
export const BOOK_STAGES: { status: BookStatus; label: string }[] = [
  { status: "MANUSCRIPT_RECEIVED", label: "Manuscript Received" },
  { status: "EDITING", label: "Editing" },
  { status: "COVER_DESIGN", label: "Cover Design" },
  { status: "TYPESETTING", label: "Typesetting" },
  { status: "PROOFREADING", label: "Proofreading" },
  { status: "ISBN_ASSIGNMENT", label: "ISBN Assignment" },
  { status: "PRINTING", label: "Printing" },
  { status: "DISTRIBUTION_SETUP", label: "Distribution Setup" },
  { status: "PUBLISHED", label: "Published & Live" },
];

export function bookStatusLabel(status: BookStatus) {
  return BOOK_STAGES.find((stage) => stage.status === status)?.label ?? status;
}

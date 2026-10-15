import type { BookStatus, TicketCategory, TicketPriority, TicketStatus } from "./types";

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  ISBN_METADATA: "ISBN & Metadata",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION: "Distribution & Availability",
  BOOK_STATUS: "Book Status & Production",
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

export const BOOK_STAGES: { status: BookStatus; label: string }[] = [
  { status: "MANUSCRIPT_RECEIVED", label: "Manuscript" },
  { status: "EDITING", label: "Editing" },
  { status: "COVER_DESIGN", label: "Cover Design" },
  { status: "TYPESETTING", label: "Typesetting" },
  { status: "PROOFREADING", label: "Proofreading" },
  { status: "ISBN_ASSIGNMENT", label: "ISBN" },
  { status: "PRINTING", label: "Printing" },
  { status: "DISTRIBUTION_SETUP", label: "Distribution" },
  { status: "PUBLISHED", label: "Published" },
];

export function bookStatusLabel(status: BookStatus) {
  if (status === "PUBLISHED") return "Published & Live";
  return `In production · ${BOOK_STAGES.find((stage) => stage.status === status)?.label}`;
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as TicketCategory[];
export const PRIORITIES = Object.keys(PRIORITY_LABELS) as TicketPriority[];
export const STATUSES = Object.keys(STATUS_LABELS) as TicketStatus[];

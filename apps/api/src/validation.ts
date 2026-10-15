import { z } from "zod";
import { TicketCategory, TicketPriority, TicketStatus } from "./generated/prisma/client";

// Request schemas. Route handlers call `.parse()`; a failure becomes a 400
// with field-level details in the error handler.

export const loginSchema = z.object({
  email: z.email("Enter a valid email address").max(200),
  password: z.string().min(1, "Password is required").max(200),
});

export const createTicketSchema = z.object({
  bookId: z.string().trim().min(1).nullish(), // empty = General / Account level
  subject: z.string().trim().min(5, "Subject should be at least 5 characters").max(150),
  description: z
    .string()
    .trim()
    .min(20, "Please describe the issue in at least 20 characters")
    .max(5000, "Description can be at most 5,000 characters"),
  attachmentName: z.string().trim().max(255).nullish(),
});

export const updateTicketSchema = z
  .object({
    status: z.enum(TicketStatus),
    category: z.enum(TicketCategory),
    priority: z.enum(TicketPriority),
    assigneeId: z.string().min(1).nullable(), // null = unassign
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update");

export const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Message can't be empty").max(5000),
  internal: z.boolean().default(false),
  usedAiDraft: z.boolean().default(false),
  // Lets an admin reply and change status in one step, e.g. "Send & resolve".
  status: z.enum(TicketStatus).optional(),
});

export const draftSchema = z.object({
  regenerate: z.boolean().default(false),
});

// "OPEN,IN_PROGRESS" -> ["OPEN", "IN_PROGRESS"]
const statusList = z
  .string()
  .transform((value) => value.split(",").filter(Boolean))
  .pipe(z.array(z.enum(TicketStatus)));

export const listTicketsSchema = z.object({
  status: statusList.optional(),
  category: z.enum(TicketCategory).optional(),
  priority: z.enum(TicketPriority).optional(),
  assignee: z.enum(["me", "unassigned"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(["urgency", "newest", "oldest", "updated"]).default("urgency"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsSchema>;

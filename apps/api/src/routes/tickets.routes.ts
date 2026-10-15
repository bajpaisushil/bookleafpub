import { Router, type Request } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { aiLimiter, createTicketLimiter } from "../middleware/rate-limit";
import { classifyAndSave, getOrCreateDraft } from "../services/ai.service";
import { addMessage, createTicket, getTicket, listTickets, updateTicket } from "../services/ticket.service";
import {
  createMessageSchema,
  createTicketSchema,
  draftSchema,
  listTicketsSchema,
  updateTicketSchema,
} from "../validation";

type WithId = Request<{ id: string }>;

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  res.json(await listTickets(req.user!, listTicketsSchema.parse(req.query)));
});

router.post("/", requireRole("AUTHOR"), createTicketLimiter, async (req, res) => {
  const ticket = await createTicket(req.user!, createTicketSchema.parse(req.body));
  res.status(201).json({ ticket });
});

router.get("/:id", async (req: WithId, res) => {
  res.json({ ticket: await getTicket(req.user!, req.params.id) });
});

router.patch("/:id", requireRole("ADMIN"), async (req: WithId, res) => {
  const ticket = await updateTicket(req.user!, req.params.id, updateTicketSchema.parse(req.body));
  res.json({ ticket });
});

router.post("/:id/messages", async (req: WithId, res) => {
  const ticket = await addMessage(req.user!, req.params.id, createMessageSchema.parse(req.body));
  res.status(201).json({ ticket });
});

router.post("/:id/draft", requireRole("ADMIN"), aiLimiter, async (req: WithId, res) => {
  const { regenerate } = draftSchema.parse(req.body ?? {});
  await getTicket(req.user!, req.params.id); // 404 for unknown ids
  res.json(await getOrCreateDraft(req.params.id, regenerate));
});

router.post("/:id/classify", requireRole("ADMIN"), aiLimiter, async (req: WithId, res) => {
  await getTicket(req.user!, req.params.id);
  await classifyAndSave(req.params.id, req.user!.id);
  res.json({ ticket: await getTicket(req.user!, req.params.id) });
});

export default router;

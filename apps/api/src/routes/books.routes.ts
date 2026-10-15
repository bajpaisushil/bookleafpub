import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { getBook, listBooks } from "../services/book.service";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  const { authorId } = z.object({ authorId: z.string().optional() }).parse(req.query);
  res.json(await listBooks(req.user!, authorId));
});

router.get("/:id", async (req, res) => {
  res.json({ book: await getBook(req.user!, req.params.id) });
});

export default router;

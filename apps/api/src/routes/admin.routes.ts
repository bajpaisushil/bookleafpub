import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { getAdminStats } from "../services/stats.service";

const router = Router();
router.use(requireAuth, requireRole("ADMIN"));

router.get("/stats", async (req, res) => {
  res.json(await getAdminStats(req.user!.id));
});

export default router;

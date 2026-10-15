import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import bookRoutes from "./books.routes";
import eventRoutes from "./events.routes";
import ticketRoutes from "./tickets.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/books", bookRoutes);
router.use("/tickets", ticketRoutes);
router.use("/admin", adminRoutes);
router.use("/events", eventRoutes);

export default router;

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { subscribe } from "../realtime/events";

const router = Router();

// Server-Sent Events stream. The browser's EventSource reconnects on its own
// if the connection drops.
router.get("/", requireAuth, (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // stop nginx-style proxies from buffering
  });
  res.write("retry: 5000\n\n");

  const unsubscribe = subscribe(req.user!, res);
  // Comment lines keep idle connections from being closed by proxies.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

export default router;

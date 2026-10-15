import { Router } from "express";
import { isProduction } from "../config/env";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "../lib/auth";
import { requireAuth } from "../middleware/auth";
import { loginLimiter } from "../middleware/rate-limit";
import { login } from "../services/auth.service";
import { loginSchema } from "../validation";

const router = Router();

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const { user, token } = await login(email, password);

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
  // The token is also returned for API clients that use Bearer auth.
  res.json({ user, token });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.status(204).end();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;

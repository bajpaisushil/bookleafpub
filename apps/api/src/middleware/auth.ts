import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, verifyToken, type AuthUser } from "../lib/auth";
import { forbidden, unauthorized } from "../lib/errors";
import type { Role } from "../generated/prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Browsers send the httpOnly session cookie; API clients (Postman, scripts)
// can send the same JWT as a Bearer token.
function readToken(req: Request): string | undefined {
  const cookieToken = req.cookies?.[SESSION_COOKIE];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token) throw unauthorized();

  try {
    req.user = verifyToken(token);
  } catch {
    throw unauthorized("Your session has expired. Please log in again.");
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) throw forbidden();
    next();
  };
}

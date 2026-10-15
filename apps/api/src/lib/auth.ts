import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../generated/prisma/client";

export const SESSION_COOKIE = "bl_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // one working day

// Everything the API needs to authorise a request lives in the token,
// so no session store or per-request user lookup is needed.
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  authorId: string | null;
}

export function signToken(user: AuthUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: SESSION_TTL_SECONDS });
}

export function verifyToken(token: string): AuthUser {
  const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload & AuthUser;
  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    authorId: payload.authorId,
  };
}

export const hashPassword = (password: string) => bcrypt.hash(password, 10);
export const checkPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

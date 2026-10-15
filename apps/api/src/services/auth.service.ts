import { checkPassword, signToken, type AuthUser } from "../lib/auth";
import { HttpError } from "../lib/errors";
import { prisma } from "../lib/prisma";

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: { author: { select: { id: true } } },
  });

  // Same message for unknown email and wrong password, so the endpoint
  // can't be used to find out which emails have accounts.
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Incorrect email or password.");
  }

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    authorId: user.author?.id ?? null,
  };

  return { user: authUser, token: signToken(authUser) };
}

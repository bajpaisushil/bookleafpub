import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "../config/env";

// One shared connection pool per process. Scale out by running more API
// instances (put PgBouncer in front of Postgres once there are many).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: 10 });

export const prisma = new PrismaClient({ adapter });

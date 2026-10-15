import { readFileSync } from "node:fs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";
import { env, isProduction } from "./config/env";
import { prisma } from "./lib/prisma";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { apiLimiter } from "./middleware/rate-limit";
import apiRoutes from "./routes";

const openApiSpec = parse(readFileSync(new URL("../openapi.yaml", import.meta.url), "utf8"));

export function createApp() {
  const app = express();

  app.set("trust proxy", 1); // correct client IPs behind a load balancer
  app.use(helmet());
  app.use(cors({ origin: env.WEB_ORIGIN.split(","), credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  if (env.NODE_ENV !== "test") app.use(morgan(isProduction ? "combined" : "dev"));

  app.get("/api/health", async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  });

  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: "BookLeaf API" }));

  app.use("/api", apiLimiter, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

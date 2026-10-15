import { env } from "./config/env";
import { createApp } from "./app";
import { aiInfo } from "./ai/llm";
import { prisma } from "./lib/prisma";
import { startClassificationSweeper } from "./services/ai.service";

const app = createApp();

const server = app.listen(env.PORT, () => {
  const ai = aiInfo();
  console.log(`BookLeaf API listening on http://localhost:${env.PORT}`);
  console.log(`API docs at http://localhost:${env.PORT}/api/docs`);
  console.log(ai.enabled ? `AI: ${ai.provider} (${ai.models.classify} / ${ai.models.draft})` : "AI: disabled, using rules and templates");
});

const stopSweeper = startClassificationSweeper();

function shutdown() {
  console.log("Shutting down...");
  stopSweeper();
  server.close(() => {
    prisma.$disconnect().finally(() => process.exit(0));
  });
  // Open SSE streams would keep the server alive, so don't wait forever.
  setTimeout(() => process.exit(0), 10_000).unref();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

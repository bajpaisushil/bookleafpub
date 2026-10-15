import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { TEST_ENV } from "./test-env.ts";

// Brings the test database up to date and reloads the sample data once per
// run. The seed wipes tables, so refuse to run against anything that isn't
// clearly a test database.
export default function setup() {
  const databaseName = new URL(TEST_ENV.DATABASE_URL).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to run tests against "${databaseName}": the database name must end with _test.`);
  }

  const env = { ...process.env, ...TEST_ENV };
  const cwd = fileURLToPath(new URL("..", import.meta.url));
  execSync("npx prisma migrate deploy", { cwd, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { cwd, env, stdio: "pipe" });
}

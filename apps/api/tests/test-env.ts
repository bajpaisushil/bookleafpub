// Tests run against their own database so they never touch dev data.
export const TEST_ENV = {
  NODE_ENV: "test",
  DATABASE_URL:
    process.env.TEST_DATABASE_URL ?? "postgresql://bookleaf:bookleaf@localhost:5432/bookleaf_test",
  JWT_SECRET: "test-secret-that-is-at-least-32-characters-long",
  AI_PROVIDER: "none",
};

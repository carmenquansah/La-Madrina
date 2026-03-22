import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma CLI config (replaces deprecated package.json "prisma" key).
 * Load .env so DATABASE_URL is available when Prisma skips auto-loading.
 * Seed: npx prisma db seed
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
});

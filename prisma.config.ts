import { defineConfig } from "prisma/config";

// Next.js loads .env.local itself. CLI callers must load the target environment explicitly.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL || "postgresql://localhost/climbsite" }
});

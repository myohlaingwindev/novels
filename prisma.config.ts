import "dotenv/config";
import { defineConfig } from "prisma/config";

// Generate only needs a URL string. Cloudflare's install has no .env and does not connect.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://127.0.0.1:5432/novels";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});

import { defineConfig } from "prisma/config";

// Prisma generates the client without connecting. This file is only for local migrate commands.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:./data/local.sqlite",
  },
});

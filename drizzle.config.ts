import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://botlogix:botlogix@127.0.0.1:55432/botlogix",
  },
  strict: true,
  verbose: true,
} satisfies Config;

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://botlogix:botlogix@127.0.0.1:55432/botlogix";

export const sqlClient = postgres(DATABASE_URL, { max: 10 });
export const db = drizzle(sqlClient, { schema });
export { schema };
export type DB = typeof db;

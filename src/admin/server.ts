import "dotenv/config";
import path from "node:path";
import Fastify from "fastify";
import formbody from "@fastify/formbody";
import cookie from "@fastify/cookie";
import session from "@fastify/session";
import fastifyStatic from "@fastify/static";
import { loginRoutes } from "./routes/login.js";
import { auditRoutes } from "./routes/audits.js";
import { artifactRoutes } from "./routes/artifacts.js";
import { reportRoutes } from "./routes/reports.js";

const app = Fastify({
  logger: true,
  trustProxy: process.env.TRUST_PROXY === "true",
});

const sessionSecret = process.env.SESSION_SECRET || "dev-session-secret-change-this-before-deploy";

await app.register(formbody);
await app.register(cookie);
await app.register(session, {
  secret: sessionSecret.padEnd(32, "x").slice(0, 64),
  cookieName: "botlogix_audit_session",
  cookie: {
    secure: process.env.ADMIN_COOKIE_SECURE === "true",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
});
await app.register(fastifyStatic, {
  root: path.resolve(process.cwd(), "src/admin/public"),
  prefix: "/",
});

app.addHook("onSend", async (_request, reply, payload) => {
  reply.header("X-Robots-Tag", "noindex, nofollow");
  reply.header("Cache-Control", "no-store");
  return payload;
});

app.get("/healthz", async () => ({ ok: true }));
app.get("/favicon.ico", async (_request, reply) => reply.code(204).send());

await app.register(loginRoutes);
await app.register(auditRoutes);
await app.register(artifactRoutes);
await app.register(reportRoutes);

const port = Number(process.env.ADMIN_PORT ?? 5057);
const host = process.env.ADMIN_HOST ?? "127.0.0.1";

try {
  await app.listen({ port, host });
  app.log.info(`BotLogix audit admin running at http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

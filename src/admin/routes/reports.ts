import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits } from "../../db/schema.js";
import { requireAdmin } from "../auth.js";
import { enqueueAuditJob, jobForAudit } from "../services/auditRunner.js";
import { emailReport } from "../services/emailReport.js";

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  app.post("/audits/:id/regenerate", async (request, reply) => {
    const auditId = Number((request.params as { id: string }).id);
    enqueueAuditJob(auditId, "regenerate_reports");
    return reply.redirect(`/audits/${auditId}?regenerated=1`);
  });

  app.post("/audits/:id/email", async (request, reply) => {
    const auditId = Number((request.params as { id: string }).id);
    const body = request.body as { email_to?: string };
    const emailTo = (body.email_to ?? "").trim();

    try {
      await emailReport(auditId, emailTo);
      return reply.redirect(`/audits/${auditId}?emailed=1`);
    } catch (err) {
      return reply.redirect(`/audits/${auditId}?error=${encodeURIComponent((err as Error).message)}`);
    }
  });

  app.get("/api/audits/:id/status", async (request, reply) => {
    const auditId = Number((request.params as { id: string }).id);
    const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
    if (!audit) return reply.code(404).send({ error: "Audit not found" });
    const job = jobForAudit(auditId);
    return {
      id: audit.id,
      status: audit.status,
      status_detail: audit.status_detail,
      job: job
        ? {
            status: job.status,
            step: job.step,
            error: job.error ?? null,
            startedAt: job.startedAt?.toISOString() ?? null,
            completedAt: job.completedAt?.toISOString() ?? null,
          }
        : null,
      updated_at: audit.updated_at,
    };
  });
}

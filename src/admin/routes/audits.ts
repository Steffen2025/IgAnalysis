import type { FastifyInstance } from "fastify";
import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import {
  audits,
  competitors,
  report_deliveries,
  report_sections,
  scrape_jobs,
  scores,
} from "../../db/schema.js";
import { requireAdmin } from "../auth.js";
import { auditShowPage, auditsIndexPage, newAuditPage } from "../views.js";
import {
  displayNameFromInstagramUrl,
  normalizeInstagramUrl,
} from "../../services/audit/auditContextInference.js";
import {
  enqueueAuditJob,
  jobForAudit,
  purgeAuditJobs,
  runningAuditIds,
} from "../services/auditRunner.js";
import {
  deleteAuditFiles,
  inferExistingArtifacts,
  listRecordedArtifacts,
} from "../services/reportArtifacts.js";

const optionalText = z.string().trim().optional().default("");

const newAuditSchema = z.object({
  instagram_url: z.string().trim().min(1, "Paste the Instagram profile URL or handle."),
  city: z.string().trim().min(1, "City is required so local intelligence targets the right market."),
  region: z.string().trim().min(1, "Province / State is required so ambiguous city names are handled correctly."),
  business_category: z.string().trim().min(1, "Business type is required so competitors, hashtags, and hooks are relevant."),
  business_name: optionalText,
  website_url: optionalText,
  service_area: optionalText,
  main_offer: optionalText,
  target_audience: optionalText,
  follower_goal: optionalText,
  business_outcome: optionalText,
  mode: z.enum(["local_only", "reference_only", "mixed"]).default("mixed"),
  reference_markets: optionalText,
  delivery_email: optionalText,
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", requireAdmin);

  app.get("/", async (_request, reply) => reply.redirect("/audits"));

  app.get("/audits", async (request, reply) => {
    const rows = await db
      .select()
      .from(audits)
      .orderBy(desc(audits.created_at), desc(audits.id));
    const enriched = await Promise.all(rows.map(async (audit) => ({
      ...audit,
      overallScore: (await first(db
        .select({ value: scores.overall_score })
        .from(scores)
        .where(eq(scores.audit_id, audit.id))
        .limit(1)))?.value ?? null,
      artifacts: (await listRecordedArtifacts(audit.id)).length + inferExistingArtifacts(audit.id).length,
    })));
    const query = request.query as { created?: string; queued?: string; deleted?: string };
    const flash = query.created
      ? `Audit #${query.created} created.`
      : query.queued
      ? `Audit #${query.queued} queued.`
      : query.deleted
      ? `Audit #${query.deleted} deleted.`
      : undefined;
    return reply.type("text/html").send(auditsIndexPage({
      audits: enriched,
      runningIds: runningAuditIds(),
      flash,
    }));
  });

  app.get("/audits/new", async (_request, reply) => {
    return reply.type("text/html").send(newAuditPage());
  });

  app.post("/audits", async (request, reply) => {
    const parsed = newAuditSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply
        .type("text/html")
        .code(400)
        .send(newAuditPage({
          error: parsed.error.issues[0]?.message ?? "Invalid audit input.",
          values: request.body as Record<string, string>,
        }));
    }

    const instagramUrl = normalizeInstagramUrl(parsed.data.instagram_url);
    if (!instagramUrl) {
      return reply
        .type("text/html")
        .code(400)
        .send(newAuditPage({
          error: "That does not look like an Instagram profile URL or handle.",
          values: request.body as Record<string, string>,
        }));
    }

    const referenceMarkets = parseReferenceMarkets(parsed.data.reference_markets);
    const [inserted] = await db.insert(audits)
      .values({
        business_name: parsed.data.business_name || displayNameFromInstagramUrl(instagramUrl),
        instagram_url: instagramUrl,
        website_url: parsed.data.website_url || null,
        city: parsed.data.city,
        service_area: parsed.data.service_area || `${parsed.data.city}, ${parsed.data.region}`,
        business_category: parsed.data.business_category,
        main_offer: parsed.data.main_offer || null,
        target_audience: parsed.data.target_audience || null,
        follower_goal: parsed.data.follower_goal || null,
        business_outcome: parsed.data.business_outcome || null,
        delivery_email: parsed.data.delivery_email || null,
        report_type: "full_gtm",
        mode: parsed.data.mode,
        reference_markets: referenceMarkets.length ? JSON.stringify(referenceMarkets) : null,
        status: "queued",
        status_detail: "CREATED",
      })
      .returning({ id: audits.id });

    enqueueAuditJob(inserted.id, "full_audit");
    return reply.redirect(`/audits/${inserted.id}?queued=1`);
  });

  app.get("/audits/:id", async (request, reply) => {
    const auditId = Number((request.params as { id: string }).id);
    const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
    if (!audit) return reply.code(404).send("Audit not found");

    const scrapeJobRows = await db
      .select({ status: scrape_jobs.status, count: sql<number>`count(*)` })
      .from(scrape_jobs)
      .where(eq(scrape_jobs.audit_id, auditId))
      .groupBy(scrape_jobs.status);

    const failedJobs = (await db
      .select({
        actor_label: scrape_jobs.actor_label,
        error_message: scrape_jobs.error_message,
      })
      .from(scrape_jobs)
      .where(eq(scrape_jobs.audit_id, auditId)))
      .filter((job) => job.error_message);

    const compRows = await db
      .select({
        username: competitors.username,
        competitor_type: competitors.competitor_type,
        geographic_market: competitors.geographic_market,
        deep_scraped: competitors.deep_scraped,
        confidence_score: competitors.confidence_score,
      })
      .from(competitors)
      .where(eq(competitors.audit_id, auditId));

    const score = await first(db
      .select({
        profile: scores.profile_conversion_score,
        content: scores.content_performance_score,
        local: scores.local_visibility_score,
        sales: scores.sales_readiness_score,
        competitor: scores.competitor_gap_score,
        overall: scores.overall_score,
      })
      .from(scores)
      .where(eq(scores.audit_id, auditId))
      .limit(1)) ?? null;

    const sections = await db
      .select({
        section_key: report_sections.section_key,
        generated_at: report_sections.generated_at,
        token_count: report_sections.token_count,
      })
      .from(report_sections)
      .where(eq(report_sections.audit_id, auditId));

    const query = request.query as { created?: string; queued?: string; regenerated?: string; emailed?: string; error?: string };
    const message = query.created
      ? "Audit created. Click Run Audit when ready."
      : query.queued
      ? "Audit job queued."
      : query.regenerated
      ? "Report regeneration queued."
      : query.emailed
      ? "Report email sent."
      : undefined;

    return reply.type("text/html").send(auditShowPage({
      audit,
      score,
      artifacts: await listRecordedArtifacts(auditId),
      inferredArtifacts: inferExistingArtifacts(auditId),
      deliveries: await db.select().from(report_deliveries).where(eq(report_deliveries.audit_id, auditId)),
      scrapeJobs: scrapeJobRows.map((row) => ({ status: row.status, count: Number(row.count) })),
      failedJobs,
      competitors: compRows,
      sections,
      running: ["queued", "running"].includes(jobForAudit(auditId)?.status ?? ""),
      job: jobForAudit(auditId),
      message,
      error: query.error,
    }));
  });

  app.post("/audits/:id/run", async (request, reply) => {
    const auditId = Number((request.params as { id: string }).id);
    enqueueAuditJob(auditId, "full_audit");
    return reply.redirect(`/audits/${auditId}?queued=1`);
  });

  app.post("/audits/:id/delete", async (request, reply) => {
    const auditId = Number((request.params as { id: string }).id);
    const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
    if (!audit) return reply.code(404).send("Audit not found");

    const job = jobForAudit(auditId);
    if (job?.status === "running") {
      return reply.redirect(`/audits/${auditId}?error=${encodeURIComponent("This audit is currently running. Wait for it to finish before deleting it.")}`);
    }

    purgeAuditJobs(auditId);
    deleteAuditFiles(auditId);
    await db.delete(audits).where(eq(audits.id, auditId));
    return reply.redirect(`/audits?deleted=${auditId}`);
  });

}

function parseReferenceMarkets(value: string): string[] {
  return value
    .split(/[;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

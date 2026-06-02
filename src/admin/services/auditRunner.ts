import { existsSync } from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits } from "../../db/schema.js";
import { AuditPhase, setPhase } from "../../services/audit/auditState.js";
import { runAudit } from "../../services/audit/orchestrator.js";
import { runScoring } from "../../services/scoring/scoringOrchestrator.js";
import { runPatternAnalysis } from "../../services/patterns/patternOrchestrator.js";
import { runEnrichment } from "../../services/comments/enrichmentOrchestrator.js";
import { generateGoldMaster } from "../../services/instagram-intelligence/generateGoldMaster.js";
import { recordArtifact, type ArtifactInput } from "./reportArtifacts.js";

export type AdminJobKind = "full_audit" | "regenerate_reports";
export type AdminJobStatus = "queued" | "running" | "complete" | "failed";

export interface AdminJob {
  id: string;
  auditId: number;
  kind: AdminJobKind;
  status: AdminJobStatus;
  step: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

const jobs = new Map<string, AdminJob>();
const queue: AdminJob[] = [];
let active = false;

function jobId(kind: AdminJobKind, auditId: number): string {
  return `${kind}:${auditId}:${Date.now()}`;
}

export function enqueueAuditJob(auditId: number, kind: AdminJobKind): AdminJob {
  const existing = [...jobs.values()].find(
    (job) => job.auditId === auditId && ["queued", "running"].includes(job.status),
  );
  if (existing) return existing;

  const job: AdminJob = {
    id: jobId(kind, auditId),
    auditId,
    kind,
    status: "queued",
    step: "Queued",
  };
  jobs.set(job.id, job);
  queue.push(job);
  void drainQueue();
  return job;
}

export function runningAuditIds(): number[] {
  return [...jobs.values()]
    .filter((job) => ["queued", "running"].includes(job.status))
    .map((job) => job.auditId);
}

export function jobForAudit(auditId: number): AdminJob | null {
  return [...jobs.values()]
    .filter((job) => job.auditId === auditId)
    .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0))[0] ?? null;
}

export function purgeAuditJobs(auditId: number): boolean {
  const activeJob = [...jobs.values()].find((job) => job.auditId === auditId && job.status === "running");
  if (activeJob) return false;

  for (const [id, job] of jobs.entries()) {
    if (job.auditId === auditId) jobs.delete(id);
  }

  for (let index = queue.length - 1; index >= 0; index -= 1) {
    if (queue[index]?.auditId === auditId) queue.splice(index, 1);
  }

  return true;
}

async function drainQueue(): Promise<void> {
  if (active) return;
  active = true;

  while (queue.length > 0) {
    const job = queue.shift()!;
    job.status = "running";
    job.startedAt = new Date();
    try {
      if (job.kind === "full_audit") await runFullAuditJob(job);
      else await generateArtifacts(job, { forceRegenerate: true });
      job.status = "complete";
      job.step = "Complete";
      job.completedAt = new Date();
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      job.status = "failed";
      job.error = msg;
      job.step = "Failed";
      job.completedAt = new Date();
      await setPhase(job.auditId, AuditPhase.FAILED);
      console.error(`[admin-job] ${job.id} failed: ${msg}`);
    }
  }

  active = false;
}

async function runFullAuditJob(job: AdminJob): Promise<void> {
  job.step = "Scraping Instagram and competitors";
  await runAudit({ auditId: job.auditId, tier: "full" });

  job.step = "Scoring account";
  await runScoring(job.auditId);
  await setPhase(job.auditId, AuditPhase.SCORING_COMPLETE);

  job.step = "Analyzing content patterns";
  await runPatternAnalysis(job.auditId);
  await setPhase(job.auditId, AuditPhase.CONTENT_PATTERNS_COMPLETE);

  job.step = "Enriching comments and local language";
  await runEnrichment(job.auditId);
  await setPhase(job.auditId, AuditPhase.ENRICHMENT_COMPLETE);

  await generateArtifacts(job, { forceRegenerate: false });
}

async function generateArtifacts(
  job: AdminJob,
  _options: { forceRegenerate: boolean },
): Promise<void> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, job.auditId)).limit(1));
  if (!audit) throw new Error(`Audit ${job.auditId} not found`);

  // The intelligence pipeline is the single source of client deliverables: it
  // builds the Gold Master, the field-guide report (md/html/pdf), and the
  // designed 20-page Blueprint — all from the scored/scraped data already in the
  // DB (non-live; no extra paid Apify run). See generateGoldMaster.
  job.step = "Building intelligence report + Blueprint";
  const result = await generateGoldMaster(job.auditId);

  // Surface the client-facing artifacts on the audit page (distinguished by
  // path; theme stays "standard"). PDFs are best-effort, so only record what
  // actually exists on disk.
  const blueprintDir = path.dirname(result.paths.blueprint ?? path.resolve("reports", "intelligence", String(job.auditId), "blueprint", "blueprint.html"));
  const candidates: Array<ArtifactInput> = [
    { auditId: job.auditId, kind: "pdf", theme: "standard", filePath: path.join(blueprintDir, "Instagram Growth Blueprint.pdf") },
    { auditId: job.auditId, kind: "html", theme: "standard", filePath: result.paths.blueprint ?? "" },
    { auditId: job.auditId, kind: "pdf", theme: "standard", filePath: path.join(path.dirname(result.paths.report), "report.pdf") },
    { auditId: job.auditId, kind: "html", theme: "standard", filePath: result.paths.reportHtml },
    { auditId: job.auditId, kind: "markdown", theme: "standard", filePath: result.paths.report },
    { auditId: job.auditId, kind: "markdown", theme: "standard", filePath: result.paths.md },
  ];
  for (const a of candidates) {
    if (a.filePath && existsSync(path.resolve(process.cwd(), a.filePath))) await recordArtifact(a);
  }

  if (!result.passed) {
    const blocking = result.gm.validation.issues.filter((i) => i.severity === "blocking").map((i) => i.detail).join("; ");
    job.step = `Completed with validation warnings: ${blocking || "see validation report"}`;
  }
  await setPhase(job.auditId, AuditPhase.COMPLETE);
}

import { mkdirSync, writeFileSync } from "node:fs";
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
import { generateReport } from "../../services/report/reportOrchestrator.js";
import { generateHTMLReport } from "../../services/html-report/htmlGenerator.js";
import { generateMarpMarkdown } from "../../services/marp-report/marpGenerator.js";
import { convertDeck } from "../../services/marp-report/marpConverter.js";
import { recordArtifact } from "./reportArtifacts.js";

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
  options: { forceRegenerate: boolean },
): Promise<void> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, job.auditId)).limit(1));
  if (!audit) throw new Error(`Audit ${job.auditId} not found`);

  const reportsDir = path.resolve(process.cwd(), "reports");
  const marpDir = path.join(reportsDir, "marp");
  mkdirSync(reportsDir, { recursive: true });
  mkdirSync(marpDir, { recursive: true });

  job.step = "Generating report sections";
  const report = await generateReport(job.auditId, { forceRegenerate: options.forceRegenerate });
  const mdPath = path.join(reportsDir, `audit-${job.auditId}.md`);
  writeFileSync(mdPath, report.compiledMarkdown, "utf-8");
  await recordArtifact({ auditId: job.auditId, kind: "markdown", theme: "standard", filePath: mdPath });

  job.step = "Rendering HTML report";
  const html = await generateHTMLReport(job.auditId);
  const htmlPath = path.join(reportsDir, `audit-${job.auditId}.html`);
  writeFileSync(htmlPath, html, "utf-8");
  await recordArtifact({ auditId: job.auditId, kind: "html", theme: "standard", filePath: htmlPath });

  job.step = "Building action workbook (light)";
  const lightMdPath = path.join(marpDir, `audit-${job.auditId}-light.md`);
  writeFileSync(lightMdPath, await generateMarpMarkdown(job.auditId, "light"), "utf-8");
  await recordArtifact({ auditId: job.auditId, kind: "markdown", theme: "light", filePath: lightMdPath });
  const light = await convertDeck(lightMdPath, marpDir, `audit-${job.auditId}-light`, "themes/botlogix-light.css");
  await recordArtifact({ auditId: job.auditId, kind: "pdf", theme: "light", filePath: light.pdf });
  await recordArtifact({ auditId: job.auditId, kind: "html", theme: "light", filePath: light.html });
  await recordArtifact({ auditId: job.auditId, kind: "pptx", theme: "light", filePath: light.pptx });

  job.step = "Building dark deck export";
  const darkMdPath = path.join(marpDir, `audit-${job.auditId}-dark.md`);
  writeFileSync(darkMdPath, await generateMarpMarkdown(job.auditId, "dark"), "utf-8");
  await recordArtifact({ auditId: job.auditId, kind: "markdown", theme: "dark", filePath: darkMdPath });
  const dark = await convertDeck(darkMdPath, marpDir, `audit-${job.auditId}-dark`, "themes/botlogix-dark.css");
  await recordArtifact({ auditId: job.auditId, kind: "pdf", theme: "dark", filePath: dark.pdf });
  await recordArtifact({ auditId: job.auditId, kind: "html", theme: "dark", filePath: dark.html });
  await recordArtifact({ auditId: job.auditId, kind: "pptx", theme: "dark", filePath: dark.pptx });

  await setPhase(job.auditId, AuditPhase.COMPLETE);
}

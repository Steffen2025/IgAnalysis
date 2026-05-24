import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { audits } from "../../db/schema.js";

export const AuditPhase = {
  CREATED: "CREATED",
  CLIENT_PROFILE: "CLIENT_PROFILE",
  CLIENT_POSTS: "CLIENT_POSTS",
  LOCAL_DISCOVERY: "LOCAL_DISCOVERY",
  REFERENCE_DISCOVERY: "REFERENCE_DISCOVERY",
  COMPETITORS_QUEUED: "COMPETITORS_QUEUED",
  COMPETITORS_DONE: "COMPETITORS_DONE",
  HASHTAGS_DONE: "HASHTAGS_DONE",
  READY_FOR_ANALYSIS: "READY_FOR_ANALYSIS",
  SCORING_COMPLETE: "SCORING_COMPLETE",
  CONTENT_PATTERNS_COMPLETE: "CONTENT_PATTERNS_COMPLETE",
  ENRICHMENT_COMPLETE: "ENRICHMENT_COMPLETE",
  REPORT_GENERATED: "REPORT_GENERATED",
  ANALYZING: "ANALYZING",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
} as const;
export type AuditPhase = (typeof AuditPhase)[keyof typeof AuditPhase];

type AuditStatus = "queued" | "scraping" | "analyzing" | "complete" | "failed";

function phaseToStatus(phase: AuditPhase): AuditStatus {
  switch (phase) {
    case AuditPhase.CREATED:
      return "queued";
    case AuditPhase.CLIENT_PROFILE:
    case AuditPhase.CLIENT_POSTS:
    case AuditPhase.LOCAL_DISCOVERY:
    case AuditPhase.REFERENCE_DISCOVERY:
    case AuditPhase.COMPETITORS_QUEUED:
    case AuditPhase.COMPETITORS_DONE:
    case AuditPhase.HASHTAGS_DONE:
      return "scraping";
    case AuditPhase.READY_FOR_ANALYSIS:
    case AuditPhase.SCORING_COMPLETE:
    case AuditPhase.CONTENT_PATTERNS_COMPLETE:
    case AuditPhase.ENRICHMENT_COMPLETE:
    case AuditPhase.REPORT_GENERATED:
    case AuditPhase.ANALYZING:
      return "analyzing";
    case AuditPhase.COMPLETE:
      return "complete";
    case AuditPhase.FAILED:
      return "failed";
  }
}

export function setPhase(auditId: number, phase: AuditPhase): void {
  db.update(audits)
    .set({ status_detail: phase, status: phaseToStatus(phase) })
    .where(eq(audits.id, auditId))
    .run();
}

export function getPhase(auditId: number): AuditPhase {
  const rows = db
    .select({ status_detail: audits.status_detail })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1)
    .all();
  const sd = rows[0]?.status_detail;
  return (sd as AuditPhase) ?? AuditPhase.CREATED;
}

export function canResume(auditId: number): boolean {
  const rows = db
    .select({ status: audits.status })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1)
    .all();
  const s = rows[0]?.status;
  return s === "failed" || s === "scraping";
}

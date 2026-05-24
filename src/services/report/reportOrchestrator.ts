import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { report_sections } from "../../db/schema.js";
import { AuditPhase, setPhase } from "../audit/auditState.js";
import { assembleReportData } from "./reportDataAssembler.js";
import { loadSection } from "./sectionPersist.js";
import { generateAccountSnapshot, SECTION_KEY as K_SNAPSHOT } from "./sections/accountSnapshot.js";
import { generatePatternAnalysis, SECTION_KEY as K_PATTERN } from "./sections/patternAnalysisNarrative.js";
import { generateAudienceVoice, SECTION_KEY as K_AUDIENCE } from "./sections/audienceVoice.js";
import { generateLocalVisibilityPlan, SECTION_KEY as K_LOCAL } from "./sections/localVisibilityPlan.js";
import { generateTop5Fixes, SECTION_KEY as K_FIXES } from "./sections/top5Fixes.js";
import { generateNext7Days, SECTION_KEY as K_NEXT7 } from "./sections/next7Days.js";
import { generateContentExecutionKit, SECTION_KEY as K_CONTENT } from "./sections/contentExecutionKit.js";
import { generateDoThisNext, SECTION_KEY as K_DONEXT } from "./sections/doThisNext.js";
import { generateOnePageBattlePlan, SECTION_KEY as K_BATTLE } from "./sections/onePageBattlePlan.js";

export interface GenerateReportResult {
  auditId: number;
  sections: Record<string, string>;
  compiledMarkdown: string;
  generatedAt: Date;
  cacheStats: { cached: number; fresh: number };
  errors: string[];
}

const SECTION_ORDER_FINAL = [
  K_BATTLE,
  K_SNAPSHOT,
  K_FIXES,
  K_NEXT7,
  K_PATTERN,
  K_AUDIENCE,
  K_LOCAL,
  K_CONTENT,
  K_DONEXT,
];

const SECTION_HEADINGS: Record<string, string> = {
  [K_BATTLE]: "## One-Page Battle Plan",
  [K_SNAPSHOT]: "## Account Snapshot",
  [K_FIXES]: "## Top 5 Fixes",
  [K_NEXT7]: "## Next 7 Days",
  [K_PATTERN]: "## Content Pattern Analysis",
  [K_AUDIENCE]: "## Audience Voice",
  [K_LOCAL]: "## Local Visibility Plan",
  [K_CONTENT]: "## Content Execution Kit",
  [K_DONEXT]: "## Do This Next",
};

export async function generateReport(
  auditId: number,
  options?: { forceRegenerate?: boolean },
): Promise<GenerateReportResult> {
  const errors: string[] = [];
  const sections: Record<string, string> = {};
  let cached = 0;
  let fresh = 0;

  const forceRegen = options?.forceRegenerate ?? false;

  // If force-regenerating, wipe existing sections for this audit
  if (forceRegen) {
    db.delete(report_sections).where(eq(report_sections.audit_id, auditId)).run();
    console.log(`  [report] Force-regenerating all sections for audit ${auditId}`);
  }

  // Assemble data once
  const data = await assembleReportData(auditId);

  // Helper: run a section generator, falling back to cached if already persisted
  async function runSection(
    key: string,
    generator: () => Promise<string>,
  ): Promise<void> {
    if (!forceRegen) {
      const existing = loadSection(auditId, key);
      if (existing) {
        sections[key] = existing;
        cached++;
        console.log(`  [${key}] cached (${existing.length} chars)`);
        return;
      }
    }
    try {
      const result = await generator();
      sections[key] = result;
      fresh++;
      console.log(`  [${key}] generated (${result.length} chars)`);
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      errors.push(`${key}: ${msg}`);
      sections[key] = `_Section unavailable — see logs: ${msg}_`;
      console.error(`  [${key}] FAILED: ${msg}`);
    }
  }

  // ── Phase 1: parallel sections 1-8 ─────────────────────────────────────────
  await Promise.all([
    runSection(K_SNAPSHOT, () => generateAccountSnapshot(data)),
    runSection(K_PATTERN, () => generatePatternAnalysis(data)),
    runSection(K_AUDIENCE, () => generateAudienceVoice(data)),
    runSection(K_LOCAL, () => generateLocalVisibilityPlan(data)),
    runSection(K_FIXES, () => generateTop5Fixes(data)),
    runSection(K_NEXT7, () => generateNext7Days(data, sections[K_FIXES])),
    runSection(K_CONTENT, () => generateContentExecutionKit(data)),
    runSection(K_DONEXT, () => generateDoThisNext(data)),
  ]);

  // ── Phase 2: battle plan (depends on prior sections) ────────────────────────
  await runSection(K_BATTLE, () => generateOnePageBattlePlan(data, sections));

  // ── Compile markdown ────────────────────────────────────────────────────────
  const header = [
    `# Instagram Growth Audit`,
    `**${data.audit.business_name ?? "Business"}** · @${data.client.profile?.username ?? "unknown"} · ${data.audit.city ?? ""}`,
    `**Overall Score: ${data.scores.overall ?? "n/a"}/100** · Audit #${auditId} · ${new Date().toLocaleDateString("en-CA")}`,
    "",
    "---",
    "",
  ].join("\n");

  const body = SECTION_ORDER_FINAL.map((key) => {
    const heading = SECTION_HEADINGS[key] ?? `## ${key}`;
    const content = sections[key] ?? "_Section unavailable_";
    return `${heading}\n\n${content}`;
  }).join("\n\n---\n\n");

  const compiledMarkdown = header + body;

  // ── Phase advance ────────────────────────────────────────────────────────────
  try {
    setPhase(auditId, AuditPhase.REPORT_GENERATED);
  } catch (err) {
    errors.push(`setPhase: ${(err as Error).message}`);
  }

  console.log(`\n  Report complete: ${cached} cached / ${fresh} generated fresh / ${errors.length} errors`);

  return {
    auditId,
    sections,
    compiledMarkdown,
    generatedAt: new Date(),
    cacheStats: { cached, fresh },
    errors,
  };
}

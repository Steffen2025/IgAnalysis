import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { report_sections } from "../../db/schema.js";

export async function persistSection(
  auditId: number,
  sectionKey: string,
  markdown: string,
): Promise<void> {
  // Rough token estimate: 1 token ≈ 4 chars
  const tokenCount = Math.round(markdown.length / 4);

  // Delete existing
  await db.delete(report_sections)
    .where(
      and(
        eq(report_sections.audit_id, auditId),
        eq(report_sections.section_key, sectionKey),
      ),
    );

  await db.insert(report_sections)
    .values({
      audit_id: auditId,
      section_key: sectionKey,
      content_markdown: markdown,
      token_count: tokenCount,
      generated_at: new Date().toISOString(),
    });
}

export async function loadSection(auditId: number, sectionKey: string): Promise<string | null> {
  const row = await first(db
    .select()
    .from(report_sections)
    .where(
      and(
        eq(report_sections.audit_id, auditId),
        eq(report_sections.section_key, sectionKey),
      ),
    )
    .limit(1));
  return row?.content_markdown ?? null;
}

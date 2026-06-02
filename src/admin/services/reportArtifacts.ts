import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { report_artifacts, type ReportArtifact } from "../../db/schema.js";

export interface ArtifactInput {
  auditId: number;
  kind: "markdown" | "html" | "pdf" | "pptx" | "png";
  theme: "dark" | "light" | "standard";
  filePath: string;
}

export function normalizeArtifactPath(filePath: string): string {
  return path.relative(process.cwd(), path.resolve(process.cwd(), filePath)).replace(/\\/g, "/");
}

export async function recordArtifact(input: ArtifactInput): Promise<void> {
  const normalized = normalizeArtifactPath(input.filePath);
  const absolute = path.resolve(process.cwd(), normalized);
  const size = existsSync(absolute) ? statSync(absolute).size : null;

  await db.delete(report_artifacts)
    .where(
      and(
        eq(report_artifacts.audit_id, input.auditId),
        eq(report_artifacts.path, normalized),
      ),
    );

  await db.insert(report_artifacts)
    .values({
      audit_id: input.auditId,
      kind: input.kind,
      theme: input.theme,
      path: normalized,
      size_bytes: size,
    });
}

export async function listRecordedArtifacts(auditId: number): Promise<ReportArtifact[]> {
  return db
    .select()
    .from(report_artifacts)
    .where(eq(report_artifacts.audit_id, auditId));
}

export async function findRecordedArtifact(artifactId: number): Promise<ReportArtifact | null> {
  return await first(db
    .select()
    .from(report_artifacts)
    .where(eq(report_artifacts.id, artifactId))
    .limit(1)) ?? null;
}

export function inferExistingArtifacts(auditId: number): Array<{ label: string; path: string; size: number }> {
  const found: Array<{ label: string; path: string; size: number }> = [];
  const dirs = ["reports", "reports/marp"];

  for (const dir of dirs) {
    const absoluteDir = path.resolve(process.cwd(), dir);
    if (!existsSync(absoluteDir)) continue;
    for (const file of readdirSync(absoluteDir)) {
      const lower = file.toLowerCase();
      if (!lower.includes(`audit-${auditId}`) && !lower.startsWith(`${auditId}-`)) continue;
      if (!/\.(md|html|pdf|pptx|png)$/i.test(file)) continue;
      const rel = path.join(dir, file).replace(/\\/g, "/");
      found.push({
        label: file,
        path: rel,
        size: statSync(path.resolve(process.cwd(), rel)).size,
      });
    }
  }

  return found.sort((a, b) => a.path.localeCompare(b.path));
}

export function deleteAuditFiles(auditId: number): number {
  const candidates = new Map<string, string>();
  for (const artifact of inferExistingArtifacts(auditId)) {
    candidates.set(artifact.path, artifact.path);
  }
  for (const artifact of candidates.values()) {
    const absolute = safeResolveRelativePath(artifact);
    if (!absolute) continue;
    rmSync(absolute, { force: true });
  }
  let removed = candidates.size;

  // Also remove the intelligence pipeline output folder (Gold Master, client
  // report, and the generated Blueprint live under reports/intelligence/<id>/).
  const intelDir = path.resolve(process.cwd(), "reports", "intelligence", String(auditId));
  if (existsSync(intelDir)) {
    rmSync(intelDir, { recursive: true, force: true });
    removed += 1;
  }
  return removed;
}

export function safeResolveRelativePath(relativePath: string): string | null {
  const normalized = normalizeArtifactPath(relativePath);
  const allowedRoots = ["reports/", "reports\\", "reports"];
  if (!allowedRoots.some((root) => normalized === root || normalized.startsWith(root.replace(/\\/g, "/")))) {
    return null;
  }
  const absolute = path.resolve(process.cwd(), normalized);
  if (!existsSync(absolute)) return null;
  return absolute;
}

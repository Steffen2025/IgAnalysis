import { eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { audits, posts, type Audit } from "../../../db/schema.js";

/** City-specific nickname/variant table — extend as needed. */
const CITY_VARIANTS: Record<string, string[]> = {
  toronto: ["TO", "the 6ix", "the 6", "the six", "yyz"],
  "new york": ["NYC", "the big apple", "new york city"],
  "los angeles": ["LA", "la"],
  "san francisco": ["SF", "the bay", "frisco"],
  chicago: ["the windy city", "chitown", "chi-town"],
  vancouver: ["YVR", "van city"],
  montreal: ["MTL"],
  calgary: ["YYC", "cowtown"],
  austin: ["ATX"],
  portland: ["PDX"],
};

/** Build the per-audit set of local terms to substring-match against captions. */
export function buildLocalTerms(audit: Pick<Audit, "city" | "service_area">): string[] {
  const terms = new Set<string>();
  const add = (raw: string | null | undefined) => {
    if (!raw) return;
    const v = raw.trim();
    if (v.length >= 2) terms.add(v.toLowerCase());
  };

  add(audit.city);
  if (audit.city) {
    const variants = CITY_VARIANTS[audit.city.toLowerCase()];
    if (variants) for (const v of variants) add(v);
  }

  if (audit.service_area) {
    for (const part of audit.service_area.split(/[,;]+/)) add(part.trim());
  }

  // Drop tokens that are too short to safely substring-match in English captions.
  // Short standalone tokens like "to" (TO=Toronto), "on" (ON=Ontario), "la", "sf"
  // create massive false positives. Keep them only if they contain a space (e.g.
  // "the 6", "the bay" — those word boundaries protect against accidental matches).
  return [...terms].filter((t) => t.length >= 4 || t.includes(" "));
}

export interface EnhanceResult {
  auditId: number;
  postsScanned: number;
  postsFlagged: number;
  terms: string[];
}

export function enhanceLocalReferences(auditId: number): EnhanceResult {
  const audit = db.select().from(audits).where(eq(audits.id, auditId)).limit(1).all()[0];
  if (!audit) throw new Error(`enhanceLocalReferences: audit ${auditId} not found`);

  const terms = buildLocalTerms(audit);
  const all = db.select().from(posts).where(eq(posts.audit_id, auditId)).all();

  let flagged = 0;
  for (const p of all) {
    const cap = (p.caption ?? "").toLowerCase();
    const hit = terms.some((t) => cap.includes(t));
    if (hit !== !!p.has_local_reference) {
      db.update(posts)
        .set({ has_local_reference: hit })
        .where(eq(posts.id, p.id))
        .run();
    }
    if (hit) flagged++;
  }

  return { auditId, postsScanned: all.length, postsFlagged: flagged, terms };
}

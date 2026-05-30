import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { audits, competitors, posts } from "../../db/schema.js";

export interface HashtagHygieneResult {
  avgCountPerPost: number;
  countAssessment: "too_few" | "in_range" | "too_many";
  brandPollutionDetected: string[];
  clientUsesOwnGeo: boolean;
  topClientHashtags: string[];
  notes: string[];
}

export async function checkHashtagHygiene(auditId: number): Promise<HashtagHygieneResult> {
  const audit = await first(db.select().from(audits).where(eq(audits.id, auditId)).limit(1));
  if (!audit) throw new Error(`checkHashtagHygiene: audit ${auditId} not found`);

  const clientPosts = await db.select().from(posts).where(eq(posts.audit_id, auditId));

  const isValidTag = (h: unknown): h is string =>
    typeof h === "string" && h.replace(/^#/, "").length >= 3 && !/^\d+$/.test(h.replace(/^#/, ""));

  // ── Average hashtag count per post ─────────────────────────────────────────
  const counts = clientPosts.map((p) => {
    if (!p.hashtags) return 0;
    try { return (JSON.parse(p.hashtags) as unknown[]).filter(isValidTag).length; } catch { return 0; }
  });
  const avgCount = counts.length > 0 ? counts.reduce((s, v) => s + v, 0) / counts.length : 0;

  const countAssessment: HashtagHygieneResult["countAssessment"] =
    avgCount < 5 ? "too_few" : avgCount > 18 ? "too_many" : "in_range";

  // ── Collect all client hashtags ────────────────────────────────────────────
  const tagFreq: Record<string, number> = {};
  for (const p of clientPosts) {
    if (!p.hashtags) continue;
    try {
      const tags = (JSON.parse(p.hashtags) as unknown[]).filter(isValidTag);
      for (const t of tags) {
        const norm = t.toLowerCase().replace(/^#/, "");
        tagFreq[norm] = (tagFreq[norm] ?? 0) + 1;
      }
    } catch { /* skip */ }
  }

  const topClientHashtags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => "#" + t);

  // ── Brand pollution detection ──────────────────────────────────────────────
  const allComps = await db
    .select({ username: competitors.username })
    .from(competitors)
    .where(eq(competitors.audit_id, auditId));

  const compUsernames = allComps.map((c) => c.username.toLowerCase());
  const brandPollutionDetected: string[] = [];

  for (const tag of Object.keys(tagFreq)) {
    for (const uname of compUsernames) {
      if (tag.includes(uname)) {
        brandPollutionDetected.push("#" + tag);
        break;
      }
    }
  }

  // ── Client uses own geo ────────────────────────────────────────────────────
  const cityLower = (audit.city ?? "").toLowerCase();
  const serviceAreaWords = (audit.service_area ?? "")
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter((w) => w.length >= 4);

  const geoVariants = [cityLower, ...serviceAreaWords].filter(Boolean);
  const clientUsesOwnGeo = Object.keys(tagFreq).some((tag) =>
    geoVariants.some((geo) => tag.includes(geo)),
  );

  // ── Human-readable notes ───────────────────────────────────────────────────
  const notes: string[] = [];

  if (countAssessment === "too_few") {
    notes.push(`Avg ${avgCount.toFixed(1)} hashtags/post is below the recommended minimum of 5. Expand hashtag usage to increase discoverability.`);
  } else if (countAssessment === "too_many") {
    notes.push(`Avg ${avgCount.toFixed(1)} hashtags/post exceeds 18. Instagram may suppress reach for excessive hashtag use.`);
  } else {
    notes.push(`Avg ${avgCount.toFixed(1)} hashtags/post is in a healthy range (5–18).`);
  }

  if (brandPollutionDetected.length > 0) {
    notes.push(`Brand pollution detected: ${brandPollutionDetected.join(", ")} — these are competitor-branded tags. Using them sends your content to their branded searches.`);
  }

  if (!clientUsesOwnGeo && cityLower) {
    notes.push(`Client does not use any hashtag containing "${audit.city}" — missing easy local discoverability. Add #${cityLower} or #${cityLower}eats / #${cityLower}food to posts.`);
  } else if (clientUsesOwnGeo) {
    notes.push(`Client uses at least one geo-anchored hashtag containing "${audit.city}". Good — this anchors content to local searches.`);
  }

  return {
    avgCountPerPost: avgCount,
    countAssessment,
    brandPollutionDetected,
    clientUsesOwnGeo,
    topClientHashtags,
    notes,
  };
}

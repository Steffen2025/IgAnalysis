import type { Teardown, TeardownContent } from "../../db/schema.js";

// The Data Integrity Report is the trust contract for every teardown: it states
// exactly what was captured, what fell short, and what Instagram simply does not
// expose to scraping. Data integrity is the first principle of this tool, so this
// report is generated on every run and shipped alongside the dataset.

export interface ContentIntegrity {
  requested: number;
  captured: number;
  shortfall: number;
  byType: Record<string, number>;
  withCover: number;
  withVideoUrl: number;
  withEngagementRate: number;
  missingShortcode: number;
  duplicateShortcodes: number;
  missingCaption: number;
  missingTimestamp: number;
}

export interface IntegrityReport {
  handle: string;
  capturedAt: string;
  profileCaptured: boolean;
  profileMissingFields: string[];
  content: ContentIntegrity;
  unavailableMetrics: string[];
  notes: string[];
  partialFlags: string[];
}

// Metrics Instagram does not expose to public scraping. Stated plainly so the
// downstream analysis never fabricates them.
const UNAVAILABLE_METRICS = [
  "saves (private to the account owner)",
  "shares / sends (private)",
  "reach & impressions (private)",
  "profile visits & link clicks (private)",
  "follower-growth history (only the current follower count is observable; growth is built forward from daily snapshots in the cohort tracker)",
];

const PROFILE_FIELDS: Array<[keyof Teardown, string]> = [
  ["full_name", "full_name"],
  ["bio", "bio"],
  ["follower_count", "follower_count"],
  ["following_count", "following_count"],
  ["post_count", "post_count"],
  ["category", "category"],
];

export function buildIntegrityReport(
  teardown: Teardown,
  content: TeardownContent[],
): IntegrityReport {
  const requested = teardown.requested_count ?? teardown.content_window ?? 0;
  const captured = content.length;

  const byType: Record<string, number> = {};
  const seenShortcodes = new Set<string>();
  let duplicateShortcodes = 0;
  let missingShortcode = 0;
  let withCover = 0;
  let withVideoUrl = 0;
  let withEngagementRate = 0;
  let missingCaption = 0;
  let missingTimestamp = 0;

  for (const c of content) {
    byType[c.content_type] = (byType[c.content_type] ?? 0) + 1;
    if (c.shortcode) {
      if (seenShortcodes.has(c.shortcode)) duplicateShortcodes += 1;
      seenShortcodes.add(c.shortcode);
    } else {
      missingShortcode += 1;
    }
    if (c.cover_url) withCover += 1;
    if (c.video_url) withVideoUrl += 1;
    if (c.engagement_rate !== null && c.engagement_rate !== undefined) {
      withEngagementRate += 1;
    }
    if (!c.caption) missingCaption += 1;
    if (!c.posted_at) missingTimestamp += 1;
  }

  const profileMissingFields = PROFILE_FIELDS.filter(
    ([key]) => teardown[key] === null || teardown[key] === undefined,
  ).map(([, label]) => label);

  const notes: string[] = [];
  const shortfall = Math.max(0, requested - captured);
  if (shortfall > 0) {
    notes.push(
      `Requested ${requested} content items but captured ${captured}. ` +
        `Shortfall of ${shortfall} usually means the account has fewer public posts than the window, ` +
        `or Instagram paginated short. Not treated as failure unless captured is 0.`,
    );
  }
  if (teardown.follower_count == null) {
    notes.push(
      "Follower count was not captured, so engagement_rate could not be computed for any item.",
    );
  }
  notes.push(
    "Stories are not captured in this milestone (M1); best-effort authenticated story capture arrives in a later milestone.",
  );

  return {
    handle: teardown.target_handle ?? teardown.target_url,
    capturedAt: teardown.completed_at ?? new Date().toISOString(),
    profileCaptured: teardown.follower_count != null || teardown.bio != null,
    profileMissingFields,
    content: {
      requested,
      captured,
      shortfall,
      byType,
      withCover,
      withVideoUrl,
      withEngagementRate,
      missingShortcode,
      duplicateShortcodes,
      missingCaption,
      missingTimestamp,
    },
    unavailableMetrics: UNAVAILABLE_METRICS,
    notes,
    partialFlags: safeParseFlags(teardown.partial_flags),
  };
}

function safeParseFlags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function renderIntegrityMarkdown(report: IntegrityReport): string {
  const c = report.content;
  const typeRows = Object.entries(c.byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `| ${type} | ${n} |`)
    .join("\n");

  const lines = [
    `# Data Integrity Report — @${report.handle}`,
    "",
    `_Generated ${report.capturedAt}_`,
    "",
    "## Profile capture",
    "",
    `- Profile captured: **${report.profileCaptured ? "yes" : "no"}**`,
    report.profileMissingFields.length
      ? `- Missing profile fields: ${report.profileMissingFields.join(", ")}`
      : "- Missing profile fields: none",
    "",
    "## Content capture",
    "",
    `- Requested: **${c.requested}**`,
    `- Captured: **${c.captured}**`,
    `- Shortfall: **${c.shortfall}**`,
    "",
    "| Content type | Count |",
    "| --- | --- |",
    typeRows || "| (none) | 0 |",
    "",
    "### Field completeness",
    "",
    `- With cover image: ${c.withCover}/${c.captured}`,
    `- With video URL (reels/videos): ${c.withVideoUrl}/${c.captured}`,
    `- With engagement rate: ${c.withEngagementRate}/${c.captured}`,
    `- Missing shortcode: ${c.missingShortcode}`,
    `- Duplicate shortcodes (deduped on persist): ${c.duplicateShortcodes}`,
    `- Missing caption: ${c.missingCaption}`,
    `- Missing timestamp: ${c.missingTimestamp}`,
    "",
    "## Metrics Instagram does not expose",
    "",
    ...report.unavailableMetrics.map((m) => `- ${m}`),
    "",
    "## Notes",
    "",
    ...report.notes.map((n) => `- ${n}`),
  ];

  if (report.partialFlags.length) {
    lines.push("", "## Partial / failure flags", "");
    lines.push(...report.partialFlags.map((f) => `- ${f}`));
  }

  return lines.join("\n") + "\n";
}

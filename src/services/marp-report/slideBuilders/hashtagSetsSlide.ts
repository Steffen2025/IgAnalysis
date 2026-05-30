import type { ReportData } from "../../report/reportDataAssembler.js";
import { guessRegionFromServiceArea } from "../../audit/referenceMarkets.js";

function e(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function extractHashtagsFromMd(md: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const m of md.matchAll(/#([A-Za-z][A-Za-z0-9_]+)/g)) {
    const tag = `#${m[1]}`;
    if (!seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }
  return tags;
}

function chips(tags: string[]): string {
  return tags.length
    ? tags.map((t) => `<span class="hashtag-chip">${e(t)}</span>`).join("")
    : `<span class="hashtag-chip hashtag-chip-muted">Add tags from your local plan</span>`;
}

const GEO_VARIANTS: Record<string, string[]> = {
  burlington: ["burlington", "burlon", "burlingtonon", "halton"],
  hamilton: ["hamilton", "hamont", "thehammer"],
  toronto: ["toronto", "the6", "the6ix", "yyz", "thesix"],
  vaughan: ["vaughan", "vaughanon"],
  calgary: ["calgary", "yyc"],
};

const REGION_NAMES: Record<string, string> = {
  ON: "ontario",
  VT: "vermont",
  NY: "newyork",
  CA: "california",
};

function cityVariants(city: string, serviceArea: string | null | undefined): string[] {
  const citySlug = city.toLowerCase().replace(/\s+/g, "");
  const region = guessRegionFromServiceArea(serviceArea)?.toLowerCase() ?? "";
  const regionName = region ? REGION_NAMES[region.toUpperCase()] ?? "" : "";
  return Array.from(
    new Set([
      citySlug,
      ...(region ? [`${citySlug}${region}`] : []),
      ...(regionName ? [`${citySlug}${regionName}`] : []),
      ...(GEO_VARIANTS[citySlug] ?? []),
    ].filter(Boolean)),
  );
}

function isLocalTag(tag: string, variants: string[]): boolean {
  const normalized = tag.toLowerCase().replace(/^#/, "").replace(/[^a-z0-9]/g, "");
  return variants.some((variant) => normalized.includes(variant));
}

function constructedLocalTags(city: string, serviceArea: string | null | undefined): string[] {
  const citySlug = city.toLowerCase().replace(/\s+/g, "");
  if (!citySlug) return [];
  const region = guessRegionFromServiceArea(serviceArea)?.toLowerCase() ?? "";
  const regionName = region ? REGION_NAMES[region.toUpperCase()] ?? "" : "";
  return [
    region ? `#${citySlug}${region}` : `#${citySlug}`,
    regionName ? `#${citySlug}${regionName}` : "",
    `#${citySlug}business`,
    `#${citySlug}smallbusiness`,
  ].filter(Boolean);
}

function titleSlug(value: string): string {
  return value
    .replace(/&/g, " and ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function categoryIntentTags(category: string, city: string, region: string): string[] {
  const cityTitle = titleSlug(city);
  const regionTitle = titleSlug(region);
  const lower = category.toLowerCase();

  if (lower.includes("mortgage")) {
    return [`#${cityTitle}MortgageBroker`, `#${regionTitle}MortgageTips`, `#FirstTimeBuyer${regionTitle}`, `#HomeBuying${regionTitle}`];
  }
  if (lower.includes("marketing") || lower.includes("digital")) {
    return [`#${cityTitle}Marketing`, `#${cityTitle}SmallBusiness`, `#${regionTitle}Business`, `#SocialMedia${cityTitle}`, `#LocalBusiness${cityTitle}`];
  }
  if (lower.includes("real estate") || lower.includes("realtor")) {
    return [`#${cityTitle}RealEstate`, `#${cityTitle}Realtor`, `#${regionTitle}RealEstate`, `#BuyingIn${cityTitle}`];
  }
  return [
    `#${cityTitle}${titleSlug(category)}`,
    `#${cityTitle}SmallBusiness`,
    `#${regionTitle}${titleSlug(category)}`,
    `#Local${titleSlug(category)}`,
  ].filter(Boolean);
}

function audienceTags(category: string, city: string): string[] {
  const cityTitle = titleSlug(city);
  const lower = category.toLowerCase();
  if (lower.includes("marketing")) {
    return [`#SmallBusinessOwner`, `#${cityTitle}Entrepreneur`, `#ShopLocal${cityTitle}`, `#BusinessGrowth`];
  }
  return [`#${cityTitle}Locals`, `#SupportLocal`, `#SmallBusinessTips`, `#ShopLocal`];
}

function testTags(city: string, bizName: string): string[] {
  const cityTitle = titleSlug(city);
  return [`#${cityTitle}Test`, `#NewPost`, bizName ? `#${bizName}` : "", `#ContentTest`].filter(Boolean);
}

export function hashtagSetsSlide(data: ReportData, localMd: string): string {
  const city = data.reportContext.businessLocation.city;
  const region = data.reportContext.businessLocation.region;
  const categoryName = data.reportContext.businessClassification;
  const bizName = (data.audit.business_name ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

  const fromMd = extractHashtagsFromMd(localMd);
  const variants = cityVariants(city, data.audit.service_area);
  const discoveredLocal = fromMd.filter((tag) => isLocalTag(tag, variants));
  const localTags = Array.from(new Set([...constructedLocalTags(city, data.audit.service_area), ...discoveredLocal]))
    .filter((tag) => isLocalTag(tag, variants))
    .slice(0, 8);

  const service = Array.from(new Set(categoryIntentTags(categoryName, city, region))).slice(0, 8);
  const audience = audienceTags(categoryName, city).slice(0, 8);
  const authority = Array.from(
    new Set([
      `#${titleSlug(categoryName)}Tips`,
      `#${titleSlug(categoryName)}Advice`,
      `#${titleSlug(region)}Business`,
      `#AskA${titleSlug(categoryName)}`,
    ]),
  ).slice(0, 8);
  const test = testTags(city, bizName).slice(0, 6);

  const groups = [
    ["Local hashtags", "Where you operate — use on every post", localTags],
    ["Service hashtags", "What you sell — problem/FAQ posts", service],
    ["Audience hashtags", "Who you help", audience],
    ["Authority hashtags", "Educational / trust posts", authority],
    ["Test hashtags", "Rotate — do not repeat the same block daily", test],
  ] as const;

  return `<span class="eyebrow">Hashtag ecosystem</span>

# Hashtag sets that support discovery

<p>Hashtags will not save weak content, but they help Instagram understand <strong>location</strong>, <strong>topic</strong>, and <strong>audience</strong>.</p>

<div class="hashtag-groups">
${groups
  .map(
    ([label, hint, tags]) => `<div class="hashtag-group">
  <div class="hashtag-group-label">${e(label)}</div>
  <div class="hashtag-group-hint">${e(hint)}</div>
  <div class="hashtag-chips">${chips(tags)}</div>
</div>`,
  )
  .join("\n")}
</div>

<div class="guide-card full">
  <div class="kicker">Recommended daily mix</div>
  <div class="copy"><strong>3 local</strong> + <strong>3 service</strong> + <strong>2 audience</strong> + <strong>2 authority</strong>. Swap 1–2 test tags each week. Avoid pasting the exact same 30 tags on every post.</div>
</div>`;
}

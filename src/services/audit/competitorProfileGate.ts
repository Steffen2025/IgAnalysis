import {
  ACTORS,
  INPUT_TEMPLATES,
  normalizeProfile,
  runActorAndGetData,
  type NormalizedProfile,
} from "../apify/index.js";
import {
  TTL_PROFILE,
  getCached,
  makeCacheKey,
  setCached,
} from "../cache/cacheService.js";
import { canSpendApifyRun } from "./apifyBudget.js";

const MIN_LOCAL_FOLLOWERS = Number(process.env.COMPETITOR_MIN_LOCAL_FOLLOWERS ?? "150");
const MIN_REFERENCE_FOLLOWERS = Number(process.env.COMPETITOR_MIN_REFERENCE_FOLLOWERS ?? "400");
const MIN_POST_COUNT = Number(process.env.COMPETITOR_MIN_POST_COUNT ?? "3");

export interface ProfileGateResult {
  passed: boolean;
  reasons: string[];
  profile: NormalizedProfile | null;
  scraped: number;
  cacheHits: number;
}

function profileUrl(username: string): string {
  return `https://www.instagram.com/${username}/`;
}

export async function fetchCompetitorProfilePreview(
  auditId: number,
  username: string,
): Promise<{ profile: NormalizedProfile | null; scraped: number; cacheHits: number }> {
  const key = makeCacheKey("instagram_profile", username);
  let scraped = 0;
  let cacheHits = 0;

  const cached = await getCached<NormalizedProfile>(key);
  if (cached) {
    return { profile: cached, scraped, cacheHits: 1 };
  }

  if (!(await canSpendApifyRun(auditId, 1))) {
    console.warn(`Apify budget reached for audit ${auditId} — skipping profile gate @${username}`);
    return { profile: null, scraped, cacheHits };
  }

  const { items } = await runActorAndGetData({
    actorId: ACTORS.INSTAGRAM.id,
    actorLabel: `Profile gate @${username}`,
    auditId,
    input: {
      ...INPUT_TEMPLATES.INSTAGRAM_PROFILE_LOOKUP,
      directUrls: [profileUrl(username)],
    },
  });

  if (items.length === 0) {
    return { profile: null, scraped: items.length, cacheHits };
  }

  const raw = items[0] as { error?: unknown; errorDescription?: unknown };
  if (typeof raw.error === "string") {
    return { profile: null, scraped: items.length, cacheHits };
  }

  const profile = normalizeProfile(items[0]);
  scraped = items.length;
  await setCached(key, profile, TTL_PROFILE);
  return { profile, scraped, cacheHits };
}

export function evaluateProfileGate(
  profile: NormalizedProfile | null,
  competitorType: "local_intel" | "reference_model",
  businessCategory: string | null | undefined,
): ProfileGateResult {
  const reasons: string[] = [];
  if (!profile) {
    return { passed: false, reasons: ["no_profile_data"], profile: null, scraped: 0, cacheHits: 0 };
  }

  const followers = profile.follower_count ?? 0;
  const posts = profile.post_count ?? 0;
  const minFollowers =
    competitorType === "reference_model" ? MIN_REFERENCE_FOLLOWERS : MIN_LOCAL_FOLLOWERS;

  if (followers < minFollowers) {
    reasons.push(`low_followers:${followers}<${minFollowers}`);
  }
  if (posts < MIN_POST_COUNT) {
    reasons.push(`low_posts:${posts}<${MIN_POST_COUNT}`);
  }
  if (!profile.bio?.trim() && !profile.category?.trim()) {
    reasons.push("empty_profile");
  }

  const cat = (businessCategory ?? "").toLowerCase();
  if (/marketing|agency|digital|consult/.test(cat) && profile.is_business === false && followers < 2000) {
    reasons.push("likely_personal_account");
  }

  const passed = reasons.length === 0;
  return { passed, reasons, profile, scraped: 0, cacheHits: 0 };
}

export async function runProfileGate(
  auditId: number,
  username: string,
  competitorType: "local_intel" | "reference_model",
  businessCategory: string | null | undefined,
): Promise<ProfileGateResult> {
  const { profile, scraped, cacheHits } = await fetchCompetitorProfilePreview(auditId, username);
  const evaluation = evaluateProfileGate(profile, competitorType, businessCategory);
  return { ...evaluation, scraped, cacheHits };
}

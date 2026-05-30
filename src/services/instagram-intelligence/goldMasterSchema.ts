/**
 * Gold Master Intelligence — the structured source of truth for a report.
 *
 * Everything a renderer (PDF, HTML, slides) could need is here, fully typed.
 * No unstructured blobs except fields explicitly named `raw*`. The Gold Master
 * Markdown and JSON artifacts are produced directly from this object.
 *
 * This schema is category-agnostic: it must serve a moving app, a mortgage
 * broker, a restaurant, a SaaS product, etc. Nothing here is client-specific.
 */

export type CategoryKind = "app" | "service" | "professional" | "retail" | "creator" | "generic";

export interface ReportMeta {
  auditId: number;
  account: string;
  handle: string;
  website: string | null;
  rawCategory: string | null;
  normalizedCategory: string;
  categoryKind: CategoryKind;
  marketLabel: string;
  city: string;
  region: string;
  generatedAt: string;
  reviewDate: string;
  modelUsed: string;
  promptVersion: string;
  /** 0-100 confidence in the category/data foundation. */
  dataConfidence: number;
}

export interface AccountSnapshot {
  displayName: string;
  handle: string;
  bio: string | null;
  rawCategory: string | null;
  normalizedBusinessType: string;
  website: string | null;
  followerCount: number | null;
  postCount: number | null;
  postsPerWeek: number | null;
  profileGaps: string[];
  ctaStatus: string;
  localSignalStatus: string;
}

export interface CategoryDiagnosis {
  normalizedCategory: string;
  categoryKind: CategoryKind;
  confidence: number;
  source: "user_provided" | "raw" | "inferred" | "fallback";
  whatItSells: string;
  likelyAudience: string;
  contentThatWorks: string;
  ctaType: string;
  /** The recommended CTA verbs for this category. */
  ctaOptions: string[];
}

export interface ScoreDiagnosis {
  dimension: string;
  score: number;
  whatWeSaw: string;
  whyItMatters: string;
  nextMove: string;
}

export interface ActionMove {
  title: string;
  impact: "high" | "medium" | "low";
  effort: "high" | "medium" | "low";
  scoreArea: string;
  whyItMatters: string;
  exactAction: string;
  timeRequired: string;
  expectedLift: string;
  evidence: string;
}

export interface DayAction {
  day: number;
  objective: string;
  action: string;
  timeEstimate: string;
  exactInstruction: string;
  outputByEndOfDay: string;
  whyItMatters: string;
}

export interface WeekPlan {
  week: number;
  goal: string;
  actions: string[];
  output: string;
  measure: string;
}

export interface MetricComparison {
  metric: string;
  client: string;
  market: string;
}

export interface MarketComparison {
  rows: MetricComparison[];
  activityLevel: string;
  interpretation: string;
  /** Metric-aware cadence verdict. */
  cadenceVerdict: "increase" | "maintain" | "refine";
}

export interface DistributionEntry {
  label: string;
  pct: number;
}

export interface MarketPatterns {
  postsStudied: number;
  avgCaptionChars: number;
  avgHashtags: number;
  avgEmojis: number | null;
  topFormats: DistributionEntry[];
  hookDistribution: DistributionEntry[];
  contentElementDistribution: DistributionEntry[];
}

export type SelectionReasonCode =
  | "selected_category_match"
  | "selected_location_match"
  | "selected_keyword_match"
  | "selected_recent_activity"
  | "selected_reference_model"
  | "selected_content_overlap"
  | "rejected_category_mismatch"
  | "rejected_location_only_but_wrong_industry"
  | "rejected_random_high_follower_account"
  | "rejected_missing_relevance"
  | "rejected_known_invalid"
  | "rejected_low_confidence"
  | "rejected_insufficient_data"
  | "rejected_followers_out_of_band";

export type CompetitorTrack = "local" | "reference";

export interface CompetitorDecision {
  handle: string;
  track: CompetitorTrack;
  code: SelectionReasonCode;
  reason: string;
  categoryMatchScore: number;
  contentMatchScore: number;
  locationMatchScore: number;
  recencyScore: number;
  /** Cosine similarity ×100 when embeddings were used, else null. */
  embeddingScore: number | null;
  followerBandFit: number;
  /** "Doing well" signal: engagement + posting consistency + recency (0..100). */
  successScore: number;
  confidenceScore: number;
}

export interface CompetitorDebug {
  searchTermsUsed: string[];
  candidatesFound: number;
  selected: CompetitorDecision[];
  rejected: CompetitorDecision[];
  /** When empty: classify the failure for the human. */
  emptyReason: "search_problem" | "data_problem" | "relevance_filter" | "none" | null;
  recommendedSearchTerms: string[];
}

/** A local account (5k–50k) that's genuinely winning — for the local layer. */
export interface LocalSuccessStory {
  handle: string;
  followers: number | null;
  successScore: number;
  whatTheyDoWell: string;
}

/**
 * Local intelligence mined from the surrounding local business pool — usable
 * even when direct competitors are too thin. Captures the hashtags, spotlighted
 * accounts, and local wording that reach the same local interest group.
 */
export interface LocalSignal {
  successStories: LocalSuccessStory[];
  localHashtags: string[];
  spotlightedAccounts: string[];
  localWording: string[];
  complementaryTerms: string[];
  /** Explains the fallback when direct competitor data is thin. */
  note: string;
}

export interface CompetitorCard {
  handle: string;
  displayName: string;
  type: "local" | "reference";
  followers: number | null;
  posts: number | null;
  profileImageAvailable: boolean;
  latestPostAvailable: boolean;
  latestPostDate: string | null;
  activityStatus: string;
  latestPostType: string | null;
  latestPostHook: string | null;
  whySelected: string;
  borrow: string;
  avoid: string;
}

export interface ObservedPost {
  account: string;
  postType: string;
  hook: string;
  date: string | null;
  postUrl?: string | null;
  captionFirstLine?: string | null;
  thumbnailAvailable?: boolean;
  whyItWorks: string;
  howToAdapt: string;
  evidenceIds?: string[];
}

export interface ContentMechanic {
  pattern: string;
  whyItWorks: string;
  howToAdapt: string;
  examplePostIdea: string;
  whatNotToCopy: string;
}

export interface VisibilityMove {
  surface: string;
  recommendation: string;
}

export interface HashtagGroup {
  group: "local" | "category" | "audience" | "authority" | "branded" | "test";
  tags: string[];
}

export interface ToolkitSection {
  hookFormulas: string[];
  captionFormulas: string[];
  ctaOptions: string[];
  reelIdeas: string[];
  carouselIdeas: string[];
  proofIdeas: string[];
}

export interface PromptBlock {
  label: string;
  prompt: string;
}

export interface ImmediateContent {
  hooks: string[];
  captionTopics: string[];
  carouselIdeas: string[];
  reelIdeas: string[];
  storyIdeas: string[];
}

export interface QuickAction {
  when: "today" | "this_week" | "this_month" | "in_30_days";
  action: string;
}

export interface Checkpoint {
  dayMark: 7 | 14 | 30;
  measure: string;
  goodSign: string;
  adjustIf: string;
}

export interface Day30Plan {
  bringBack: string[];
  whatWeCompare: string[];
  whyMonthlyMatters: string;
  nextRunCta: string;
}

export interface DataGap {
  area: string;
  severity: "low" | "medium" | "high";
  detail: string;
  recommendedFix: string;
}

export interface ValidationIssue {
  rule: string;
  severity: "blocking" | "warning";
  detail: string;
}

export interface ValidationSummary {
  passed: boolean;
  blockingCount: number;
  warningCount: number;
  issues: ValidationIssue[];
}

/** A single piece of source evidence a recommendation can cite (section 23). */
export interface EvidenceItem {
  id: string;
  sourceType: "profile" | "post" | "competitor" | "score" | "market_pattern" | "llm" | "user_input";
  label: string;
  value: string | number | boolean;
  confidence: number;
}

/** Per-section confidence (section 24 / confidence.ts). */
export interface SectionConfidence {
  sectionId: string;
  score: number;
  level: "high" | "medium" | "low" | "blocked";
  reasons: string[];
  sourceCoverage: string[];
  dataGaps: string[];
}

export interface GoldMasterIntelligence {
  meta: ReportMeta;
  account: AccountSnapshot;
  category: CategoryDiagnosis;
  scores: ScoreDiagnosis[];
  fixes: ActionMove[];
  nextSevenDays: DayAction[];
  sprint: WeekPlan[];
  marketComparison: MarketComparison;
  marketPatterns: MarketPatterns;
  competitorDebug: CompetitorDebug;
  competitors: CompetitorCard[];
  localSignal: LocalSignal;
  observedPosts: ObservedPost[];
  contentMechanics: ContentMechanic[];
  visibilityStrategy: VisibilityMove[];
  hashtags: HashtagGroup[];
  toolkit: ToolkitSection;
  aiPrompts: PromptBlock[];
  immediateContent: ImmediateContent;
  quickActions: QuickAction[];
  measurement: Checkpoint[];
  day30: Day30Plan;
  dataGaps: DataGap[];
  evidence: EvidenceItem[];
  sectionConfidence: SectionConfidence[];
  overallConfidence: number;
  validation: ValidationSummary;
}

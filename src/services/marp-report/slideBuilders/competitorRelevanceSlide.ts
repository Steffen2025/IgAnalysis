import type { CompetitorVisualCard, WorkbookViewModel } from "../workbookViewModel.js";
import { activityBadgeClass, activityBadgeLabel } from "../utils/activity.js";
import { escapeHtml, formatRelativeDate } from "../utils/text.js";

function avatar(card: CompetitorVisualCard): string {
  if (card.cachedProfileImagePath) {
    return `<img class="rel-avatar" src="${escapeHtml(card.cachedProfileImagePath)}" alt="@${escapeHtml(card.handle)}">`;
  }
  return `<div class="rel-avatar rel-avatar-fallback">${escapeHtml(card.initials)}</div>`;
}

function postPreview(card: CompetitorVisualCard): string {
  if (card.cachedLatestPostImagePath) {
    return `<img class="rel-post-thumb" src="${escapeHtml(card.cachedLatestPostImagePath)}" alt="Latest post">`;
  }
  const typeLabel = card.latestPostType ? card.latestPostType : "post";
  return `<div class="rel-post-thumb rel-post-thumb-empty"><span>${escapeHtml(typeLabel)}</span></div>`;
}

function relevanceCard(card: CompetitorVisualCard): string {
  const ageLabel = card.latestPostDate ? formatRelativeDate(card.latestPostDate) : "Activity unknown";
  const typeChip = card.latestPostType
    ? `<span class="rel-type-chip">${escapeHtml(card.latestPostType)}</span>`
    : "";
  const hook = card.latestPostHook
    ? `<div class="rel-hook">“${escapeHtml(card.latestPostHook)}”</div>`
    : `<div class="rel-hook rel-hook-empty">Last caption not captured yet</div>`;

  return `<div class="relevance-card">
  <div class="rel-head">
    ${avatar(card)}
    <div class="rel-id">
      <div class="rel-handle">@${escapeHtml(card.handle)}</div>
      <div class="rel-name">${escapeHtml(card.displayName)}</div>
    </div>
    <span class="relevance-badge ${activityBadgeClass(card.activityStatus)}">${escapeHtml(activityBadgeLabel(card.activityStatus))}</span>
  </div>
  <div class="rel-stats"><span>${escapeHtml(card.followersLabel)} followers</span><span>${escapeHtml(card.postsLabel)} posts</span></div>
  <div class="rel-body">
    ${postPreview(card)}
    <div class="rel-latest">
      <div class="rel-latest-label">Last posted ${typeChip}</div>
      <div class="rel-latest-date">${escapeHtml(ageLabel)}</div>
      ${hook}
    </div>
  </div>
  <div class="rel-notes">
    <div class="rel-note"><span class="rel-note-tag">Why it matters</span> ${escapeHtml(card.doesWell)}</div>
    <div class="rel-note"><span class="rel-note-tag borrow">Borrow</span> ${escapeHtml(card.borrow)}</div>
    <div class="rel-note"><span class="rel-note-tag avoid">Avoid</span> ${escapeHtml(card.avoid)}</div>
  </div>
</div>`;
}

/**
 * Competitor Relevance Board — proves the market is alive: who's active, who
 * posted recently, who looks stale. Shows up to three accounts (local first).
 */
export function competitorRelevanceSlide(vm: WorkbookViewModel): string {
  const cards = vm.competitorRelevance.slice(0, 3);

  if (cards.length === 0) {
    return `<span class="eyebrow">Competitor relevance board</span>

# The market is moving

<p>Instagram rewards accounts that look alive — recent posts, clear profile signals, visible local activity.</p>

<div class="guide-card full">
  <div class="kicker">Data not captured yet</div>
  <div class="copy">We haven't locked in enough local competitor profiles for this market. Re-run the audit once discovery surfaces active ${escapeHtml(vm.meta.marketLabel)} accounts and this board fills with live profiles, last-posted dates, and activity badges.</div>
</div>`;
  }

  return `<span class="eyebrow">Competitor relevance board</span>

# The market is moving

<p>You have to be relevant to be relevant. <strong>Instagram rewards accounts that look alive</strong> — here's who's active near ${escapeHtml(vm.meta.marketLabel)} right now.</p>

<div class="relevance-board">
${cards.map(relevanceCard).join("\n")}
</div>`;
}

function miniAvatar(card: CompetitorVisualCard): string {
  if (card.cachedProfileImagePath) {
    return `<img class="cheat-avatar" src="${escapeHtml(card.cachedProfileImagePath)}" alt="@${escapeHtml(card.handle)}">`;
  }
  return `<div class="cheat-avatar cheat-avatar-fallback">${escapeHtml(card.initials)}</div>`;
}

function cheatCardVM(card: CompetitorVisualCard): string {
  return `<div class="cheat-card">
  <div class="cheat-head">${miniAvatar(card)}<div><span class="cheat-badge">${escapeHtml(card.marketLabel)}</span><div class="cheat-handle">@${escapeHtml(card.handle)}</div></div></div>
  <div class="cheat-stats">${escapeHtml(card.followersLabel)} followers · ${escapeHtml(card.postsLabel)} posts</div>
  <div class="cheat-line"><strong>Borrow:</strong> ${escapeHtml(card.borrow)}</div>
  <div class="cheat-line"><strong>Avoid:</strong> ${escapeHtml(card.avoid)}</div>
  <div class="cheat-line"><strong>Watch because:</strong> ${escapeHtml(card.doesWell)}</div>
</div>`;
}

/** Honest empty-state card — never a "Slot N" placeholder. */
function cheatUnavailableCard(): string {
  return `<div class="cheat-card cheat-card-empty">
  <div class="cheat-line">Competitor discovery did not return enough relevant accounts for this category. Re-run discovery with moving, packing, storage, organization, and home-inventory search terms.</div>
</div>`;
}

function cheatColumn(title: string, cards: CompetitorVisualCard[]): string {
  const body = cards.length > 0 ? cards.map(cheatCardVM).join("\n") : cheatUnavailableCard();
  return `<div class="cheat-column">
    <div class="column-title">${escapeHtml(title)}</div>
    ${body}
  </div>`;
}

/**
 * Cheat sheet with mini avatars, borrow / avoid / watch. Renders only the
 * relevant accounts that passed the relevance gate — never pads to a fixed
 * count with empty "Slot N" placeholders.
 */
export function competitorCheatSheetSlideVM(vm: WorkbookViewModel): string {
  const { local, reference } = vm.competitorCheatSheet;
  const market = vm.meta.marketLabel;
  const localCards = local.slice(0, 3);
  const referenceCards = reference.slice(0, 3);

  // If nothing qualified at all, render a single honest full-width data card.
  if (localCards.length === 0 && referenceCards.length === 0) {
    return `<span class="eyebrow">Competitor cheat sheet</span>

# Who to watch — and what to steal

<div class="guide-card full">
  <div class="kicker">Competitor data unavailable</div>
  <div class="copy">Competitor discovery did not return enough relevant accounts for this category. Re-run discovery with <strong>moving, packing, storage, organization, decluttering, and home-inventory</strong> search terms to populate this board with real moving-space peers.</div>
</div>`;
  }

  return `<span class="eyebrow">Competitor cheat sheet</span>

# Who to watch — and what to steal

<p>Relevant <strong>local</strong> and <strong>reference</strong> accounts that passed the relevance gate for your category.</p>

<div class="cheat-columns">
  ${cheatColumn(`Local — ${market}`, localCards)}
  ${cheatColumn("Reference models", referenceCards)}
</div>`;
}

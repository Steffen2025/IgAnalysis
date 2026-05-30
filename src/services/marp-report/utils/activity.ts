import { daysSince } from "./text.js";

/**
 * Activity status describes how "alive" a competitor account looks based on the
 * age of its most recent captured post. This is the core signal behind the
 * Competitor Relevance Board: "Instagram rewards accounts that look alive."
 */
export type ActivityStatus = "fresh" | "active" | "cooling" | "stale" | "unknown";

/**
 * Map the age of the latest post to an activity status.
 *  - fresh:   <= 7 days
 *  - active:  8–30 days
 *  - cooling: 31–90 days
 *  - stale:   > 90 days
 *  - unknown: no usable date
 */
export function getActivityStatus(date: string | Date | null | undefined): ActivityStatus {
  const days = daysSince(date);
  if (days === null) return "unknown";
  if (days <= 7) return "fresh";
  if (days <= 30) return "active";
  if (days <= 90) return "cooling";
  return "stale";
}

/** Short human label for a status badge. */
export function activityBadgeLabel(status: ActivityStatus): string {
  switch (status) {
    case "fresh":
      return "Fresh";
    case "active":
      return "Active";
    case "cooling":
      return "Cooling off";
    case "stale":
      return "Stale";
    default:
      return "Activity unknown";
  }
}

/** CSS modifier class for a status badge (paired with .relevance-badge in CSS). */
export function activityBadgeClass(status: ActivityStatus): string {
  return `badge-${status}`;
}

/**
 * Sort weight so fresher accounts rank first.
 * Higher number = more relevant/alive.
 */
export function activityRank(status: ActivityStatus): number {
  switch (status) {
    case "fresh":
      return 4;
    case "active":
      return 3;
    case "cooling":
      return 2;
    case "stale":
      return 1;
    default:
      return 0;
  }
}

import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { first } from "../../db/query.js";
import { teardowns } from "../../db/schema.js";

// Phase machine for a single-profile teardown run. M1 implements CREATED →
// TARGET_PROFILE → TARGET_CONTENT → HIGHLIGHTS → DATA_EXPORTED → COMPLETE.
// Later milestones (vision, transcripts, comments, hashtags, metrics, thesis,
// markdown) slot in between HIGHLIGHTS and DATA_EXPORTED; the enum already
// reserves their names so no schema churn is needed later.
export const TeardownPhase = {
  CREATED: "CREATED",
  TARGET_PROFILE: "TARGET_PROFILE",
  TARGET_CONTENT: "TARGET_CONTENT",
  HIGHLIGHTS: "HIGHLIGHTS",
  MEDIA_SELECTED: "MEDIA_SELECTED",
  COVER_VISION_DONE: "COVER_VISION_DONE",
  TRANSCRIPTS_DONE: "TRANSCRIPTS_DONE",
  COMMENTS_DONE: "COMMENTS_DONE",
  HASHTAGS_DONE: "HASHTAGS_DONE",
  METRICS_DONE: "METRICS_DONE",
  THESIS_DONE: "THESIS_DONE",
  DATA_EXPORTED: "DATA_EXPORTED",
  MD_GENERATED: "MD_GENERATED",
  COMPLETE: "COMPLETE",
  FAILED: "FAILED",
} as const;
export type TeardownPhase = (typeof TeardownPhase)[keyof typeof TeardownPhase];

type TeardownStatus = "queued" | "running" | "complete" | "failed";

function phaseToStatus(phase: TeardownPhase): TeardownStatus {
  switch (phase) {
    case TeardownPhase.CREATED:
      return "queued";
    case TeardownPhase.COMPLETE:
      return "complete";
    case TeardownPhase.FAILED:
      return "failed";
    default:
      return "running";
  }
}

export async function setTeardownPhase(
  teardownId: number,
  phase: TeardownPhase,
): Promise<void> {
  await db
    .update(teardowns)
    .set({ phase, status: phaseToStatus(phase) })
    .where(eq(teardowns.id, teardownId));
}

export async function getTeardownPhase(teardownId: number): Promise<TeardownPhase> {
  const row = await first(
    db
      .select({ phase: teardowns.phase })
      .from(teardowns)
      .where(eq(teardowns.id, teardownId))
      .limit(1),
  );
  return (row?.phase as TeardownPhase) ?? TeardownPhase.CREATED;
}

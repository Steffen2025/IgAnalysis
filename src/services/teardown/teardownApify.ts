import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { scrape_jobs, type ScrapeJob } from "../../db/schema.js";
import { getDataset, validateToken } from "../apify/index.js";

// Teardown-scoped Apify runner. Mirrors apifyService.runActorAndGetData but logs
// each run against teardown_id instead of audit_id, so the audit pipeline stays
// untouched while teardown runs remain fully auditable and budget-countable.

const APIFY_BASE = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 10_000;

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function updateJob(id: number, patch: Partial<ScrapeJob>): Promise<void> {
  await db.update(scrape_jobs).set(patch).where(eq(scrape_jobs.id, id));
}

interface ApifyRunResponse {
  data: {
    id: string;
    status: string;
    defaultDatasetId: string;
    statusMessage?: string;
    [k: string]: unknown;
  };
}

export interface TeardownRunResult {
  items: unknown[];
  itemCount: number;
  failed: boolean;
  error?: string;
}

export async function runTeardownActor(params: {
  actorId: string;
  actorLabel: string;
  teardownId: number;
  input: Record<string, unknown>;
}): Promise<TeardownRunResult> {
  const { actorId, actorLabel, teardownId, input } = params;
  const token = validateToken();

  const [jobRow] = await db
    .insert(scrape_jobs)
    .values({
      teardown_id: teardownId,
      actor_id: actorId,
      actor_label: actorLabel,
      status: "queued",
      input_json: JSON.stringify(input),
    })
    .returning();

  const encodedActor = actorId.replace("/", "~");
  const startUrl = `${APIFY_BASE}/acts/${encodedActor}/runs`;

  let startRes: Response;
  try {
    startRes = await fetch(startUrl, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(input),
    });
  } catch (err) {
    const msg = `Network error starting run: ${(err as Error).message}`;
    await updateJob(jobRow.id, { status: "failed", error_message: msg });
    return { items: [], itemCount: 0, failed: true, error: msg };
  }

  if (!startRes.ok) {
    const bodyText = await startRes.text().catch(() => "");
    const msg = `HTTP ${startRes.status} starting actor ${actorId}: ${bodyText.slice(0, 500)}`;
    await updateJob(jobRow.id, { status: "failed", error_message: msg });
    return { items: [], itemCount: 0, failed: true, error: msg };
  }

  const startJson = (await startRes.json()) as ApifyRunResponse;
  const runId = startJson.data.id;
  await updateJob(jobRow.id, {
    apify_run_id: runId,
    status: "running",
    started_at: new Date().toISOString(),
  });

  let runData = startJson.data;
  const terminal = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"]);
  while (!terminal.has(runData.status)) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollRes = await fetch(`${APIFY_BASE}/actor-runs/${runId}`, {
      headers: authHeaders(token),
    });
    if (!pollRes.ok) {
      const bodyText = await pollRes.text().catch(() => "");
      const msg = `HTTP ${pollRes.status} polling run ${runId}: ${bodyText.slice(0, 500)}`;
      await updateJob(jobRow.id, { status: "failed", error_message: msg });
      return { items: [], itemCount: 0, failed: true, error: msg };
    }
    runData = ((await pollRes.json()) as ApifyRunResponse).data;
    console.log(`[teardown] run ${runId} — status: ${runData.status}`);
  }

  if (runData.status !== "SUCCEEDED") {
    const msg = runData.statusMessage ?? `Apify run ended with status ${runData.status}`;
    await updateJob(jobRow.id, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message: msg,
    });
    return { items: [], itemCount: 0, failed: true, error: msg };
  }

  const items = await getDataset(runData.defaultDatasetId);
  await updateJob(jobRow.id, {
    status: "complete",
    completed_at: new Date().toISOString(),
    item_count: items.length,
  });
  return { items, itemCount: items.length, failed: false };
}

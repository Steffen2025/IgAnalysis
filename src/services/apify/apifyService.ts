import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { scrape_jobs, type ScrapeJob } from "../../db/schema.js";

const APIFY_BASE = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 10_000;

export function validateToken(): string {
  const token = process.env.APIFY_TOKEN;
  if (!token || token.trim() === "") {
    throw new Error("APIFY_TOKEN is not set. Add it to your .env file.");
  }
  return token;
}

function authHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function updateJob(
  id: number,
  patch: Partial<ScrapeJob>,
): Promise<ScrapeJob> {
  const [row] = await db
    .update(scrape_jobs)
    .set(patch)
    .where(eq(scrape_jobs.id, id))
    .returning();
  return row;
}

interface RunActorParams {
  actorId: string;
  input: Record<string, unknown>;
  auditId: number;
  actorLabel: string;
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

export async function runActor(
  params: RunActorParams,
): Promise<ApifyRunResponse["data"]> {
  const { actorId, input, auditId, actorLabel } = params;
  const token = validateToken();

  const [jobRow] = await db
    .insert(scrape_jobs)
    .values({
      audit_id: auditId,
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
    await updateJob(jobRow.id, {
      status: "failed",
      error_message: `Network error starting run: ${(err as Error).message}`,
    });
    throw new Error(`Failed to start Apify actor ${actorId}: network error`);
  }

  if (!startRes.ok) {
    const bodyText = await startRes.text().catch(() => "");
    const msg = `HTTP ${startRes.status} starting actor ${actorId}: ${bodyText.slice(0, 500)}`;
    await updateJob(jobRow.id, { status: "failed", error_message: msg });
    throw new Error(msg);
  }

  const startJson = (await startRes.json()) as ApifyRunResponse;
  const runId = startJson.data.id;

  await updateJob(jobRow.id, {
    apify_run_id: runId,
    status: "running",
    started_at: new Date().toISOString(),
  });

  let lastRunData: ApifyRunResponse["data"] = startJson.data;
  const terminal = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"]);

  while (!terminal.has(lastRunData.status)) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const pollUrl = `${APIFY_BASE}/actor-runs/${runId}`;
    const pollRes = await fetch(pollUrl, { headers: authHeaders(token) });
    if (!pollRes.ok) {
      const bodyText = await pollRes.text().catch(() => "");
      const msg = `HTTP ${pollRes.status} polling run ${runId}: ${bodyText.slice(0, 500)}`;
      await updateJob(jobRow.id, { status: "failed", error_message: msg });
      throw new Error(msg);
    }
    const pollJson = (await pollRes.json()) as ApifyRunResponse;
    lastRunData = pollJson.data;
    console.log(`Polling run ${runId} — status: ${lastRunData.status}`);
  }

  if (lastRunData.status === "SUCCEEDED") {
    await updateJob(jobRow.id, {
      status: "complete",
      completed_at: new Date().toISOString(),
    });
  } else {
    await updateJob(jobRow.id, {
      status: "failed",
      completed_at: new Date().toISOString(),
      error_message:
        lastRunData.statusMessage ??
        `Apify run ended with status ${lastRunData.status}`,
    });
  }

  return lastRunData;
}

export async function getDataset(datasetId: string): Promise<unknown[]> {
  const token = validateToken();
  const url = `${APIFY_BASE}/datasets/${datasetId}/items?clean=true&limit=500`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} fetching dataset ${datasetId}: ${bodyText.slice(0, 500)}`,
    );
  }
  const items = (await res.json()) as unknown[];
  console.log(`Dataset ${datasetId} returned ${items.length} items`);
  return items;
}

export interface RunAndDataResult {
  runRecord: ScrapeJob;
  items: unknown[];
}

export async function runActorAndGetData(
  params: RunActorParams,
): Promise<RunAndDataResult> {
  const runData = await runActor(params);

  // refetch the scrape_jobs row for the caller
  const [runRecord] = await db
    .select()
    .from(scrape_jobs)
    .where(eq(scrape_jobs.apify_run_id, runData.id))
    .limit(1);

  if (runData.status !== "SUCCEEDED") {
    console.error(
      `Apify run ${runData.id} did not succeed (status=${runData.status}). Returning empty items.`,
    );
    return { runRecord, items: [] };
  }

  const items = await getDataset(runData.defaultDatasetId);
  if (items.length === 0) {
    console.warn(
      `Apify run ${runData.id} succeeded but dataset ${runData.defaultDatasetId} is empty.`,
    );
  }
  return { runRecord, items };
}

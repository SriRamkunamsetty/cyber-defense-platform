import { CloudTasksClient } from "@google-cloud/tasks";
import { eq } from "drizzle-orm";
import { investigationJobs } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { useCloudTasks } from "../_core/gcpConfig";
import { getDb } from "../db";
import type { InvestigationRequest } from "./investigationService";
import { runInvestigationWithStability } from "./investigationQueue";

async function createJobRecord(investigationId: number): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(investigationJobs).values({
    investigationId,
    status: "queued",
    attempts: 0,
    maxAttempts: 3,
  });

  const row = result as unknown as { insertId?: number };
  if (row.insertId) return Number(row.insertId);

  const rows = await db
    .select({ id: investigationJobs.id })
    .from(investigationJobs)
    .where(eq(investigationJobs.investigationId, investigationId))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function enqueueCloudTask(investigationId: number): Promise<void> {
  const client = new CloudTasksClient();
  const parent = client.queuePath(
    ENV.gcpProjectId,
    ENV.gcpLocation,
    ENV.gcpTasksQueue
  );

  const url = `${ENV.workerUrl.replace(/\/$/, "")}/api/internal/worker/investigate`;
  const payload = Buffer.from(JSON.stringify({ investigationId })).toString("base64");

  await client.createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ENV.workerSecret}`,
        },
        body: payload,
      },
    },
  });
}

async function runInlineInvestigation(request: InvestigationRequest): Promise<void> {
  const { runInvestigation } = await import("./investigationService");
  await runInvestigationWithStability(() => runInvestigation(request));
}

/**
 * Enqueue investigation — Cloud Tasks (GCP) or durable inline worker (local/single-node).
 */
export async function enqueueInvestigation(
  request: InvestigationRequest
): Promise<{ mode: "cloud_tasks" | "inline"; jobId: number | null }> {
  const jobId = await createJobRecord(request.investigationId);

  if (useCloudTasks()) {
    await enqueueCloudTask(request.investigationId);
    return { mode: "cloud_tasks", jobId };
  }

  setImmediate(() => {
    runInlineInvestigation(request).catch((err) => {
      console.error("[JobQueue] Inline investigation failed:", err);
    });
  });

  return { mode: "inline", jobId };
}

export async function processInvestigationJob(
  investigationId: number
): Promise<void> {
  const db = await getDb();
  if (db) {
    await db
      .update(investigationJobs)
      .set({ status: "running", startedAt: new Date(), attempts: 1 })
      .where(eq(investigationJobs.investigationId, investigationId));
  }

  const { getInvestigationById } = await import("../db");
  const inv = await getInvestigationById(investigationId);
  if (!inv) throw new Error(`Investigation ${investigationId} not found`);

  const { runInvestigation } = await import("./investigationService");
  await runInvestigationWithStability(() =>
    runInvestigation({
      investigationId,
      apkFileName: inv.fileName,
      apkFileKey: inv.fileKey,
      userId: inv.userId,
    })
  );

  if (db) {
    await db
      .update(investigationJobs)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(investigationJobs.investigationId, investigationId));
  }
}

import { CloudTasksClient } from "@google-cloud/tasks";
import { eq, sql } from "drizzle-orm";
import { investigationJobs } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import { useCloudTasks } from "../_core/gcpConfig";
import { getDb } from "../db";
import type { InvestigationRequest } from "./investigationService";
import { runInvestigationWithStability } from "./investigationQueue";
import { broadcastInvestigationEvent } from "../websocket";

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

async function enqueueCloudTaskForStage(
  investigationId: number,
  stage: "forensics" | "ai"
): Promise<void> {
  const client = new CloudTasksClient();
  const parent = client.queuePath(
    ENV.gcpProjectId,
    ENV.gcpLocation,
    ENV.gcpTasksQueue
  );

  const workerBaseUrl =
    (
      stage === "ai"
        ? ENV.aiWorkerUrl || ENV.workerUrl
        : ENV.forensicsWorkerUrl || ENV.workerUrl
    ).replace(/\/$/, "");
  const routePath =
    stage === "ai"
      ? "/api/internal/worker/ai"
      : "/api/internal/worker/forensics";
  const url = `${workerBaseUrl}${routePath}`;
  const payload = Buffer.from(
    JSON.stringify({ investigationId, stage })
  ).toString("base64");

  await client.createTask({
    parent,
    task: {
      httpRequest: {
        httpMethod: "POST",
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(ENV.workerSecret || "").trim()}`,
        },
        body: payload,
      },
    },
  });
}

export async function enqueueAiStage(
  investigationId: number
): Promise<"cloud_tasks" | "inline"> {
  if (useCloudTasks()) {
    await enqueueCloudTaskForStage(investigationId, "ai");
    return "cloud_tasks";
  }

  setImmediate(() => {
    processAiJob(investigationId).catch((err) => {
      console.error("[JobQueue] Inline AI stage failed:", err);
    });
  });

  return "inline";
}

async function runInlineInvestigation(request: InvestigationRequest): Promise<void> {
  await processForensicsJob(request.investigationId);
}

/**
 * Enqueue investigation — Cloud Tasks (GCP) or durable inline worker (local/single-node).
 */
export async function enqueueInvestigation(
  request: InvestigationRequest
): Promise<{ mode: "cloud_tasks" | "inline"; jobId: number | null }> {
  const jobId = await createJobRecord(request.investigationId);

  const { transitionInvestigationLifecycle } = await import("../db");
  await transitionInvestigationLifecycle(request.investigationId, "queued");
  await broadcastInvestigationEvent({
    type: "lifecycle_transition",
    investigationId: request.investigationId,
    message: "Investigation accepted into durable pipeline queue",
    data: { lifecycleState: "queued" },
    timestamp: new Date().toISOString(),
  });

  if (useCloudTasks()) {
    await enqueueCloudTaskForStage(request.investigationId, "forensics");
    return { mode: "cloud_tasks", jobId };
  }

  setImmediate(() => {
    runInlineInvestigation(request).catch((err) => {
      console.error("[JobQueue] Inline investigation failed:", err);
    });
  });

  return { mode: "inline", jobId };
}

export async function processForensicsJob(
  investigationId: number
): Promise<void> {
  const db = await getDb();
  if (db) {
    await db
      .update(investigationJobs)
      .set({
        status: "running",
        startedAt: new Date(),
        attempts: sql`${investigationJobs.attempts} + 1`,
        lastError: null,
      })
      .where(eq(investigationJobs.investigationId, investigationId));
  }

  const { getInvestigationById } = await import("../db");
  const inv = await getInvestigationById(investigationId);
  if (!inv) throw new Error(`Investigation ${investigationId} not found`);

  const { runForensicStage } = await import("./investigationService");
  try {
    await runInvestigationWithStability(async () => {
      const request = {
        investigationId,
        apkFileName: inv.fileName,
        apkFileKey: inv.fileKey,
        userId: inv.userId,
      };
      await runForensicStage(request);
    });

    const aiMode = await enqueueAiStage(investigationId);
    const { upsertInvestigationCheckpoint } = await import("../db");
    await upsertInvestigationCheckpoint(investigationId, "ai_stage_queued", {
      queuedAt: new Date().toISOString(),
      mode: aiMode,
    });
    await broadcastInvestigationEvent({
      type: "checkpoint_saved",
      investigationId,
      timestamp: new Date().toISOString(),
      message: "Checkpoint saved: ai_stage_queued",
      data: { checkpointKey: "ai_stage_queued", mode: aiMode },
    });
    await broadcastInvestigationEvent({
      type: "lifecycle_transition",
      investigationId,
      timestamp: new Date().toISOString(),
      message:
        aiMode === "cloud_tasks"
          ? "Forensic stage complete - AI worker task enqueued"
          : "Forensic stage complete - AI stage scheduled inline",
      data: { lifecycleState: "forensic_validation", nextStage: "ai_processing" },
    });
  } catch (error) {
    if (db) {
      await db
        .update(investigationJobs)
        .set({
          status: "failed",
          lastError: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(investigationJobs.investigationId, investigationId));
    }

    await broadcastInvestigationEvent({
      type: "investigation_error",
      investigationId,
      timestamp: new Date().toISOString(),
      message:
        error instanceof Error
          ? `Investigation job failed: ${error.message}`
          : "Investigation job failed",
    });

    throw error;
  }
}

export async function processAiJob(investigationId: number): Promise<void> {
  const { getInvestigationById } = await import("../db");
  const inv = await getInvestigationById(investigationId);
  if (!inv) throw new Error(`Investigation ${investigationId} not found`);

  const { runAiStage } = await import("./investigationService");
  try {
    await runInvestigationWithStability(async () => {
      await runAiStage({
        investigationId,
        apkFileName: inv.fileName,
        apkFileKey: inv.fileKey,
        userId: inv.userId,
      });
    });

    const db = await getDb();
    if (db) {
      await db
        .update(investigationJobs)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(investigationJobs.investigationId, investigationId));
    }
  } catch (error) {
    const db = await getDb();
    if (db) {
      await db
        .update(investigationJobs)
        .set({
          status: "failed",
          lastError: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(investigationJobs.investigationId, investigationId));
    }

    await broadcastInvestigationEvent({
      type: "investigation_error",
      investigationId,
      timestamp: new Date().toISOString(),
      message:
        error instanceof Error
          ? `AI stage failed: ${error.message}`
          : "AI stage failed",
    });

    throw error;
  }
}

export async function processInvestigationJob(
  investigationId: number
): Promise<void> {
  await processForensicsJob(investigationId);
}

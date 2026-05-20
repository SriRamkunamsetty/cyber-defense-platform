import { runAnalysisPipeline } from "./aiEngine";
import { analyzeApkBuffer } from "./apkAnalyzer";
import { runForensicEngine } from "./forensic/forensicEngine";
import { broadcastInvestigationEvent } from "../websocket";
import { notifyOwner } from "../_core/notification";
import { storageGetBuffer } from "../storage";
import {
  getInvestigationCheckpoint,
  syncInvestigationEvidenceLineage,
  transitionInvestigationLifecycle,
  upsertInvestigationCheckpoint,
} from "../db";
import { isValidApkBuffer } from "./investigationQueue";
import { enqueueInvestigation } from "./jobQueue";
import type { ApkEvidence } from "../../shared/evidence";
import type { ValidatedForensicBundle } from "../../shared/forensics";

export interface InvestigationRequest {
  investigationId: number;
  apkFileName: string;
  apkFileKey: string;
  userId: number;
}

async function downloadApk(fileKey: string): Promise<Buffer> {
  return storageGetBuffer(fileKey);
}

async function saveCheckpoint(
  investigationId: number,
  checkpointKey: string,
  payload?: unknown
): Promise<void> {
  await upsertInvestigationCheckpoint(investigationId, checkpointKey, payload);
  await broadcastInvestigationEvent({
    type: "checkpoint_saved",
    investigationId,
    message: `Checkpoint saved: ${checkpointKey}`,
    data: { checkpointKey },
    timestamp: new Date().toISOString(),
  });
}

function createProgressLogger(investigationId: number) {
  return (message: string, progress?: number) => {
    void broadcastInvestigationEvent({
      type: "agent_progress",
      investigationId,
      message,
      progress,
      timestamp: new Date().toISOString(),
    });
  };
}

export async function runForensicStage(
  request: InvestigationRequest
): Promise<ValidatedForensicBundle> {
  const { investigationId, apkFileName, apkFileKey } = request;
  const onLog = createProgressLogger(investigationId);

  let rawEvidence = await getInvestigationCheckpoint<ApkEvidence>(
    investigationId,
    "raw_evidence_ready"
  );
  let forensicBundle =
    await getInvestigationCheckpoint<ValidatedForensicBundle>(
      investigationId,
      "forensic_bundle_ready"
    );

  if (forensicBundle) {
    onLog("Resuming from forensic bundle checkpoint", 80);
    return forensicBundle;
  }

  if (!rawEvidence) {
    await transitionInvestigationLifecycle(
      investigationId,
      "downloading_artifact"
    );
    onLog("Downloading APK from secure storage", 2);
    const apkBuffer = await downloadApk(apkFileKey);

    if (!isValidApkBuffer(apkBuffer)) {
      throw new Error("Invalid APK file - not a valid ZIP/APK archive");
    }

    await saveCheckpoint(investigationId, "artifact_validated", {
      fileKey: apkFileKey,
      validatedAt: new Date().toISOString(),
    });

    await transitionInvestigationLifecycle(
      investigationId,
      "reverse_engineering",
      { currentCheckpoint: "artifact_validated" }
    );
    onLog("APK retrieved - beginning forensic reverse engineering", 5);

    rawEvidence = await analyzeApkBuffer(apkBuffer, apkFileName, onLog);
    await saveCheckpoint(investigationId, "raw_evidence_ready", rawEvidence);
  } else {
    onLog("Resuming from raw evidence checkpoint", 42);
  }

  await transitionInvestigationLifecycle(
    investigationId,
    "forensic_validation",
    { currentCheckpoint: "raw_evidence_ready" }
  );
  onLog("Running enterprise forensic validation engine", 78);

  forensicBundle = runForensicEngine(rawEvidence);
  await saveCheckpoint(investigationId, "forensic_bundle_ready", forensicBundle);
  await syncInvestigationEvidenceLineage(investigationId, forensicBundle);
  await broadcastInvestigationEvent({
    type: "checkpoint_saved",
    investigationId,
    message: "Evidence lineage graph synchronized",
    data: {
      checkpointKey: "evidence_lineage_ready",
      entityCount:
        forensicBundle.evidence.permissions.length +
        forensicBundle.evidence.iocs.length +
        forensicBundle.evidence.suspiciousMethods.length,
    },
    timestamp: new Date().toISOString(),
  });
  return forensicBundle;
}

export async function runAiStage(
  request: InvestigationRequest,
  forensicBundle?: ValidatedForensicBundle
): Promise<void> {
  const { investigationId, apkFileName } = request;
  const onLog = createProgressLogger(investigationId);

  const bundle =
    forensicBundle ??
    (await getInvestigationCheckpoint<ValidatedForensicBundle>(
      investigationId,
      "forensic_bundle_ready"
    ));

  if (!bundle) {
    throw new Error(
      `Forensic bundle checkpoint missing for investigation ${investigationId}`
    );
  }

  const evidence = bundle.evidence;

  await transitionInvestigationLifecycle(investigationId, "ai_processing", {
    currentCheckpoint: "forensic_bundle_ready",
    packageName: evidence.packageName,
    evidence,
    sha256Hash: evidence.sha256,
    attackChain: bundle.attackChain,
  });

  const result = await runAnalysisPipeline(
    investigationId,
    apkFileName,
    bundle,
    onLog
  );

  await saveCheckpoint(investigationId, "ai_analysis_complete", {
    riskScore: result.riskScore,
    completedAt: new Date().toISOString(),
    threatSummary: result.threatSummary,
    consensus: result.consensus,
  });

  await transitionInvestigationLifecycle(investigationId, "completed", {
    currentCheckpoint: "ai_analysis_complete",
  });

  if (result.riskScore > 80) {
    const topThreats = result.iocs
      .filter((ioc) => ioc.severity === "high" || ioc.severity === "critical")
      .slice(0, 3)
      .map((ioc) => `${ioc.type}: ${ioc.value}`)
      .join(", ");

    try {
      await notifyOwner({
        title: `Critical Risk Alert: ${apkFileName}`,
        content: `Risk Score: ${result.riskScore}/100\nClassification: ${result.consensus?.threatClassification || "High risk"}\nPackage: ${evidence.packageName}\nForensic Confidence: ${bundle.forensicConfidence}%\n\nTop Threats:\n${topThreats || "Multiple critical indicators"}\n\nImmediate review recommended.`,
      });
    } catch (notificationError) {
      console.warn(
        `[Investigation ${investigationId}] Critical notification failed:`,
        notificationError
      );
    }
  }
}

/**
 * Runs the complete investigation pipeline:
 * download APK -> forensic extraction -> validation/enrichment -> autonomous AI agents -> consensus
 */
export async function runInvestigation(
  request: InvestigationRequest
): Promise<void> {
  const { investigationId } = request;

  try {
    await transitionInvestigationLifecycle(investigationId, "queued");
    await broadcastInvestigationEvent({
      type: "lifecycle_transition",
      investigationId,
      message: "Investigation accepted into durable pipeline queue",
      data: { lifecycleState: "queued" },
      timestamp: new Date().toISOString(),
    });

    await broadcastInvestigationEvent({
      type: "agent_start",
      investigationId,
      message: "Autonomous cyber forensics pipeline starting",
      timestamp: new Date().toISOString(),
    });

    const forensicBundle = await runForensicStage(request);
    await runAiStage(request, forensicBundle);
  } catch (error) {
    console.error(`Investigation ${investigationId} failed:`, error);

    try {
      await transitionInvestigationLifecycle(investigationId, "failed");
    } catch (transitionError) {
      console.warn(
        `[Investigation ${investigationId}] Failed transition rejected:`,
        transitionError
      );
    }

    await broadcastInvestigationEvent({
      type: "investigation_error",
      investigationId,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

export async function runInvestigationAsync(
  request: InvestigationRequest
): Promise<{ mode: "cloud_tasks" | "inline"; jobId: number | null }> {
  return enqueueInvestigation(request);
}

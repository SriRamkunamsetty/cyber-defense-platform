import { runAnalysisPipeline } from "./aiEngine";
import { analyzeApkBuffer } from "./apkAnalyzer";
import { runForensicEngine } from "./forensic/forensicEngine";
import { broadcastInvestigationEvent } from "../websocket";
import { notifyOwner } from "../_core/notification";
import { storageGetBuffer } from "../storage";
import { updateInvestigationStatus } from "../db";
import { isValidApkBuffer } from "./investigationQueue";
import { enqueueInvestigation } from "./jobQueue";

export interface InvestigationRequest {
  investigationId: number;
  apkFileName: string;
  apkFileKey: string;
  userId: number;
}

async function downloadApk(fileKey: string): Promise<Buffer> {
  return storageGetBuffer(fileKey);
}

/**
 * Runs the complete investigation pipeline:
 * download APK → forensic extraction → validation/enrichment → autonomous AI agents → consensus
 */
export async function runInvestigation(
  request: InvestigationRequest
): Promise<void> {
  const { investigationId, apkFileName, apkFileKey } = request;

  try {
    broadcastInvestigationEvent({
      type: "agent_start",
      investigationId,
      message: "Autonomous cyber forensics pipeline starting",
      timestamp: new Date().toISOString(),
    });

    await updateInvestigationStatus(investigationId, "analyzing");

    const onLog = (message: string, progress?: number) => {
      broadcastInvestigationEvent({
        type: "agent_progress",
        investigationId,
        message,
        progress,
        timestamp: new Date().toISOString(),
      });
    };

    onLog("Downloading APK from secure storage", 2);
    const apkBuffer = await downloadApk(apkFileKey);

    if (!isValidApkBuffer(apkBuffer)) {
      throw new Error("Invalid APK file — not a valid ZIP/APK archive");
    }

    onLog("APK retrieved — beginning forensic reverse engineering", 5);

    const rawEvidence = await analyzeApkBuffer(apkBuffer, apkFileName, onLog);
    onLog("Running enterprise forensic validation engine", 78);

    const forensicBundle = runForensicEngine(rawEvidence);
    const evidence = forensicBundle.evidence;

    await updateInvestigationStatus(investigationId, "analyzing", {
      packageName: evidence.packageName,
      evidence,
      sha256Hash: evidence.sha256,
      attackChain: forensicBundle.attackChain,
    });

    const result = await runAnalysisPipeline(
      investigationId,
      apkFileName,
      forensicBundle,
      onLog
    );

    if (result.riskScore > 80) {
      const topThreats = result.iocs
        .filter((ioc) => ioc.severity === "high" || ioc.severity === "critical")
        .slice(0, 3)
        .map((ioc) => `${ioc.type}: ${ioc.value}`)
        .join(", ");

      await notifyOwner({
        title: `Critical Risk Alert: ${apkFileName}`,
        content: `Risk Score: ${result.riskScore}/100\nClassification: ${result.consensus?.threatClassification || "High risk"}\nPackage: ${evidence.packageName}\nForensic Confidence: ${forensicBundle.forensicConfidence}%\n\nTop Threats:\n${topThreats || "Multiple critical indicators"}\n\nImmediate review recommended.`,
      });
    }
  } catch (error) {
    console.error(`Investigation ${investigationId} failed:`, error);

    await updateInvestigationStatus(investigationId, "failed");

    broadcastInvestigationEvent({
      type: "investigation_error",
      investigationId,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export async function runInvestigationAsync(
  request: InvestigationRequest
): Promise<{ mode: "cloud_tasks" | "inline"; jobId: number | null }> {
  return enqueueInvestigation(request);
}

import { runAnalysisPipeline } from "./aiEngine";
import { analyzeApkBuffer } from "./apkAnalyzer";
import { broadcastInvestigationEvent } from "../websocket";
import { notifyOwner } from "../_core/notification";
import { storageGetBuffer } from "../storage";
import { updateInvestigationStatus } from "../db";

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
 * Runs the complete investigation pipeline: download APK → forensic analysis → grounded AI agents.
 */
export async function runInvestigation(
  request: InvestigationRequest
): Promise<void> {
  const { investigationId, apkFileName, apkFileKey } = request;

  try {
    broadcastInvestigationEvent({
      type: "agent_start",
      investigationId,
      message: "Investigation pipeline starting",
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
    onLog("APK retrieved — beginning reverse engineering", 5);

    const evidence = await analyzeApkBuffer(apkBuffer, apkFileName, onLog);

    await updateInvestigationStatus(investigationId, "analyzing", {
      packageName: evidence.packageName,
      evidence,
      sha256Hash: evidence.sha256,
    });

    const result = await runAnalysisPipeline(
      investigationId,
      apkFileName,
      evidence,
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
        content: `Risk Score: ${result.riskScore}/100\nPackage: ${evidence.packageName}\n\nTop Threats:\n${topThreats || "Multiple critical indicators"}\n\nImmediate review recommended.`,
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

export function runInvestigationAsync(
  request: InvestigationRequest
): Promise<void> {
  runInvestigation(request).catch((error) => {
    console.error("Async investigation failed:", error);
  });
  return Promise.resolve();
}

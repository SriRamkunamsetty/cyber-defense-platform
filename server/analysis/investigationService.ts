import { runAnalysisPipeline } from "./aiEngine";
import { broadcastInvestigationEvent } from "../websocket";
import { notifyOwner } from "../_core/notification";

export interface InvestigationRequest {
  investigationId: number;
  apkFileName: string;
  apkFileKey: string;
  userId: number;
}

/**
 * Runs the complete investigation pipeline asynchronously.
 * Broadcasts WebSocket events for real-time progress updates.
 * Sends critical risk alerts if score > 80.
 */
export async function runInvestigation(
  request: InvestigationRequest
): Promise<void> {
  const { investigationId, apkFileName, apkFileKey, userId } = request;

  try {
    // Notify clients that analysis is starting
    broadcastInvestigationEvent({
      type: "investigation_complete",
      investigationId,
      timestamp: new Date().toISOString(),
      message: "Analysis pipeline starting",
    });

    // Run the multi-agent analysis pipeline
    const result = await runAnalysisPipeline(
      investigationId,
      apkFileName,
      `File Key: ${apkFileKey}`
    );

    // Broadcast completion
    broadcastInvestigationEvent({
      type: "investigation_complete",
      investigationId,
      timestamp: new Date().toISOString(),
      data: {
        riskScore: result.riskScore,
        riskBreakdown: result.riskBreakdown,
        threatSummary: result.threatSummary,
        mitigations: result.mitigations,
        iocCount: result.iocs.length,
      },
    });

    // Send critical risk alert if score > 80
    if (result.riskScore > 80) {
      const topThreats = result.iocs
        .filter((ioc) => ioc.severity === "high" || ioc.severity === "critical")
        .slice(0, 3)
        .map((ioc) => `${ioc.type}: ${ioc.value}`)
        .join(", ");

      await notifyOwner({
        title: `🚨 Critical Risk Alert: ${apkFileName}`,
        content: `Risk Score: ${result.riskScore}/100\n\nTop Threats:\n${topThreats}\n\nImmediate review recommended.`,
      });
    }
  } catch (error) {
    console.error(`Investigation ${investigationId} failed:`, error);

    // Broadcast error
    broadcastInvestigationEvent({
      type: "investigation_error",
      investigationId,
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Runs investigation asynchronously without blocking the request.
 */
export function runInvestigationAsync(
  request: InvestigationRequest
): Promise<void> {
  // Fire and forget - don't await
  runInvestigation(request).catch((error) => {
    console.error("Async investigation failed:", error);
  });

  // Return immediately
  return Promise.resolve();
}

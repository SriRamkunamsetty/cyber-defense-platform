import type { Express, Request, Response } from "express";
import {
  processAiJob,
  processForensicsJob,
  processInvestigationJob,
} from "../analysis/jobQueue";
import { writeAuditLog } from "./audit";
import { ENV } from "./env";

function isAuthorizedWorker(req: Request): boolean {
  const auth = req.headers.authorization?.trim();
  const secret = ENV.workerSecret?.trim();
  const expected = `Bearer ${secret}`;
  const match = Boolean(secret && auth === expected);
  
  console.log(`[WorkerAuth] path: ${req.originalUrl}, auth header present: ${Boolean(auth)}, secret present: ${Boolean(secret)}, length match: ${auth?.length === expected.length}, match: ${match}`);
  return match;
}

function parseInvestigationId(req: Request): number {
  return Number((req.body as { investigationId?: number })?.investigationId);
}

function registerWorkerHandler(
  app: Express,
  routePath: string,
  handler: (investigationId: number) => Promise<void>,
  workerType: "forensics" | "ai" | "legacy"
): void {
  app.post(routePath, async (req: Request, res: Response) => {
    if (!isAuthorizedWorker(req)) {
      res.status(401).json({ error: "Unauthorized worker" });
      return;
    }

    const investigationId = parseInvestigationId(req);
    if (!investigationId || Number.isNaN(investigationId)) {
      res.status(400).json({ error: "investigationId required" });
      return;
    }

    try {
      await handler(investigationId);
      await writeAuditLog({
        action: "investigation.complete",
        resourceType: "investigation",
        resourceId: String(investigationId),
        metadata: { worker: true, workerType },
      });
      res.status(200).json({ success: true, investigationId, workerType });
    } catch (error) {
      console.error(`[Worker:${workerType}] Job failed:`, error);
      await writeAuditLog({
        action: "investigation.fail",
        resourceType: "investigation",
        resourceId: String(investigationId),
        metadata: {
          workerType,
          error: error instanceof Error ? error.message : "unknown",
        },
      });
      res.status(500).json({ error: error instanceof Error ? error.message : "unknown" });
    }
  });
}

export function registerWorkerRoutes(app: Express): void {
  registerWorkerHandler(
    app,
    "/api/internal/worker/forensics",
    processForensicsJob,
    "forensics"
  );
  registerWorkerHandler(
    app,
    "/api/internal/worker/ai",
    processAiJob,
    "ai"
  );
  registerWorkerHandler(
    app,
    "/api/internal/worker/investigate",
    processInvestigationJob,
    "legacy"
  );

  if (ENV.workerSecret) {
    console.log("[Worker] Internal route: POST /api/internal/worker/forensics");
    console.log("[Worker] Internal route: POST /api/internal/worker/ai");
    console.log("[Worker] Internal route: POST /api/internal/worker/investigate");
  }
}

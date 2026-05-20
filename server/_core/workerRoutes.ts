import type { Express, Request, Response } from "express";
import {
  processAiJob,
  processForensicsJob,
  processInvestigationJob,
} from "../analysis/jobQueue";
import { writeAuditLog } from "./audit";
import { ENV } from "./env";

function isAuthorizedWorker(req: Request): boolean {
  const auth = req.headers.authorization;
  const expected = `Bearer ${ENV.workerSecret}`;
  return Boolean(ENV.workerSecret && auth === expected);
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

    res.status(202).json({ accepted: true, investigationId, workerType });

    handler(investigationId)
      .then(() =>
        writeAuditLog({
          action: "investigation.complete",
          resourceType: "investigation",
          resourceId: String(investigationId),
          metadata: { worker: true, workerType },
        })
      )
      .catch(async (error) => {
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
      });
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

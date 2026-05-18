import type { Express, Request, Response } from "express";
import { ENV } from "./env";
import { processInvestigationJob } from "../analysis/jobQueue";
import { writeAuditLog } from "./audit";

export function registerWorkerRoutes(app: Express): void {
  app.post(
    "/api/internal/worker/investigate",
    async (req: Request, res: Response) => {
      const auth = req.headers.authorization;
      const expected = `Bearer ${ENV.workerSecret}`;

      if (!ENV.workerSecret || auth !== expected) {
        res.status(401).json({ error: "Unauthorized worker" });
        return;
      }

      const investigationId = Number(
        (req.body as { investigationId?: number })?.investigationId
      );

      if (!investigationId || Number.isNaN(investigationId)) {
        res.status(400).json({ error: "investigationId required" });
        return;
      }

      res.status(202).json({ accepted: true, investigationId });

      processInvestigationJob(investigationId)
        .then(() =>
          writeAuditLog({
            action: "investigation.complete",
            resourceType: "investigation",
            resourceId: String(investigationId),
            metadata: { worker: true },
          })
        )
        .catch(async (error) => {
          console.error("[Worker] Job failed:", error);
          await writeAuditLog({
            action: "investigation.fail",
            resourceType: "investigation",
            resourceId: String(investigationId),
            metadata: {
              error: error instanceof Error ? error.message : "unknown",
            },
          });
        });
    }
  );

  if (ENV.workerSecret) {
    console.log("[Worker] Internal route: POST /api/internal/worker/investigate");
  }
}

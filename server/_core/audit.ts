import type { Request } from "express";
import { auditLogs } from "../../drizzle/schema";
import { getDb } from "../db";

export type AuditAction =
  | "investigation.upload"
  | "investigation.start"
  | "investigation.complete"
  | "investigation.fail"
  | "investigation.view"
  | "copilot.query"
  | "auth.login"
  | "auth.logout"
  | "system.diagnostics";

export async function writeAuditLog(params: {
  userId?: number;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const ip =
    (params.req?.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    params.req?.socket?.remoteAddress ||
    undefined;

  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipAddress: ip ?? null,
    });
  } catch (error) {
    console.warn("[Audit] Failed to write log:", error);
  }
}

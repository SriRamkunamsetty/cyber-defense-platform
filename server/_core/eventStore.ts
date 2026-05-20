import { desc, eq } from "drizzle-orm";
import { investigationEvents } from "../../drizzle/schema";
import type { InvestigationEvent } from "../websocket";
import { getDb } from "../db";

export async function persistInvestigationEvent(
  event: InvestigationEvent
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const result = await db.insert(investigationEvents).values({
      investigationId: event.investigationId,
      eventType: event.type,
      payload: JSON.stringify({
        sequence: event.sequence,
        agentName: event.agentName,
        progress: event.progress,
        message: event.message,
        data: event.data,
        timestamp: event.timestamp,
      }),
    });
    const row = result as unknown as { insertId?: number };
    return row.insertId ? Number(row.insertId) : null;
  } catch (error) {
    console.warn("[EventStore] Persist failed:", error);
    return null;
  }
}

export async function getInvestigationEvents(investigationId: number, limit = 200) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(investigationEvents)
    .where(eq(investigationEvents.investigationId, investigationId))
    .orderBy(desc(investigationEvents.createdAt))
    .limit(limit);
}

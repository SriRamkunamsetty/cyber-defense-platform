import { desc, eq } from "drizzle-orm";
import { investigationEvents } from "../../drizzle/schema";
import type { InvestigationEvent } from "../websocket";
import { getDb } from "../db";

export async function persistInvestigationEvent(
  event: InvestigationEvent
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(investigationEvents).values({
      investigationId: event.investigationId,
      eventType: event.type,
      payload: JSON.stringify({
        agentName: event.agentName,
        progress: event.progress,
        message: event.message,
        data: event.data,
        timestamp: event.timestamp,
      }),
    });
  } catch (error) {
    console.warn("[EventStore] Persist failed:", error);
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

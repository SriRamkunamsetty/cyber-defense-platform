import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, investigations, iocs, agentLogs, chatMessages } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Investigation queries
export async function createInvestigation(
  userId: number,
  fileName: string,
  fileKey: string,
  fileSize: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(investigations).values({
    userId,
    fileName,
    fileKey,
    fileSize,
    status: "pending",
  });

  return result;
}

export async function getInvestigationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(investigations)
    .where(eq(investigations.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserInvestigations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(investigations)
    .where(eq(investigations.userId, userId))
    .orderBy(investigations.createdAt);
}

export async function updateInvestigationStatus(
  id: number,
  status: string,
  riskScore?: number,
  threatSummary?: string,
  aiReasoning?: string
) {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = { status };
  if (riskScore !== undefined) updates.riskScore = riskScore;
  if (threatSummary !== undefined) updates.threatSummary = threatSummary;
  if (aiReasoning !== undefined) updates.aiReasoning = aiReasoning;
  if (status === "completed") updates.completedAt = new Date();

  await db.update(investigations).set(updates).where(eq(investigations.id, id));
}

// IOC queries
export async function createIOC(
  investigationId: number,
  type: string,
  value: string,
  severity: string,
  description?: string
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(iocs).values({
    investigationId,
    type: type as any,
    value,
    severity: severity as any,
    description,
  });
}

export async function getInvestigationIOCs(investigationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(iocs)
    .where(eq(iocs.investigationId, investigationId));
}

// Agent log queries
export async function createAgentLog(
  investigationId: number,
  agentName: string
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(agentLogs).values({
    investigationId,
    agentName,
    status: "pending",
  });
}

export async function updateAgentLog(
  investigationId: number,
  agentName: string,
  status: string,
  progress?: number,
  findings?: string
) {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = { status };
  if (progress !== undefined) updates.progress = progress;
  if (findings !== undefined) updates.findings = findings;
  if (status === "running") updates.startedAt = new Date();
  if (status === "completed") updates.completedAt = new Date();

  await db
    .update(agentLogs)
    .set(updates)
    .where(
      and(
        eq(agentLogs.investigationId, investigationId),
        eq(agentLogs.agentName, agentName)
      )
    );
}

export async function getInvestigationAgentLogs(investigationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(agentLogs)
    .where(eq(agentLogs.investigationId, investigationId));
}

// Chat message queries
export async function createChatMessage(
  investigationId: number,
  userId: number,
  role: string,
  content: string
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(chatMessages).values({
    investigationId,
    userId,
    role: role as any,
    content,
  });
}

export async function getInvestigationChatHistory(investigationId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.investigationId, investigationId))
    .orderBy(chatMessages.createdAt);
}

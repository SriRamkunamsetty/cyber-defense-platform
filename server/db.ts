import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  investigations,
  iocs,
  agentLogs,
  chatMessages,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { ApkEvidence, AttackChainStep, RiskScoreResult } from "../shared/evidence";
import type { ConsensusResult } from "../shared/forensics";

let _db: ReturnType<typeof drizzle> | null = null;

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
    const values: InsertUser = { openId: user.openId };
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
      values.role = "admin";
      updateSet.role = "admin";
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
  if (!db) return undefined;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createInvestigation(
  userId: number,
  fileName: string,
  fileKey: string,
  fileSize: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .insert(investigations)
    .values({
      userId,
      fileName,
      fileKey,
      fileSize,
      status: "pending",
    })
    .$returningId();

  const raw = result as unknown as { id?: number } | Array<{ id: number }>;
  const insertId = Array.isArray(raw)
    ? Number(raw[0]?.id)
    : Number(raw?.id);
  if (insertId) return insertId;

  const rows = await db
    .select({ id: investigations.id })
    .from(investigations)
    .where(eq(investigations.userId, userId))
    .orderBy(desc(investigations.createdAt))
    .limit(1);
  return rows[0]?.id ?? 0;
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
    .orderBy(desc(investigations.createdAt));
}

export async function updateInvestigationStatus(
  id: number,
  status: string,
  options?: {
    riskScore?: number;
    riskLevel?: string;
    threatSummary?: string;
    aiReasoning?: string;
    mitigations?: string[];
    packageName?: string;
    evidence?: ApkEvidence;
    attackChain?: AttackChainStep[];
    riskBreakdown?: RiskScoreResult;
    sha256Hash?: string;
    consensus?: ConsensusResult;
  }
) {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = { status };
  if (options?.riskScore !== undefined) updates.riskScore = options.riskScore;
  if (options?.riskLevel !== undefined) updates.riskLevel = options.riskLevel;
  if (options?.threatSummary !== undefined)
    updates.threatSummary = options.threatSummary;
  if (options?.aiReasoning !== undefined) updates.aiReasoning = options.aiReasoning;
  if (options?.mitigations !== undefined)
    updates.mitigationRecommendations = JSON.stringify(options.mitigations);
  if (options?.packageName !== undefined) updates.packageName = options.packageName;
  if (options?.sha256Hash !== undefined) updates.sha256Hash = options.sha256Hash;
  if (options?.evidence) {
    updates.evidenceJson = JSON.stringify(options.evidence);
    updates.fileTreeJson = JSON.stringify(options.evidence.fileTree);
  }
  if (options?.attackChain) {
    updates.attackChainJson = JSON.stringify(options.attackChain);
  }
  if (options?.consensus) {
    updates.consensusJson = JSON.stringify(options.consensus);
  }
  if (options?.riskBreakdown) {
    updates.dataExfiltrationScore = options.riskBreakdown.dataExfiltration;
    updates.credentialHarvestingScore = options.riskBreakdown.credentialHarvesting;
    updates.c2CommunicationScore = options.riskBreakdown.c2Communication;
    updates.bankingTrojanScore = options.riskBreakdown.bankingTrojan;
    updates.riskLevel = options.riskBreakdown.riskLevel;
  }
  if (status === "completed" || status === "failed") {
    updates.completedAt = new Date();
  }

  await db.update(investigations).set(updates).where(eq(investigations.id, id));
}

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
    type: type as "permission",
    value,
    severity: severity as "medium",
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

export async function createAgentLog(
  investigationId: number,
  agentName: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(agentLogs).values({
    investigationId,
    agentName,
    status: "pending",
    progress: 0,
  });
}

export async function initializeAgentLogs(investigationId: number, agentNames: string[]) {
  for (const name of agentNames) {
    await createAgentLog(investigationId, name);
  }
}

export async function updateAgentLog(
  investigationId: number,
  agentName: string,
  status: string,
  progress?: number,
  findings?: string,
  errorMessage?: string
) {
  const db = await getDb();
  if (!db) return;

  const updates: Record<string, unknown> = { status };
  if (progress !== undefined) updates.progress = progress;
  if (findings !== undefined) updates.findings = findings;
  if (errorMessage !== undefined) updates.errorMessage = errorMessage;
  if (status === "running") updates.startedAt = new Date();
  if (status === "completed" || status === "error") updates.completedAt = new Date();

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
    role: role as "user",
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

export function parseInvestigationEvidence(
  investigation: {
    evidenceJson?: string | null;
    fileTreeJson?: string | null;
    attackChainJson?: string | null;
    consensusJson?: string | null;
  }
): {
  evidence: ApkEvidence | null;
  attackChain: AttackChainStep[];
  consensus: ConsensusResult | null;
} {
  let evidence: ApkEvidence | null = null;
  let attackChain: AttackChainStep[] = [];
  let consensus: ConsensusResult | null = null;

  try {
    if (investigation.evidenceJson) {
      evidence = JSON.parse(investigation.evidenceJson) as ApkEvidence;
    }
  } catch {
    evidence = null;
  }

  try {
    if (investigation.attackChainJson) {
      attackChain = JSON.parse(investigation.attackChainJson) as AttackChainStep[];
    }
  } catch {
    attackChain = [];
  }

  try {
    if (investigation.consensusJson) {
      consensus = JSON.parse(investigation.consensusJson) as ConsensusResult;
    }
  } catch {
    consensus = null;
  }

  return { evidence, attackChain, consensus };
}

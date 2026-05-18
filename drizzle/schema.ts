import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// APK Analysis Investigation table
export const investigations = mysqlTable("investigations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  fileSize: int("fileSize"),
  riskScore: int("riskScore").default(0),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "critical"]).default("low"),
  status: mysqlEnum("status", ["pending", "analyzing", "completed", "failed"]).default("pending"),
  dataExfiltrationScore: int("dataExfiltrationScore").default(0),
  credentialHarvestingScore: int("credentialHarvestingScore").default(0),
  c2CommunicationScore: int("c2CommunicationScore").default(0),
  bankingTrojanScore: int("bankingTrojanScore").default(0),
  threatSummary: text("threatSummary"),
  aiReasoning: text("aiReasoning"),
  mitigationRecommendations: text("mitigationRecommendations"),
  packageName: varchar("packageName", { length: 255 }),
  evidenceJson: text("evidenceJson"),
  fileTreeJson: text("fileTreeJson"),
  attackChainJson: text("attackChainJson"),
  sha256Hash: varchar("sha256Hash", { length: 64 }),
  consensusJson: text("consensusJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Investigation = typeof investigations.$inferSelect;
export type InsertInvestigation = typeof investigations.$inferInsert;

// IOC (Indicators of Compromise) table
export const iocs = mysqlTable("iocs", {
  id: int("id").autoincrement().primaryKey(),
  investigationId: int("investigationId").notNull().references(() => investigations.id),
  type: mysqlEnum("type", [
    "permission",
    "network_endpoint",
    "api_call",
    "obfuscation_pattern",
    "hardcoded_string",
  ]).notNull(),
  value: text("value").notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).default("medium"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IOC = typeof iocs.$inferSelect;
export type InsertIOC = typeof iocs.$inferInsert;

// Agent Execution Log table
export const agentLogs = mysqlTable("agentLogs", {
  id: int("id").autoincrement().primaryKey(),
  investigationId: int("investigationId").notNull().references(() => investigations.id),
  agentName: varchar("agentName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["pending", "running", "completed", "error"]).default("pending"),
  progress: int("progress").default(0),
  findings: text("findings"),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AgentLog = typeof agentLogs.$inferSelect;
export type InsertAgentLog = typeof agentLogs.$inferInsert;

// Chat Message table
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  investigationId: int("investigationId").notNull().references(() => investigations.id),
  userId: int("userId").notNull().references(() => users.id),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

export const investigationJobs = mysqlTable("investigationJobs", {
  id: int("id").autoincrement().primaryKey(),
  investigationId: int("investigationId").notNull().references(() => investigations.id),
  status: mysqlEnum("status", ["queued", "running", "completed", "failed"]).default("queued").notNull(),
  attempts: int("attempts").default(0).notNull(),
  maxAttempts: int("maxAttempts").default(3).notNull(),
  lastError: text("lastError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
});

export type InvestigationJob = typeof investigationJobs.$inferSelect;

export const investigationEvents = mysqlTable("investigationEvents", {
  id: int("id").autoincrement().primaryKey(),
  investigationId: int("investigationId").notNull().references(() => investigations.id),
  eventType: varchar("eventType", { length: 64 }).notNull(),
  payload: text("payload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvestigationEventRow = typeof investigationEvents.$inferSelect;

export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id),
  action: varchar("action", { length: 128 }).notNull(),
  resourceType: varchar("resourceType", { length: 64 }),
  resourceId: varchar("resourceId", { length: 64 }),
  metadata: text("metadata"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
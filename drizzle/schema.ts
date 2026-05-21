import {
  int,
  longtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

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
  lifecycleState: mysqlEnum("lifecycleState", [
    "created",
    "queued",
    "downloading_artifact",
    "reverse_engineering",
    "forensic_validation",
    "ai_processing",
    "completed",
    "failed",
  ])
    .default("created")
    .notNull(),
  currentCheckpoint: varchar("currentCheckpoint", { length: 128 }),
  dataExfiltrationScore: int("dataExfiltrationScore").default(0),
  credentialHarvestingScore: int("credentialHarvestingScore").default(0),
  c2CommunicationScore: int("c2CommunicationScore").default(0),
  bankingTrojanScore: int("bankingTrojanScore").default(0),
  threatSummary: text("threatSummary"),
  aiReasoning: text("aiReasoning"),
  mitigationRecommendations: text("mitigationRecommendations"),
  packageName: varchar("packageName", { length: 255 }),
  evidenceJson: longtext("evidenceJson"),
  fileTreeJson: longtext("fileTreeJson"),
  attackChainJson: longtext("attackChainJson"),
  sha256Hash: varchar("sha256Hash", { length: 64 }),
  consensusJson: longtext("consensusJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type Investigation = typeof investigations.$inferSelect;
export type InsertInvestigation = typeof investigations.$inferInsert;

export const investigationCheckpoints = mysqlTable(
  "investigationCheckpoints",
  {
    id: int("id").autoincrement().primaryKey(),
    investigationId: int("investigationId")
      .notNull()
      .references(() => investigations.id),
    checkpointKey: varchar("checkpointKey", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["active", "superseded"]).default("active").notNull(),
    payload: longtext("payload"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    investigationCheckpointKeyUnique: uniqueIndex(
      "investigation_checkpoint_key_unique"
    ).on(table.investigationId, table.checkpointKey),
  })
);

export type InvestigationCheckpoint = typeof investigationCheckpoints.$inferSelect;

export const evidenceEntities = mysqlTable(
  "evidenceEntities",
  {
    id: int("id").autoincrement().primaryKey(),
    investigationId: int("investigationId")
      .notNull()
      .references(() => investigations.id),
    entityKey: varchar("entityKey", { length: 191 }).notNull(),
    entityType: mysqlEnum("entityType", [
      "package",
      "permission",
      "ioc",
      "method",
      "component",
      "certificate",
      "embedded_string",
      "native_library",
      "static_finding",
      "behavioral_finding",
      "attack_stage",
      "malware_family",
    ])
      .notNull(),
    displayName: varchar("displayName", { length: 255 }).notNull(),
    severity: mysqlEnum("severity", ["low", "medium", "high", "critical"])
      .default("low")
      .notNull(),
    confidence: int("confidence").default(0).notNull(),
    sourceType: varchar("sourceType", { length: 64 }),
    sourceRef: varchar("sourceRef", { length: 255 }),
    lineageJson: longtext("lineageJson"),
    metadataJson: longtext("metadataJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    evidenceEntityKeyUnique: uniqueIndex("evidence_entity_key_unique").on(
      table.investigationId,
      table.entityKey
    ),
  })
);

export type EvidenceEntityRow = typeof evidenceEntities.$inferSelect;

export const evidenceEdges = mysqlTable(
  "evidenceEdges",
  {
    id: int("id").autoincrement().primaryKey(),
    investigationId: int("investigationId")
      .notNull()
      .references(() => investigations.id),
    edgeKey: varchar("edgeKey", { length: 255 }).notNull(),
    fromEntityId: int("fromEntityId")
      .notNull()
      .references(() => evidenceEntities.id),
    toEntityId: int("toEntityId")
      .notNull()
      .references(() => evidenceEntities.id),
    relationshipType: mysqlEnum("relationshipType", [
      "declares",
      "contains",
      "supports",
      "derives_to",
      "indicates",
      "classified_as",
      "references",
    ])
      .notNull(),
    metadataJson: longtext("metadataJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    evidenceEdgeKeyUnique: uniqueIndex("evidence_edge_key_unique").on(
      table.investigationId,
      table.edgeKey
    ),
  })
);

export type EvidenceEdgeRow = typeof evidenceEdges.$inferSelect;

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
  findings: longtext("findings"),
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
  payload: longtext("payload"),
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

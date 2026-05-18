import { z } from "zod";

export const agentFindingSchema = z.object({
  summary: z.string().min(1),
  threatLevel: z.enum(["low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(100),
  evidence: z.array(z.string()),
  mitigations: z.array(z.string()),
  malwareCategory: z.string().optional(),
  attackVectors: z.array(z.string()).optional(),
  mitreTechniques: z.array(z.string()).optional(),
  citations: z.array(z.string()).optional(),
});

export const riskScoreSchema = z.object({
  overallScore: z.number().min(0).max(100),
  dataExfiltration: z.number().min(0).max(100),
  credentialHarvesting: z.number().min(0).max(100),
  c2Communication: z.number().min(0).max(100),
  bankingTrojan: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  justification: z.string(),
  summary: z.string().optional(),
  threatLevel: z.enum(["low", "medium", "high", "critical"]).optional(),
  confidence: z.number().optional(),
  evidence: z.array(z.string()).optional(),
  mitigations: z.array(z.string()).optional(),
});

export type ParsedAgentFinding = z.infer<typeof agentFindingSchema>;
export type ParsedRiskScore = z.infer<typeof riskScoreSchema>;

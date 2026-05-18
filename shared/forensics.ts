/** Enterprise forensic intelligence types — shared client/server */

import type {
  ApkEvidence,
  AttackChainStep,
  ExtractedIOC,
  PermissionEvidence,
  SuspiciousMethod,
} from "./evidence";

export interface FileHashSet {
  md5: string;
  sha1: string;
  sha256: string;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber?: string;
  validFrom?: string;
  validTo?: string;
  fingerprint?: string;
}

export interface EmbeddedString {
  value: string;
  source: string;
  flagged: boolean;
  category?: string;
}

export interface NativeLibrary {
  name: string;
  path: string;
  architecture?: string;
}

export interface StaticBehaviorFinding {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  evidenceRefs: string[];
  mitreTechnique?: string;
  bankingRelevance?: string;
  confidence: number;
}

export interface MalwareFamilyMatch {
  family: string;
  similarity: number;
  indicators: string[];
  description: string;
}

export interface MalwareDnaProfile {
  fingerprintId: string;
  permissionSignature: string[];
  apiSignature: string[];
  infrastructureSignature: string[];
  behavioralSignature: string[];
  familyMatches: MalwareFamilyMatch[];
  overallSimilarityScore: number;
  profileHash: string;
}

export interface InfrastructureIntel {
  indicator: string;
  indicatorType: "ip" | "domain" | "url" | "firebase" | "telegram";
  reputationScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  notes: string[];
  enrichmentSource: string;
}

export interface EvidenceItem {
  id: string;
  category:
    | "manifest"
    | "permission"
    | "code"
    | "network"
    | "certificate"
    | "string"
    | "native"
    | "behavior"
    | "ioc";
  value: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  source: string;
  description: string;
}

export interface ValidatedForensicBundle {
  evidence: ApkEvidence;
  evidenceItems: EvidenceItem[];
  staticFindings: StaticBehaviorFinding[];
  behavioralFindings: StaticBehaviorFinding[];
  malwareDna: MalwareDnaProfile;
  infrastructureIntel: InfrastructureIntel[];
  attackChain: AttackChainStep[];
  ragContext: string;
  validationNotes: string[];
  forensicConfidence: number;
}

export interface ConsensusResult {
  threatClassification: string;
  overallConfidence: number;
  forensicConfidence: number;
  agentAgreementScore: number;
  validatedFindings: string[];
  disputedFindings: string[];
  evidenceBackedConclusions: string[];
  falsePositiveFlags: string[];
}

export interface InvestigationMemory {
  investigationId: number;
  packageName: string;
  sha256: string;
  stage: string;
  accumulatedFindings: string;
  evidenceSnapshot: string;
  agentSummaries: Record<string, string>;
  consensus?: ConsensusResult;
}

export interface MitreMapping {
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  evidenceRefs: string[];
}

export interface ForensicReport {
  bundle: ValidatedForensicBundle;
  consensus: ConsensusResult;
  mitreMappings: MitreMapping[];
  memory: InvestigationMemory;
}

/** Re-export for convenience */
export type {
  ApkEvidence,
  AttackChainStep,
  ExtractedIOC,
  PermissionEvidence,
  SuspiciousMethod,
};

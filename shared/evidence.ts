/** Forensic evidence extracted from APK analysis — shared client/server types */

import type {
  CertificateInfo,
  EmbeddedString,
  FileHashSet,
  MalwareDnaProfile,
  NativeLibrary,
  StaticBehaviorFinding,
  InfrastructureIntel,
} from "./forensics";

export interface ApkFileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: ApkFileNode[];
  flagged?: boolean;
}

export interface PermissionEvidence {
  name: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  abuseDescription: string;
  bankingRelevance?: string;
}

export interface SuspiciousMethod {
  className: string;
  methodName: string;
  filePath: string;
  snippet: string;
  threatCategory: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface ExtractedIOC {
  type:
    | "permission"
    | "network_endpoint"
    | "api_call"
    | "obfuscation_pattern"
    | "hardcoded_string";
  value: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  source: string;
}

export interface AttackChainStep {
  id: string;
  stage: string;
  description: string;
  evidence: string[];
  severity: "low" | "medium" | "high" | "critical";
}

export interface ApkEvidence {
  packageName: string;
  versionName?: string;
  versionCode?: string;
  minSdk?: string;
  targetSdk?: string;
  hashes?: FileHashSet;
  sha256: string;
  fileSize: number;
  permissions: PermissionEvidence[];
  activities: string[];
  services: string[];
  receivers: string[];
  providers: string[];
  suspiciousMethods: SuspiciousMethod[];
  iocs: ExtractedIOC[];
  fileTree: ApkFileNode[];
  manifestXml?: string;
  analysisNotes: string[];
  toolsUsed: string[];
  /** Enterprise forensic extensions */
  embeddedStrings?: EmbeddedString[];
  nativeLibraries?: NativeLibrary[];
  certificates?: CertificateInfo[];
  staticFindings?: StaticBehaviorFinding[];
  behavioralFindings?: StaticBehaviorFinding[];
  malwareDna?: MalwareDnaProfile;
  infrastructureIntel?: InfrastructureIntel[];
  forensicConfidence?: number;
  dexFileCount?: number;
  hasObfuscation?: boolean;
}

export interface AgentStructuredFinding {
  agentName: string;
  summary: string;
  threatLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  evidence: string[];
  mitigations: string[];
  malwareCategory?: string;
  attackVectors?: string[];
  mitreTechniques?: string[];
  citations?: string[];
  ruleBased?: boolean;
}

export interface RiskScoreResult {
  overallScore: number;
  dataExfiltration: number;
  credentialHarvesting: number;
  c2Communication: number;
  bankingTrojan: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  justification: string;
}

export const AGENT_NAMES = [
  "APK Reverse Engineering",
  "Static Malware Analysis",
  "Behavioral Analysis",
  "Dynamic Threat Investigation",
  "Malware DNA Profiling",
  "IOC Correlation",
  "Threat Intelligence Correlation",
  "Attack Chain Reconstruction",
  "AI Malware Reasoning",
  "Fraud Intelligence",
  "Risk Scoring",
  "Executive Report Generation",
] as const;

/** Agents that use deterministic forensic rules (no LLM hallucination risk) */
export const RULE_BASED_AGENTS: AgentName[] = [
  "Behavioral Analysis",
  "Malware DNA Profiling",
  "IOC Correlation",
  "Attack Chain Reconstruction",
];

export type AgentName = (typeof AGENT_NAMES)[number];

/** Display names for UI cards */
export const AGENT_DISPLAY_NAMES: Record<AgentName, string> = {
  "APK Reverse Engineering": "Reverse Engineering",
  "Static Malware Analysis": "Static Analysis",
  "Behavioral Analysis": "Behavioral Analysis",
  "Dynamic Threat Investigation": "Dynamic Threat",
  "Malware DNA Profiling": "Malware DNA",
  "IOC Correlation": "IOC Correlation",
  "Threat Intelligence Correlation": "Threat Intelligence",
  "Attack Chain Reconstruction": "Attack Chain",
  "AI Malware Reasoning": "AI Reasoning",
  "Fraud Intelligence": "Fraud Intelligence",
  "Risk Scoring": "Risk Scoring",
  "Executive Report Generation": "Executive Report",
};

export type { ConsensusResult, InvestigationMemory, MitreMapping } from "./forensics";

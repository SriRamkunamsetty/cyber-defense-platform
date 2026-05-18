/** Forensic evidence extracted from APK analysis — shared client/server types */

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
  "Dynamic Threat Investigation",
  "Threat Intelligence Correlation",
  "AI Malware Reasoning",
  "Risk Scoring",
  "Executive Report Generation",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

/** Display names for UI cards */
export const AGENT_DISPLAY_NAMES: Record<AgentName, string> = {
  "APK Reverse Engineering": "Reverse Engineering",
  "Static Malware Analysis": "Static Analysis",
  "Dynamic Threat Investigation": "Dynamic Threat",
  "Threat Intelligence Correlation": "Threat Intelligence",
  "AI Malware Reasoning": "AI Reasoning",
  "Risk Scoring": "Risk Scoring",
  "Executive Report Generation": "Executive Report",
};

import { invokeLLM } from "../_core/llm";
import {
  updateAgentLog,
  updateInvestigationStatus,
  createIOC,
  initializeAgentLogs,
} from "../db";
import { broadcastInvestigationEvent } from "../websocket";
import type {
  ApkEvidence,
  AgentStructuredFinding,
  AttackChainStep,
  RiskScoreResult,
} from "../../shared/evidence";
import { AGENT_NAMES, type AgentName } from "../../shared/evidence";
import { evidenceToContext } from "./apkAnalyzer";

export interface AnalysisResult {
  iocs: ApkEvidence["iocs"];
  findings: string;
  riskScore: number;
  riskBreakdown: RiskScoreResult;
  threatSummary: string;
  mitigations: string[];
  attackChain: AttackChainStep[];
  agentFindings: AgentStructuredFinding[];
}

type BroadcastLog = (message: string, progress?: number) => void;

function emitLog(
  investigationId: number,
  message: string,
  progress?: number,
  agentName?: string
) {
  broadcastInvestigationEvent({
    type: "agent_progress",
    investigationId,
    agentName,
    message,
    progress,
    timestamp: new Date().toISOString(),
  });
}

function emitAgentStart(investigationId: number, agentName: string) {
  broadcastInvestigationEvent({
    type: "agent_start",
    investigationId,
    agentName,
    timestamp: new Date().toISOString(),
  });
}

function emitAgentComplete(
  investigationId: number,
  agentName: string,
  data?: Record<string, unknown>
) {
  broadcastInvestigationEvent({
    type: "agent_complete",
    investigationId,
    agentName,
    data,
    timestamp: new Date().toISOString(),
  });
}

const GROUNDED_SYSTEM_PREFIX = `You are a senior cybersecurity malware analyst for TRINETRA AI, an enterprise Android banking fraud investigation platform.

CRITICAL RULES:
- Base ALL conclusions ONLY on the forensic evidence JSON provided.
- NEVER invent permissions, APIs, domains, or behaviors not present in evidence.
- Cite specific evidence items (permissions, methods, IOCs) in every claim.
- Use professional SOC analyst language suitable for banking security teams.
- Output valid JSON when requested, with no markdown fences.`;

async function runAgent(
  agentName: AgentName,
  investigationId: number,
  evidenceContext: string,
  previousFindings: string
): Promise<AgentStructuredFinding> {
  emitAgentStart(investigationId, agentName);
  await updateAgentLog(investigationId, agentName, "running", 10);

  const systemPrompt = `${GROUNDED_SYSTEM_PREFIX}\n\n${getAgentSystemPrompt(agentName)}`;
  const userPrompt = getAgentUserPrompt(agentName, evidenceContext, previousFindings);

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat: agentName === "Risk Scoring" ? { type: "json_object" } : undefined,
    });

    const content = response.choices[0]?.message?.content;
    const rawText = typeof content === "string" ? content : "No findings generated";

    const structured = parseAgentOutput(agentName, rawText);
    await updateAgentLog(
      investigationId,
      agentName,
      "completed",
      100,
      JSON.stringify(structured)
    );
    emitAgentComplete(investigationId, agentName, {
      summary: structured.summary,
      confidence: structured.confidence,
    });

    return structured;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    await updateAgentLog(investigationId, agentName, "error", 0, undefined, msg);
    broadcastInvestigationEvent({
      type: "agent_error",
      investigationId,
      agentName,
      message: msg,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}

function parseAgentOutput(agentName: AgentName, raw: string): AgentStructuredFinding {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        agentName,
        summary: parsed.summary || raw.slice(0, 2000),
        threatLevel: parsed.threatLevel || "medium",
        confidence: Number(parsed.confidence) || 75,
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        mitigations: Array.isArray(parsed.mitigations) ? parsed.mitigations : [],
        malwareCategory: parsed.malwareCategory,
        attackVectors: parsed.attackVectors,
      };
    }
  } catch {
    /* fall through */
  }

  return {
    agentName,
    summary: raw.slice(0, 3000),
    threatLevel: "medium",
    confidence: 70,
    evidence: [],
    mitigations: [],
  };
}

function getAgentSystemPrompt(agentName: AgentName): string {
  const prompts: Record<AgentName, string> = {
    "APK Reverse Engineering":
      "Analyze APK structure from evidence: package, components, manifest, file tree. Return JSON: {summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[]}",

    "Static Malware Analysis":
      "Analyze permissions and suspicious methods from evidence. Explain dangerous API usage with citations. Return JSON: {summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[]}",

    "Dynamic Threat Investigation":
      "Predict runtime behavior ONLY from static evidence (network IOCs, dex patterns). Return JSON: {summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[]}",

    "Threat Intelligence Correlation":
      "Correlate IOCs and infrastructure from evidence. Return JSON: {summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[]}",

    "AI Malware Reasoning":
      "Synthesize evidence into attack narrative and MITRE-style techniques. Return JSON: {summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[]}. Also include attackChain array in summary text.",

    "Risk Scoring":
      'Score 0-100 based ONLY on evidence severity. Return JSON: {overallScore, dataExfiltration, credentialHarvesting, c2Communication, bankingTrojan, riskLevel, justification, summary, threatLevel, confidence, evidence, mitigations}',

    "Executive Report Generation":
      "Write C-level banking security summary from evidence only. Return JSON: {summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[]}",
  };
  return prompts[agentName];
}

function getAgentUserPrompt(
  agentName: AgentName,
  evidenceContext: string,
  previousFindings: string
): string {
  return `FORENSIC EVIDENCE (ground truth — do not go beyond this):
${evidenceContext}

${previousFindings ? `PRIOR AGENT FINDINGS:\n${previousFindings}\n` : ""}

Perform "${agentName}" analysis. Cite evidence for every claim.`;
}

function buildAttackChainFromEvidence(
  evidence: ApkEvidence,
  reasoningFinding?: AgentStructuredFinding
): AttackChainStep[] {
  const steps: AttackChainStep[] = [];
  let id = 1;

  steps.push({
    id: String(id++),
    stage: "APK Installed",
    description: `Package ${evidence.packageName} deployed on device`,
    evidence: [`SHA256: ${evidence.sha256}`, `File: ${evidence.fileSize} bytes`],
    severity: "low",
  });

  const hasAccessibility = evidence.permissions.some(
    (p) => p.name.includes("ACCESSIBILITY")
  );
  if (hasAccessibility) {
    steps.push({
      id: String(id++),
      stage: "Accessibility Permission Abuse",
      description:
        "Application requests accessibility service — enables UI automation and credential capture",
      evidence: evidence.permissions
        .filter((p) => p.name.includes("ACCESSIBILITY"))
        .map((p) => p.name),
      severity: "critical",
    });
  }

  const hasOverlay = evidence.permissions.some((p) =>
    p.name.includes("SYSTEM_ALERT_WINDOW")
  );
  if (hasOverlay) {
    steps.push({
      id: String(id++),
      stage: "Overlay Injection",
      description: "SYSTEM_ALERT_WINDOW enables phishing overlays over banking apps",
      evidence: ["android.permission.SYSTEM_ALERT_WINDOW"],
      severity: "high",
    });
  }

  const smsMethods = evidence.suspiciousMethods.filter((m) =>
    m.threatCategory.includes("sms")
  );
  if (
    smsMethods.length > 0 ||
    evidence.permissions.some((p) => p.name.includes("SMS"))
  ) {
    steps.push({
      id: String(id++),
      stage: "SMS OTP Interception",
      description:
        "SMS permissions and SmsManager patterns enable MFA bypass via OTP theft",
      evidence: [
        ...evidence.permissions.filter((p) => p.name.includes("SMS")).map((p) => p.name),
        ...smsMethods.map((m) => m.methodName),
      ],
      severity: "critical",
    });
  }

  const networkIocs = evidence.iocs.filter((i) => i.type === "network_endpoint");
  if (networkIocs.length > 0) {
    steps.push({
      id: String(id++),
      stage: "Command & Control / Exfiltration",
      description: "Network indicators suggest remote communication infrastructure",
      evidence: networkIocs.slice(0, 5).map((i) => i.value),
      severity: "high",
    });
  }

  steps.push({
    id: String(id++),
    stage: "Financial Fraud Risk",
    description:
      reasoningFinding?.summary?.slice(0, 200) ||
      "Combined indicators suggest banking fraud capability",
    evidence: reasoningFinding?.evidence?.slice(0, 5) || [],
    severity: "critical",
  });

  return steps;
}

export async function runAnalysisPipeline(
  investigationId: number,
  apkFileName: string,
  evidence: ApkEvidence,
  onLog?: BroadcastLog
): Promise<AnalysisResult> {
  const evidenceContext = evidenceToContext(evidence);
  const agentFindings: AgentStructuredFinding[] = [];
  let allFindings = "";
  let riskBreakdown: RiskScoreResult = {
    overallScore: 0,
    dataExfiltration: 0,
    credentialHarvesting: 0,
    c2Communication: 0,
    bankingTrojan: 0,
    riskLevel: "low",
    justification: "",
  };
  let threatSummary = "";
  let reasoningFinding: AgentStructuredFinding | undefined;

  await initializeAgentLogs(investigationId, [...AGENT_NAMES]);
  await updateInvestigationStatus(investigationId, "analyzing", {
    packageName: evidence.packageName,
    evidence,
    sha256Hash: evidence.sha256,
  });

  onLog?.("Initializing secure malware sandbox", 5);
  emitLog(investigationId, "Initializing secure malware sandbox", 5);

  try {
    for (const agentName of AGENT_NAMES) {
      onLog?.(`Running ${agentName}`, undefined);
      emitLog(investigationId, `Agent active: ${agentName}`, undefined, agentName);

      const finding = await runAgent(
        agentName,
        investigationId,
        `APK: ${apkFileName}\n${evidenceContext}`,
        allFindings
      );

      agentFindings.push(finding);
      allFindings += `\n\n[${agentName}]\n${JSON.stringify(finding, null, 2)}`;

      if (agentName === "AI Malware Reasoning") {
        reasoningFinding = finding;
      }

      if (agentName === "Risk Scoring") {
        try {
          const jsonMatch = finding.summary.match(/\{[\s\S]*\}/);
          const scoreData = jsonMatch
            ? JSON.parse(jsonMatch[0])
            : JSON.parse(finding.summary);
          riskBreakdown = {
            overallScore: Math.min(100, Number(scoreData.overallScore) || 0),
            dataExfiltration: Number(scoreData.dataExfiltration) || 0,
            credentialHarvesting: Number(scoreData.credentialHarvesting) || 0,
            c2Communication: Number(scoreData.c2Communication) || 0,
            bankingTrojan: Number(scoreData.bankingTrojan) || 0,
            riskLevel: scoreData.riskLevel || "low",
            justification: scoreData.justification || finding.summary,
          };
        } catch {
          riskBreakdown.overallScore = Math.min(
            100,
            Math.round(
              (riskBreakdown.dataExfiltration +
                riskBreakdown.credentialHarvesting +
                riskBreakdown.c2Communication +
                riskBreakdown.bankingTrojan) /
                4
            )
          );
        }
      }

      if (agentName === "Executive Report Generation") {
        threatSummary = finding.summary;
      }
    }

    if (!riskBreakdown.overallScore) {
      const criticalPerms = evidence.permissions.filter(
        (p) => p.riskLevel === "critical"
      ).length;
      const criticalMethods = evidence.suspiciousMethods.filter(
        (m) => m.severity === "critical"
      ).length;
      riskBreakdown.overallScore = Math.min(
        100,
        criticalPerms * 15 + criticalMethods * 10 + evidence.iocs.length * 2
      );
      riskBreakdown.bankingTrojan = Math.min(
        100,
        criticalPerms * 20 + (evidence.permissions.some((p) => p.name.includes("SMS")) ? 30 : 0)
      );
      riskBreakdown.credentialHarvesting = evidence.permissions.some((p) =>
        p.name.includes("ACCESSIBILITY")
      )
        ? 85
        : 20;
      riskBreakdown.c2Communication = Math.min(
        100,
        evidence.iocs.filter((i) => i.type === "network_endpoint").length * 15
      );
      riskBreakdown.dataExfiltration = Math.min(100, evidence.iocs.length * 5);
    }

    riskBreakdown.riskLevel =
      riskBreakdown.overallScore >= 80
        ? "critical"
        : riskBreakdown.overallScore >= 60
          ? "high"
          : riskBreakdown.overallScore >= 40
            ? "medium"
            : "low";

    const attackChain = buildAttackChainFromEvidence(evidence, reasoningFinding);
    const mitigations = [
      ...new Set(agentFindings.flatMap((f) => f.mitigations)),
    ].slice(0, 12);

    if (mitigations.length === 0) {
      mitigations.push(
        "Quarantine APK from enterprise devices",
        "Block package at MDM level",
        "Monitor for related IOCs on network perimeter"
      );
    }

    for (const ioc of evidence.iocs) {
      await createIOC(
        investigationId,
        ioc.type,
        ioc.value,
        ioc.severity,
        ioc.description
      );
    }

    await updateInvestigationStatus(investigationId, "completed", {
      riskScore: riskBreakdown.overallScore,
      riskLevel: riskBreakdown.riskLevel,
      threatSummary,
      aiReasoning: allFindings,
      mitigations,
      evidence,
      attackChain,
      riskBreakdown,
      packageName: evidence.packageName,
      sha256Hash: evidence.sha256,
    });

    onLog?.("Generating executive threat report", 100);
    emitLog(investigationId, "Investigation complete", 100);

    broadcastInvestigationEvent({
      type: "investigation_complete",
      investigationId,
      timestamp: new Date().toISOString(),
      data: {
        riskScore: riskBreakdown.overallScore,
        riskBreakdown,
        threatSummary,
        mitigations,
        iocCount: evidence.iocs.length,
        packageName: evidence.packageName,
        attackChain,
      },
    });

    return {
      iocs: evidence.iocs,
      findings: allFindings,
      riskScore: riskBreakdown.overallScore,
      riskBreakdown,
      threatSummary,
      mitigations,
      attackChain,
      agentFindings,
    };
  } catch (error) {
    await updateInvestigationStatus(investigationId, "failed");
    throw error;
  }
}

export async function askSocCopilot(
  investigationId: number,
  evidence: ApkEvidence | null,
  investigationSummary: string,
  userQuery: string,
  chatHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const evidenceContext = evidence
    ? evidenceToContext(evidence)
    : "No forensic evidence available.";

  const messages = [
    {
      role: "system" as const,
      content: `${GROUNDED_SYSTEM_PREFIX}

You are the TRINETRA AI SOC Copilot. Answer questions about this investigation using ONLY the evidence and findings below. Be concise, professional, and cite evidence.`,
    },
    {
      role: "user" as const,
      content: `INVESTIGATION #${investigationId}\nEVIDENCE:\n${evidenceContext}\n\nFINDINGS:\n${investigationSummary.slice(0, 8000)}\n\nCHAT HISTORY:\n${chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nANALYST QUESTION: ${userQuery}`,
    },
  ];

  const response = await invokeLLM({ messages });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "Unable to generate response.";
}

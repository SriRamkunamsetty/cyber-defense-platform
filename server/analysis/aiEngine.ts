import { invokeLLM } from "../_core/llm";
import {
  updateAgentLog,
  updateInvestigationStatus,
  createIOC,
  initializeAgentLogs,
} from "../db";
import { broadcastInvestigationEvent } from "../websocket";
import type {
  AgentStructuredFinding,
  AttackChainStep,
  RiskScoreResult,
} from "../../shared/evidence";
import {
  AGENT_NAMES,
  RULE_BASED_AGENTS,
  type AgentName,
} from "../../shared/evidence";
import type {
  ConsensusResult,
  InvestigationMemory,
  ValidatedForensicBundle,
} from "../../shared/forensics";
import { evidenceToContext } from "./apkAnalyzer";
import { runRuleBasedAgent } from "./agents/ruleBasedAgents";
import { groundAgentFinding } from "./agents/evidenceGrounding";
import { runConsensusEngine } from "./agents/consensusEngine";
import {
  createInvestigationMemory,
  memoryToPromptContext,
} from "./agents/investigationMemory";
import { agentFindingSchema, riskScoreSchema } from "./agents/structuredSchemas";
import { mapEvidenceToMitre } from "./intelligence/ragRetriever";

export interface AnalysisResult {
  iocs: ValidatedForensicBundle["evidence"]["iocs"];
  findings: string;
  riskScore: number;
  riskBreakdown: RiskScoreResult;
  threatSummary: string;
  mitigations: string[];
  attackChain: AttackChainStep[];
  agentFindings: AgentStructuredFinding[];
  consensus: ConsensusResult;
  memory: InvestigationMemory;
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

const GROUNDED_SYSTEM_PREFIX = `You are a senior cybersecurity malware analyst for TRINETRA AI — an enterprise autonomous cyber forensics and banking fraud defense platform.

CRITICAL FORENSIC RULES:
- Base ALL conclusions ONLY on the forensic evidence JSON and RAG threat intelligence provided.
- NEVER invent permissions, APIs, domains, IPs, or behaviors not present in evidence.
- NEVER speculate about runtime behavior without labeling it as "static-inferred".
- Cite specific evidence items in every claim using exact values from the evidence.
- Output valid JSON only when requested — no markdown fences.
- If evidence is insufficient, state "insufficient evidence" and lower confidence.`;

async function runLlmAgent(
  agentName: AgentName,
  investigationId: number,
  evidenceContext: string,
  ragContext: string,
  memoryContext: string
): Promise<AgentStructuredFinding> {
  emitAgentStart(investigationId, agentName);
  await updateAgentLog(investigationId, agentName, "running", 10);

  const systemPrompt = `${GROUNDED_SYSTEM_PREFIX}\n\n${getAgentSystemPrompt(agentName)}`;
  const userPrompt = getAgentUserPrompt(
    agentName,
    evidenceContext,
    ragContext,
    memoryContext
  );

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      responseFormat:
        agentName === "Risk Scoring" ? { type: "json_object" } : undefined,
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
      summary: structured.summary.slice(0, 200),
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
      if (agentName === "Risk Scoring") {
        const validated = riskScoreSchema.safeParse(parsed);
        if (validated.success) {
          const d = validated.data;
          return {
            agentName,
            summary: JSON.stringify(d),
            threatLevel:
              d.riskLevel === "critical"
                ? "critical"
                : d.riskLevel === "high"
                  ? "high"
                  : d.riskLevel === "medium"
                    ? "medium"
                    : "low",
            confidence: d.confidence ?? 85,
            evidence: d.evidence || [],
            mitigations: d.mitigations || [],
          };
        }
      }
      const validated = agentFindingSchema.safeParse(parsed);
      if (validated.success) {
        const d = validated.data;
        return {
          agentName,
          summary: d.summary,
          threatLevel: d.threatLevel,
          confidence: d.confidence,
          evidence: d.evidence,
          mitigations: d.mitigations,
          malwareCategory: d.malwareCategory,
          attackVectors: d.attackVectors,
          mitreTechniques: d.mitreTechniques,
          citations: d.citations,
        };
      }
    }
  } catch {
    /* fall through */
  }

  return {
    agentName,
    summary: raw.slice(0, 3000),
    threatLevel: "medium",
    confidence: 60,
    evidence: [],
    mitigations: [],
  };
}

function getAgentSystemPrompt(agentName: AgentName): string {
  const jsonSchema =
    '{summary, threatLevel, confidence, evidence[], mitigations[], malwareCategory, attackVectors[], mitreTechniques[], citations[]}';

  const prompts: Record<AgentName, string> = {
    "APK Reverse Engineering": `Analyze APK structure from evidence only. Return JSON: ${jsonSchema}`,
    "Static Malware Analysis": `Analyze permissions, methods, static findings. Cite evidence. Return JSON: ${jsonSchema}`,
    "Behavioral Analysis": "Rule-based agent — do not use.",
    "Dynamic Threat Investigation": `Predict runtime behavior ONLY from static evidence. Label inferences as static-inferred. Return JSON: ${jsonSchema}`,
    "Malware DNA Profiling": "Rule-based agent — do not use.",
    "IOC Correlation": "Rule-based agent — do not use.",
    "Threat Intelligence Correlation": `Correlate IOCs with RAG threat intel. Return JSON: ${jsonSchema}`,
    "Attack Chain Reconstruction": "Rule-based agent — do not use.",
    "AI Malware Reasoning": `Synthesize evidence into attack narrative with MITRE techniques from evidence only. Return JSON: ${jsonSchema}`,
    "Fraud Intelligence": `Analyze banking fraud indicators from evidence only. Return JSON: ${jsonSchema}`,
    "Risk Scoring": `Score 0-100 from evidence only. Return JSON: {overallScore, dataExfiltration, credentialHarvesting, c2Communication, bankingTrojan, riskLevel, justification, evidence[], mitigations[]}`,
    "Executive Report Generation": `C-level banking security summary from evidence only. Return JSON: ${jsonSchema}`,
  };
  return prompts[agentName];
}

function getAgentUserPrompt(
  agentName: AgentName,
  evidenceContext: string,
  ragContext: string,
  memoryContext: string
): string {
  return `FORENSIC EVIDENCE (ground truth — do not exceed this):
${evidenceContext}

THREAT INTELLIGENCE (RAG — use for correlation only):
${ragContext}

${memoryContext ? `INVESTIGATION MEMORY:\n${memoryContext}\n` : ""}

Perform "${agentName}" analysis. Every claim must cite evidence values.`;
}

function computeHeuristicRisk(evidence: ValidatedForensicBundle["evidence"]): RiskScoreResult {
  const criticalPerms = evidence.permissions.filter(
    (p) => p.riskLevel === "critical"
  ).length;
  const criticalMethods = evidence.suspiciousMethods.filter(
    (m) => m.severity === "critical"
  ).length;
  const criticalStatic = (evidence.staticFindings || []).filter(
    (f) => f.severity === "critical"
  ).length;

  const overallScore = Math.min(
    100,
    criticalPerms * 12 +
      criticalMethods * 10 +
      criticalStatic * 8 +
      evidence.iocs.filter((i) => i.severity === "critical").length * 5
  );

  return {
    overallScore,
    dataExfiltration: Math.min(100, evidence.iocs.length * 5),
    credentialHarvesting: evidence.permissions.some((p) =>
      p.name.includes("ACCESSIBILITY")
    )
      ? 85
      : 20,
    c2Communication: Math.min(
      100,
      evidence.iocs.filter((i) => i.type === "network_endpoint").length * 15
    ),
    bankingTrojan: Math.min(
      100,
      criticalPerms * 15 +
        (evidence.permissions.some((p) => p.name.includes("SMS")) ? 25 : 0)
    ),
    riskLevel:
      overallScore >= 80
        ? "critical"
        : overallScore >= 60
          ? "high"
          : overallScore >= 40
            ? "medium"
            : "low",
    justification: "Heuristic risk from validated forensic evidence.",
  };
}

export async function runAnalysisPipeline(
  investigationId: number,
  apkFileName: string,
  bundle: ValidatedForensicBundle,
  onLog?: BroadcastLog
): Promise<AnalysisResult> {
  const evidence = bundle.evidence;
  const evidenceContext = `APK: ${apkFileName}\n${evidenceToContext(evidence)}`;
  const ragContext = bundle.ragContext;
  const agentFindings: AgentStructuredFinding[] = [];
  let riskBreakdown: RiskScoreResult = computeHeuristicRisk(evidence);
  let threatSummary = "";
  let memory: InvestigationMemory | undefined;

  await initializeAgentLogs(investigationId, [...AGENT_NAMES]);
  await updateInvestigationStatus(investigationId, "analyzing", {
    packageName: evidence.packageName,
    evidence,
    sha256Hash: evidence.sha256,
    attackChain: bundle.attackChain,
  });

  onLog?.("Initializing autonomous forensic investigation", 5);
  emitLog(
    investigationId,
    `Forensic confidence: ${bundle.forensicConfidence}% — launching 12 agents`,
    5
  );

  try {
    for (const agentName of AGENT_NAMES) {
      onLog?.(`Agent: ${agentName}`, undefined);
      emitLog(investigationId, `Agent active: ${agentName}`, undefined, agentName);

      let finding: AgentStructuredFinding;

      if (RULE_BASED_AGENTS.includes(agentName)) {
        emitAgentStart(investigationId, agentName);
        await updateAgentLog(investigationId, agentName, "running", 10);
        finding = runRuleBasedAgent(agentName, bundle);
        await updateAgentLog(
          investigationId,
          agentName,
          "completed",
          100,
          JSON.stringify(finding)
        );
        emitAgentComplete(investigationId, agentName, {
          summary: finding.summary.slice(0, 200),
          ruleBased: true,
        });
      } else {
        const memCtx = memory ? memoryToPromptContext(memory) : "";
        finding = await runLlmAgent(
          agentName,
          investigationId,
          evidenceContext,
          ragContext,
          memCtx
        );
        finding = groundAgentFinding(finding, evidence);
      }

      agentFindings.push(finding);
      memory = createInvestigationMemory(
        investigationId,
        bundle,
        agentFindings
      );

      if (agentName === "Risk Scoring") {
        try {
          const jsonMatch = finding.summary.match(/\{[\s\S]*\}/);
          const scoreData = jsonMatch
            ? JSON.parse(jsonMatch[0])
            : JSON.parse(finding.summary);
          const validated = riskScoreSchema.safeParse(scoreData);
          if (validated.success) {
            const d = validated.data;
            riskBreakdown = {
              overallScore: Math.min(100, Number(d.overallScore) || 0),
              dataExfiltration: Number(d.dataExfiltration) || 0,
              credentialHarvesting: Number(d.credentialHarvesting) || 0,
              c2Communication: Number(d.c2Communication) || 0,
              bankingTrojan: Number(d.bankingTrojan) || 0,
              riskLevel: d.riskLevel,
              justification: d.justification,
            };
          }
        } catch {
          riskBreakdown = computeHeuristicRisk(evidence);
        }
      }

      if (agentName === "Executive Report Generation") {
        threatSummary = finding.summary;
      }
    }

    onLog?.("Running multi-agent consensus validation", 95);
    emitLog(investigationId, "Consensus engine validating findings", 95);

    const consensus = runConsensusEngine(bundle, agentFindings);
    memory = createInvestigationMemory(
      investigationId,
      bundle,
      agentFindings,
      consensus
    );

    if (!riskBreakdown.overallScore) {
      riskBreakdown = computeHeuristicRisk(evidence);
    }

    riskBreakdown.riskLevel =
      riskBreakdown.overallScore >= 80
        ? "critical"
        : riskBreakdown.overallScore >= 60
          ? "high"
          : riskBreakdown.overallScore >= 40
            ? "medium"
            : "low";

    const attackChain = bundle.attackChain;
    const mitreMappings = mapEvidenceToMitre(evidence);

    const mitigations = [
      ...Array.from(new Set(agentFindings.flatMap((f) => f.mitigations))),
      ...mitreMappings.flatMap((m) =>
        m.evidenceRefs.length > 0
          ? [`MITRE ${m.techniqueId}: Review ${m.techniqueName}`]
          : []
      ),
    ].slice(0, 15);

    if (mitigations.length === 0) {
      mitigations.push(
        "Quarantine APK from enterprise devices",
        "Block package at MDM level",
        "Monitor for related IOCs on network perimeter"
      );
    }

    const allFindings =
      agentFindings.map((f) => `[${f.agentName}]\n${JSON.stringify(f, null, 2)}`).join("\n\n") +
      `\n\n[CONSENSUS]\n${JSON.stringify(consensus, null, 2)}`;

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
      threatSummary: threatSummary || consensus.threatClassification,
      aiReasoning: allFindings,
      mitigations,
      evidence,
      attackChain,
      riskBreakdown,
      consensus,
      packageName: evidence.packageName,
      sha256Hash: evidence.sha256,
    });

    onLog?.("Forensic investigation complete", 100);
    emitLog(investigationId, "Investigation complete — consensus validated", 100);

    broadcastInvestigationEvent({
      type: "investigation_complete",
      investigationId,
      timestamp: new Date().toISOString(),
      data: {
        riskScore: riskBreakdown.overallScore,
        riskBreakdown,
        threatSummary: threatSummary || consensus.threatClassification,
        mitigations,
        iocCount: evidence.iocs.length,
        packageName: evidence.packageName,
        attackChain,
        consensus,
        forensicConfidence: bundle.forensicConfidence,
      },
    });

    return {
      iocs: evidence.iocs,
      findings: allFindings,
      riskScore: riskBreakdown.overallScore,
      riskBreakdown,
      threatSummary: threatSummary || consensus.threatClassification,
      mitigations,
      attackChain,
      agentFindings,
      consensus,
      memory,
    };
  } catch (error) {
    await updateInvestigationStatus(investigationId, "failed");
    throw error;
  }
}

export async function askSocCopilot(
  investigationId: number,
  evidence: ValidatedForensicBundle["evidence"] | null,
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

You are the TRINETRA AI SOC Copilot. Answer using ONLY evidence and findings. Be concise and cite evidence.`,
    },
    {
      role: "user" as const,
      content: `INVESTIGATION #${investigationId}\nEVIDENCE:\n${evidenceContext}\n\nFINDINGS:\n${investigationSummary.slice(0, 8000)}\n\nCHAT:\n${chatHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nQUESTION: ${userQuery}`,
    },
  ];

  const response = await invokeLLM({ messages });
  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "Unable to generate response.";
}

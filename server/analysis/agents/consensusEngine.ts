import type { AgentStructuredFinding } from "../../../shared/evidence";
import type { ConsensusResult, ValidatedForensicBundle } from "../../../shared/forensics";

/** Multi-agent consensus — cross-validate findings, reduce false positives */
export function runConsensusEngine(
  bundle: ValidatedForensicBundle,
  agentFindings: AgentStructuredFinding[]
): ConsensusResult {
  const highThreatAgents = agentFindings.filter(
    (f) => f.threatLevel === "high" || f.threatLevel === "critical"
  );
  const criticalStatic = bundle.staticFindings.filter(
    (f) => f.severity === "critical"
  ).length;

  const agentAgreementScore =
    agentFindings.length > 0
      ? Math.round(
          (highThreatAgents.length / Math.max(1, agentFindings.length)) * 100
        )
      : 0;

  const forensicConfidence = bundle.forensicConfidence;
  const avgAgentConfidence =
    agentFindings.length > 0
      ? agentFindings.reduce((s, f) => s + f.confidence, 0) / agentFindings.length
      : 0;

  const overallConfidence = Math.round(
    forensicConfidence * 0.45 + avgAgentConfidence * 0.35 + agentAgreementScore * 0.2
  );

  const validatedFindings: string[] = [];
  const disputedFindings: string[] = [];
  const falsePositiveFlags: string[] = [];

  for (const f of agentFindings) {
    if (f.evidence.length >= 2 && f.confidence >= 70) {
      validatedFindings.push(`[${f.agentName}] ${f.summary.slice(0, 200)}`);
    } else if (f.evidence.length === 0 && !f.ruleBased) {
      disputedFindings.push(`[${f.agentName}] Low evidence citations — review manually`);
      falsePositiveFlags.push(f.agentName);
    }
  }

  for (const sf of bundle.staticFindings.filter((f) => f.severity === "critical")) {
    validatedFindings.push(`[Forensic] ${sf.title}: ${sf.description.slice(0, 150)}`);
  }

  if (criticalStatic >= 2 && highThreatAgents.length >= 2) {
    validatedFindings.push(
      "Consensus: Multiple critical static findings corroborated by AI agents."
    );
  }

  const familyTop = bundle.malwareDna.familyMatches[0];
  const threatClassification = familyTop
    ? `${familyTop.family} (${familyTop.similarity}% similarity)`
    : highThreatAgents.length > 0
      ? "Suspicious — multi-indicator malware pattern"
      : "Low confidence — limited forensic indicators";

  const evidenceBackedConclusions = [
    `Forensic confidence: ${forensicConfidence}/100`,
    `Agent agreement: ${agentAgreementScore}%`,
    `Static critical findings: ${criticalStatic}`,
    `IOC count: ${bundle.evidence.iocs.length}`,
    ...(familyTop ? [`Top family match: ${familyTop.family}`] : []),
  ];

  return {
    threatClassification,
    overallConfidence,
    forensicConfidence,
    agentAgreementScore,
    validatedFindings: validatedFindings.slice(0, 15),
    disputedFindings: disputedFindings.slice(0, 8),
    evidenceBackedConclusions,
    falsePositiveFlags,
  };
}

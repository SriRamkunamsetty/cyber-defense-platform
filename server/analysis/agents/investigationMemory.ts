import type { AgentStructuredFinding } from "../../../shared/evidence";
import type {
  ConsensusResult,
  InvestigationMemory,
  ValidatedForensicBundle,
} from "../../../shared/forensics";
import { evidenceToContext } from "../apkAnalyzer";

export function createInvestigationMemory(
  investigationId: number,
  bundle: ValidatedForensicBundle,
  agentFindings: AgentStructuredFinding[],
  consensus?: ConsensusResult
): InvestigationMemory {
  const agentSummaries: Record<string, string> = {};
  for (const f of agentFindings) {
    agentSummaries[f.agentName] = f.summary.slice(0, 500);
  }

  return {
    investigationId,
    packageName: bundle.evidence.packageName,
    sha256: bundle.evidence.sha256,
    stage: consensus ? "consensus_complete" : "agents_complete",
    accumulatedFindings: agentFindings
      .map((f) => `[${f.agentName}] ${f.summary}`)
      .join("\n\n")
      .slice(0, 12000),
    evidenceSnapshot: evidenceToContext(bundle.evidence),
    agentSummaries,
    consensus,
  };
}

export function memoryToPromptContext(memory: InvestigationMemory): string {
  return `INVESTIGATION MEMORY
Package: ${memory.packageName}
SHA256: ${memory.sha256}
Stage: ${memory.stage}

${memory.consensus ? `CONSENSUS: ${JSON.stringify(memory.consensus, null, 2)}\n` : ""}
PRIOR AGENT SUMMARIES:
${Object.entries(memory.agentSummaries)
  .map(([k, v]) => `[${k}] ${v}`)
  .join("\n")}`;
}

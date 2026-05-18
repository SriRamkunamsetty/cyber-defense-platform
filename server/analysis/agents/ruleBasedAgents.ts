import type { AgentStructuredFinding, AgentName } from "../../../shared/evidence";
import type { ValidatedForensicBundle } from "../../../shared/forensics";

export function runRuleBasedAgent(
  agentName: AgentName,
  bundle: ValidatedForensicBundle
): AgentStructuredFinding {
  const { evidence, staticFindings, behavioralFindings, malwareDna, attackChain, infrastructureIntel } =
    bundle;

  switch (agentName) {
    case "Behavioral Analysis": {
      const findings = behavioralFindings;
      const level =
        findings.some((f) => f.severity === "critical")
          ? "critical"
          : findings.some((f) => f.severity === "high")
            ? "high"
            : "medium";
      return {
        agentName,
        summary: `Static-inferred behavioral analysis identified ${findings.length} behavior pattern(s). ${findings.map((f) => f.title).join("; ") || "No high-risk behaviors."}`,
        threatLevel: level as AgentStructuredFinding["threatLevel"],
        confidence: 92,
        evidence: findings.flatMap((f) => f.evidenceRefs).slice(0, 12),
        mitigations: [
          "Monitor network egress for listed IOCs",
          "Deploy runtime behavior monitoring in production sandbox",
        ],
        ruleBased: true,
        mitreTechniques: findings.map((f) => f.mitreTechnique).filter(Boolean) as string[],
      };
    }

    case "Malware DNA Profiling": {
      const top = malwareDna.familyMatches[0];
      return {
        agentName,
        summary: top
          ? `Malware DNA profile ${malwareDna.fingerprintId} matches ${top.family} with ${top.similarity}% similarity. ${top.description}`
          : `Malware DNA profile ${malwareDna.fingerprintId} generated. No strong family match — novel or benign variant.`,
        threatLevel: top && top.similarity >= 70 ? "high" : "medium",
        confidence: 94,
        evidence: [
          ...malwareDna.permissionSignature,
          ...malwareDna.apiSignature,
          ...malwareDna.infrastructureSignature.slice(0, 5),
        ],
        mitigations: ["Compare DNA hash against threat intel feeds"],
        malwareCategory: top?.family,
        ruleBased: true,
      };
    }

    case "IOC Correlation": {
      const correlated = evidence.iocs.length;
      const critical = evidence.iocs.filter((i) => i.severity === "critical").length;
      return {
        agentName,
        summary: `Correlated ${correlated} IOC(s) across manifest, code, and strings. ${critical} critical indicator(s). Infrastructure enrichment: ${infrastructureIntel.length} entries.`,
        threatLevel: critical > 0 ? "critical" : correlated > 5 ? "high" : "medium",
        confidence: 96,
        evidence: evidence.iocs.slice(0, 15).map((i) => `${i.type}: ${i.value}`),
        mitigations: [
          "Block critical IOCs at perimeter",
          "Hunt for related samples with same DNA profile",
        ],
        ruleBased: true,
      };
    }

    case "Attack Chain Reconstruction": {
      return {
        agentName,
        summary: `Reconstructed ${attackChain.length}-stage attack chain from forensic evidence. Stages: ${attackChain.map((s) => s.stage).join(" → ")}.`,
        threatLevel: attackChain.some((s) => s.severity === "critical")
          ? "critical"
          : "high",
        confidence: 95,
        evidence: attackChain.flatMap((s) => s.evidence).slice(0, 12),
        mitigations: attackChain.map((s) => `Mitigate stage: ${s.stage}`).slice(0, 4),
        attackVectors: attackChain.map((s) => s.stage),
        ruleBased: true,
      };
    }

    default:
      return {
        agentName,
        summary: "Rule-based agent completed.",
        threatLevel: "low",
        confidence: 80,
        evidence: [],
        mitigations: [],
        ruleBased: true,
      };
  }
}

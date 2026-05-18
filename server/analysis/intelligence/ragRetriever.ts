import type { ApkEvidence } from "../../../shared/evidence";
import { searchThreatKnowledge, type ThreatKnowledgeEntry } from "./threatKnowledgeBase";

/** Build RAG context from local threat knowledge + forensic evidence keywords */
export function buildRagContext(evidence: ApkEvidence): string {
  const keywords: string[] = [
    ...evidence.permissions.map((p) => p.name),
    ...evidence.suspiciousMethods.map((m) => m.threatCategory + " " + m.methodName),
    ...evidence.iocs.map((i) => i.type + " " + i.description),
    ...(evidence.staticFindings || []).map((f) => f.category + " " + f.title),
  ];

  const query = keywords.join(" ").slice(0, 4000);
  const entries = searchThreatKnowledge(query, 6);

  if (entries.length === 0) {
    return "No matching threat intelligence entries from local knowledge base.";
  }

  return entries
    .map(
      (e: ThreatKnowledgeEntry) =>
        `[${e.techniqueId}] ${e.techniqueName} (${e.tactic}): ${e.description}\nMitigations: ${e.mitigations.join("; ")}`
    )
    .join("\n\n");
}

export function mapEvidenceToMitre(evidence: ApkEvidence) {
  const query = [
    ...(evidence.staticFindings || []).map((f) => f.mitreTechnique || f.category),
    ...evidence.suspiciousMethods.map((m) => m.threatCategory),
  ].join(" ");

  return searchThreatKnowledge(query, 8).map((e) => ({
    techniqueId: e.techniqueId,
    techniqueName: e.techniqueName,
    tactic: e.tactic,
    evidenceRefs: e.keywords.filter((kw) =>
      query.toLowerCase().includes(kw.toLowerCase())
    ),
  }));
}

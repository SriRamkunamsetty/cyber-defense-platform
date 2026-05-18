import type { ApkEvidence, ExtractedIOC } from "../../../shared/evidence";
import type { EvidenceItem, ValidatedForensicBundle } from "../../../shared/forensics";
import { runAdvancedStaticAnalysis } from "./staticAnalyzer";
import { inferBehavioralFindings } from "./behavioralAnalyzer";
import { buildMalwareDnaProfile } from "./malwareDnaProfiler";
import { reconstructAttackChain } from "./attackChainEngine";
import { enrichInfrastructure } from "./infrastructureIntel";

let evidenceItemId = 0;

function dedupeIocs(iocs: ExtractedIOC[]): ExtractedIOC[] {
  const seen = new Set<string>();
  return iocs.filter((ioc) => {
    const key = `${ioc.type}:${ioc.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildEvidenceItems(evidence: ApkEvidence): EvidenceItem[] {
  evidenceItemId = 0;
  const items: EvidenceItem[] = [];

  const add = (
    category: EvidenceItem["category"],
    value: string,
    severity: EvidenceItem["severity"],
    source: string,
    description: string,
    confidence: number
  ) => {
    items.push({
      id: `EV-${++evidenceItemId}`,
      category,
      value: value.slice(0, 500),
      severity,
      confidence,
      source,
      description,
    });
  };

  for (const p of evidence.permissions) {
    add("permission", p.name, p.riskLevel, "manifest", p.abuseDescription, 95);
  }
  for (const m of evidence.suspiciousMethods.slice(0, 40)) {
    add("code", m.methodName, m.severity, m.filePath, m.threatCategory, 90);
  }
  for (const ioc of evidence.iocs) {
    add(
      "ioc",
      ioc.value,
      ioc.severity,
      ioc.source,
      ioc.description,
      ioc.severity === "critical" ? 92 : 80
    );
  }
  for (const c of evidence.certificates || []) {
    add("certificate", c.subject, "low", "META-INF", `Issuer: ${c.issuer}`, 85);
  }

  return items;
}

function computeForensicConfidence(
  evidence: ApkEvidence,
  items: EvidenceItem[],
  staticFindings: ReturnType<typeof runAdvancedStaticAnalysis>
): number {
  let score = 40;
  if (evidence.manifestXml) score += 15;
  if (evidence.toolsUsed.includes("jadx")) score += 15;
  if (evidence.toolsUsed.includes("apktool")) score += 10;
  score += Math.min(20, items.length * 0.5);
  score += Math.min(15, staticFindings.length * 2);
  if (evidence.suspiciousMethods.length > 0) score += 5;
  return Math.min(100, Math.round(score));
}

export function validateAndEnrichEvidence(
  raw: ApkEvidence,
  ragContext: string
): ValidatedForensicBundle {
  const iocs = dedupeIocs(raw.iocs);
  const staticFindings = runAdvancedStaticAnalysis({ ...raw, iocs });
  const behavioralFindings = inferBehavioralFindings({ ...raw, iocs, staticFindings });
  const malwareDna = buildMalwareDnaProfile({
    ...raw,
    iocs,
    staticFindings,
    behavioralFindings,
  });
  const infrastructureIntel = enrichInfrastructure(iocs);
  const evidenceItems = buildEvidenceItems({ ...raw, iocs });
  const forensicConfidence = computeForensicConfidence(raw, evidenceItems, staticFindings);

  const evidence: ApkEvidence = {
    ...raw,
    iocs,
    staticFindings,
    behavioralFindings,
    malwareDna,
    infrastructureIntel,
    forensicConfidence,
  };

  const attackChain = reconstructAttackChain(
    evidence,
    staticFindings,
    behavioralFindings
  );

  const validationNotes: string[] = [];
  if (!raw.manifestXml) {
    validationNotes.push("Manifest not fully decoded — some findings from ZIP/heuristic scan.");
  }
  if (raw.suspiciousMethods.length === 0) {
    validationNotes.push("No decompiled code patterns — install JADX for deeper analysis.");
  }
  validationNotes.push(
    `Validated ${evidenceItems.length} evidence items, ${staticFindings.length} static findings.`
  );

  return {
    evidence,
    evidenceItems,
    staticFindings,
    behavioralFindings,
    malwareDna,
    infrastructureIntel,
    attackChain,
    ragContext,
    validationNotes,
    forensicConfidence,
  };
}

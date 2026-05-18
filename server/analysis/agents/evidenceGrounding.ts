import type { AgentStructuredFinding } from "../../../shared/evidence";
import type { ApkEvidence } from "../../../shared/evidence";

/** Build allowlist of strings that may appear in AI citations */
export function buildEvidenceAllowlist(evidence: ApkEvidence): Set<string> {
  const allow = new Set<string>();

  const add = (s: string) => {
    const normalized = s.toLowerCase().trim();
    if (normalized.length >= 4) allow.add(normalized);
    // Also add substrings for permission short names
    if (normalized.includes(".")) {
      const parts = normalized.split(".");
      parts.forEach((p) => {
        if (p.length >= 4) allow.add(p);
      });
    }
  };

  add(evidence.packageName);
  add(evidence.sha256);
  evidence.permissions.forEach((p) => add(p.name));
  evidence.suspiciousMethods.forEach((m) => {
    add(m.methodName);
    add(m.threatCategory);
    add(m.className);
  });
  evidence.iocs.forEach((i) => add(i.value));
  (evidence.embeddedStrings || []).forEach((s) => add(s.value));
  (evidence.staticFindings || []).forEach((f) => {
    add(f.title);
    f.evidenceRefs.forEach(add);
  });

  return allow;
}

function isGrounded(claim: string, allowlist: Set<string>): boolean {
  const lower = claim.toLowerCase();
  for (const allowed of Array.from(allowlist)) {
    if (allowed.length >= 5 && lower.includes(allowed)) return true;
  }
  return claim.length < 30;
}

/** Filter AI evidence citations to those backed by forensic allowlist */
export function groundAgentFinding(
  finding: AgentStructuredFinding,
  evidence: ApkEvidence
): AgentStructuredFinding {
  const allowlist = buildEvidenceAllowlist(evidence);
  const groundedEvidence = finding.evidence.filter((e) => isGrounded(e, allowlist));
  const groundedCitations = (finding.citations || []).filter((c) =>
    isGrounded(c, allowlist)
  );

  const confidencePenalty =
    finding.evidence.length > 0 && groundedEvidence.length < finding.evidence.length * 0.5
      ? 15
      : 0;

  return {
    ...finding,
    evidence: groundedEvidence.length > 0 ? groundedEvidence : finding.evidence.slice(0, 5),
    citations: groundedCitations,
    confidence: Math.max(0, finding.confidence - confidencePenalty),
  };
}

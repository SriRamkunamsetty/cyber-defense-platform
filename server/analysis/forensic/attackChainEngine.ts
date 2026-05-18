import type { ApkEvidence, AttackChainStep } from "../../../shared/evidence";
import type { StaticBehaviorFinding } from "../../../shared/forensics";

/** Reconstruct evidence-backed attack kill chain */
export function reconstructAttackChain(
  evidence: ApkEvidence,
  staticFindings: StaticBehaviorFinding[],
  behavioralFindings: StaticBehaviorFinding[]
): AttackChainStep[] {
  const steps: AttackChainStep[] = [];
  let id = 1;

  const push = (
    stage: string,
    description: string,
    evidenceRefs: string[],
    severity: AttackChainStep["severity"]
  ) => {
    steps.push({
      id: String(id++),
      stage,
      description,
      evidence: evidenceRefs,
      severity,
    });
  };

  push(
    "APK Installation",
    `Package ${evidence.packageName} deployed on device`,
    [`SHA256: ${evidence.sha256}`, `Size: ${evidence.fileSize} bytes`],
    "low"
  );

  const categories = new Set([
    ...staticFindings.map((f) => f.category),
    ...behavioralFindings.map((f) => f.category),
  ]);

  if (categories.has("banking_trojan") || categories.has("overlay_attack")) {
    push(
      "Accessibility / Overlay Abuse",
      "Accessibility or overlay capabilities enable UI automation and phishing over banking apps.",
      staticFindings
        .filter((f) =>
          ["banking_trojan", "overlay_attack"].includes(f.category)
        )
        .flatMap((f) => f.evidenceRefs),
      "critical"
    );
  }

  if (categories.has("sms_interception")) {
    push(
      "OTP / SMS Interception",
      "SMS permissions and APIs enable MFA bypass via OTP theft.",
      staticFindings
        .filter((f) => f.category === "sms_interception")
        .flatMap((f) => f.evidenceRefs),
      "critical"
    );
  }

  if (categories.has("overlay_rendering") || categories.has("overlay_attack")) {
    push(
      "Credential Harvesting",
      "Overlay and accessibility patterns support credential capture from banking applications.",
      [
        ...staticFindings
          .filter((f) => f.category === "overlay_attack")
          .flatMap((f) => f.evidenceRefs),
        ...behavioralFindings
          .filter((f) => f.category === "overlay_rendering")
          .flatMap((f) => f.evidenceRefs),
      ],
      "critical"
    );
  }

  if (categories.has("dynamic_loading") || categories.has("persistence")) {
    push(
      "Payload Delivery / Persistence",
      "Dynamic loading or install permissions support secondary payload deployment.",
      staticFindings
        .filter((f) =>
          ["dynamic_loading", "persistence"].includes(f.category)
        )
        .flatMap((f) => f.evidenceRefs),
      "high"
    );
  }

  const networkIocs = evidence.iocs.filter((i) => i.type === "network_endpoint");
  if (networkIocs.length > 0 || categories.has("c2_infrastructure")) {
    push(
      "Command & Control / Exfiltration",
      "Network or Telegram indicators suggest remote C2 or data exfiltration infrastructure.",
      networkIocs.slice(0, 6).map((i) => i.value),
      "high"
    );
  }

  push(
    "Financial Fraud Risk",
    "Combined forensic indicators suggest capability for banking fraud — requires enterprise quarantine.",
    [
      `Forensic confidence: ${evidence.forensicConfidence ?? "N/A"}`,
      `Family matches: ${evidence.malwareDna?.familyMatches?.length ?? 0}`,
    ],
    steps.some((s) => s.severity === "critical") ? "critical" : "high"
  );

  return steps;
}

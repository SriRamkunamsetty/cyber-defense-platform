import type { ExtractedIOC } from "../../../shared/evidence";
import type { InfrastructureIntel } from "../../../shared/forensics";

const SUSPICIOUS_TLDS = [".tk", ".xyz", ".ru", ".cn", ".top", ".buzz"];
const CLOUD_PATTERNS = [/firebase/i, /amazonaws/i, /azure/i, /googleapis/i];

function scoreIndicator(value: string, type: InfrastructureIntel["indicatorType"]): {
  reputationScore: number;
  riskLevel: InfrastructureIntel["riskLevel"];
  notes: string[];
} {
  const notes: string[] = [];
  let reputationScore = 50;

  if (type === "telegram") {
    reputationScore = 95;
    notes.push("Telegram bot tokens are high-risk C2 indicators in mobile malware.");
    return { reputationScore, riskLevel: "critical", notes };
  }

  if (SUSPICIOUS_TLDS.some((tld) => value.includes(tld))) {
    reputationScore += 25;
    notes.push("Suspicious top-level domain pattern.");
  }

  if (CLOUD_PATTERNS.some((p) => p.test(value))) {
    reputationScore += 10;
    notes.push("Cloud-hosted infrastructure — verify legitimacy.");
  }

  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
    if (value.startsWith("10.") || value.startsWith("192.168.")) {
      reputationScore = 20;
      notes.push("Private IP range — likely local/dev, lower external risk.");
    } else {
      reputationScore += 20;
      notes.push("Public IP — correlate with threat feeds in production.");
    }
  }

  const riskLevel: InfrastructureIntel["riskLevel"] =
    reputationScore >= 85
      ? "critical"
      : reputationScore >= 65
        ? "high"
        : reputationScore >= 45
          ? "medium"
          : "low";

  return { reputationScore: Math.min(100, reputationScore), riskLevel, notes };
}

export function enrichInfrastructure(iocs: ExtractedIOC[]): InfrastructureIntel[] {
  const results: InfrastructureIntel[] = [];
  const seen = new Set<string>();

  for (const ioc of iocs) {
    if (ioc.type !== "network_endpoint" && !ioc.description.includes("Telegram")) continue;

    let indicatorType: InfrastructureIntel["indicatorType"] = "domain";
    if (ioc.description.includes("Telegram") || ioc.value.includes("bot")) {
      indicatorType = "telegram";
    } else if (/^https?:\/\//i.test(ioc.value)) {
      indicatorType = "url";
    } else if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ioc.value)) {
      indicatorType = "ip";
    } else if (/firebase/i.test(ioc.value)) {
      indicatorType = "firebase";
    }

    const key = `${indicatorType}:${ioc.value}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const { reputationScore, riskLevel, notes } = scoreIndicator(ioc.value, indicatorType);
    results.push({
      indicator: ioc.value.slice(0, 300),
      indicatorType,
      reputationScore,
      riskLevel,
      notes,
      enrichmentSource: "trinetra_heuristic_v1",
    });
  }

  return results.slice(0, 30);
}

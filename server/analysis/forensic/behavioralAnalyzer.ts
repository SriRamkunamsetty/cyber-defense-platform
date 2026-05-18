import type { ApkEvidence } from "../../../shared/evidence";
import type { StaticBehaviorFinding } from "../../../shared/forensics";

/**
 * Behavioral analysis from static forensic evidence.
 * Does NOT claim runtime sandbox results — labels findings as static-inferred.
 */
export function inferBehavioralFindings(
  evidence: ApkEvidence
): StaticBehaviorFinding[] {
  const findings: StaticBehaviorFinding[] = [];
  let id = 0;

  const networkIocs = evidence.iocs.filter((i) => i.type === "network_endpoint");
  if (networkIocs.length > 0) {
    findings.push({
      id: `BH-${++id}`,
      category: "network_behavior",
      title: "Network Communication Indicators",
      description: `Static analysis found ${networkIocs.length} network IOC(s). Runtime would monitor outbound connections to these endpoints.`,
      severity: networkIocs.some((i) => i.severity === "critical") ? "critical" : "high",
      evidenceRefs: networkIocs.slice(0, 8).map((i) => i.value),
      mitreTechnique: "T1071",
      confidence: 85,
    });
  }

  if (evidence.permissions.some((p) => p.name.includes("CLIPBOARD"))) {
    findings.push({
      id: `BH-${++id}`,
      category: "clipboard_access",
      title: "Clipboard Access Pattern",
      description: "Clipboard-related permission or API may enable credential theft from copied data.",
      severity: "high",
      evidenceRefs: evidence.permissions
        .filter((p) => p.name.includes("CLIPBOARD"))
        .map((p) => p.name),
      confidence: 80,
    });
  }

  const overlayMethods = evidence.suspiciousMethods.filter((m) =>
    /WindowManager|TYPE_APPLICATION_OVERLAY|addView/i.test(m.snippet + m.methodName)
  );
  if (overlayMethods.length > 0) {
    findings.push({
      id: `BH-${++id}`,
      category: "overlay_rendering",
      title: "Overlay Rendering Logic",
      description: "WindowManager overlay APIs detected — consistent with overlay phishing at runtime.",
      severity: "critical",
      evidenceRefs: overlayMethods.map((m) => m.methodName),
      mitreTechnique: "T1411",
      bankingRelevance: "Banking app overlay fraud",
      confidence: 88,
    });
  }

  if (evidence.nativeLibraries && evidence.nativeLibraries.length > 0) {
    findings.push({
      id: `BH-${++id}`,
      category: "native_execution",
      title: "Native Library Execution Surface",
      description: `${evidence.nativeLibraries.length} native library(ies) present — may hide malicious logic in .so files.`,
      severity: "medium",
      evidenceRefs: evidence.nativeLibraries.slice(0, 5).map((n) => n.name),
      confidence: 75,
    });
  }

  return findings;
}

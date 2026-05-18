import type { ApkEvidence } from "../../../shared/evidence";
import type { StaticBehaviorFinding } from "../../../shared/forensics";

let findingId = 0;
function nextId() {
  return `SF-${++findingId}`;
}

/** Advanced static malware behavior detection — evidence-only, no speculation */
export function runAdvancedStaticAnalysis(
  evidence: ApkEvidence
): StaticBehaviorFinding[] {
  findingId = 0;
  const findings: StaticBehaviorFinding[] = [];
  const permNames = evidence.permissions.map((p) => p.name);

  const add = (
    category: string,
    title: string,
    description: string,
    severity: StaticBehaviorFinding["severity"],
    evidenceRefs: string[],
    mitreTechnique?: string,
    bankingRelevance?: string,
    confidence = 90
  ) => {
    findings.push({
      id: nextId(),
      category,
      title,
      description,
      severity,
      evidenceRefs,
      mitreTechnique,
      bankingRelevance,
      confidence,
    });
  };

  if (permNames.some((p) => p.includes("ACCESSIBILITY"))) {
    add(
      "banking_trojan",
      "Accessibility Service Abuse",
      "Application requests BIND_ACCESSIBILITY_SERVICE — enables UI automation used by banking trojans for credential capture.",
      "critical",
      permNames.filter((p) => p.includes("ACCESSIBILITY")),
      "T1541",
      "Primary Android banking fraud technique"
    );
  }

  if (permNames.some((p) => p.includes("SYSTEM_ALERT_WINDOW"))) {
    add(
      "overlay_attack",
      "Overlay Injection Capability",
      "SYSTEM_ALERT_WINDOW permission enables phishing overlays above legitimate banking applications.",
      "high",
      ["android.permission.SYSTEM_ALERT_WINDOW"],
      "T1411",
      "Fake login screen injection"
    );
  }

  if (
    permNames.some((p) => p.includes("SMS")) ||
    evidence.suspiciousMethods.some((m) => m.threatCategory.includes("sms"))
  ) {
    add(
      "sms_interception",
      "SMS / OTP Interception",
      "SMS-related permissions and SmsManager API patterns indicate OTP interception for MFA bypass.",
      "critical",
      [
        ...permNames.filter((p) => p.includes("SMS")),
        ...evidence.suspiciousMethods
          .filter((m) => m.threatCategory.includes("sms"))
          .map((m) => m.methodName),
      ],
      "T1636",
      "Banking MFA bypass"
    );
  }

  if (
    evidence.suspiciousMethods.some((m) =>
      /DexClassLoader|PathClassLoader|loadClass|loadDex/i.test(m.snippet + m.methodName)
    )
  ) {
    add(
      "dynamic_loading",
      "Dynamic Payload Loading",
      "DexClassLoader or similar patterns detected — may load encrypted secondary payloads at runtime.",
      "high",
      evidence.suspiciousMethods
        .filter((m) => /DexClassLoader|loadDex/i.test(m.snippet + m.methodName))
        .map((m) => m.methodName),
      "T1407"
    );
  }

  if (
    evidence.suspiciousMethods.some((m) =>
      /Runtime\.exec|ProcessBuilder|su\b/i.test(m.snippet + m.methodName)
    )
  ) {
    add(
      "shell_execution",
      "Shell / Command Execution",
      "Runtime.exec or ProcessBuilder usage — potential command execution capability.",
      "high",
      evidence.suspiciousMethods
        .filter((m) => /Runtime\.exec|ProcessBuilder/i.test(m.snippet + m.methodName))
        .map((m) => m.methodName),
      "T1623"
    );
  }

  if (
    evidence.suspiciousMethods.some((m) =>
      /isEmulator|Build\.FINGERPRINT|qemu|genymotion/i.test(m.snippet + m.methodName)
    )
  ) {
    add(
      "anti_analysis",
      "Anti-Analysis / Emulator Detection",
      "Code checks for emulator or sandbox environment — evasion technique.",
      "medium",
      evidence.suspiciousMethods
        .filter((m) => /isEmulator|qemu/i.test(m.snippet + m.methodName))
        .map((m) => m.methodName),
      "T1623"
    );
  }

  if (evidence.hasObfuscation) {
    add(
      "obfuscation",
      "Code Obfuscation Detected",
      "Encryption, reflection, or obfuscation patterns present in APK artifacts.",
      "medium",
      ["obfuscation_patterns"],
      "T1406"
    );
  }

  if (evidence.iocs.some((i) => i.value.includes("bot") && i.description.includes("Telegram"))) {
    add(
      "c2_infrastructure",
      "Telegram C2 Indicator",
      "Telegram bot token found in APK strings — potential command-and-control channel.",
      "critical",
      evidence.iocs
        .filter((i) => i.description.includes("Telegram"))
        .map((i) => i.value),
      "T1071"
    );
  }

  if (permNames.some((p) => p.includes("REQUEST_INSTALL_PACKAGES"))) {
    add(
      "persistence",
      "Silent App Installation",
      "REQUEST_INSTALL_PACKAGES enables dropping secondary malicious payloads.",
      "high",
      ["android.permission.REQUEST_INSTALL_PACKAGES"],
      "T1475"
    );
  }

  return findings;
}

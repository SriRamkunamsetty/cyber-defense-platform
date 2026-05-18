/** Local cybersecurity knowledge base — MITRE ATT&CK mobile + banking fraud patterns */

export interface ThreatKnowledgeEntry {
  id: string;
  techniqueId: string;
  techniqueName: string;
  tactic: string;
  description: string;
  keywords: string[];
  mitigations: string[];
}

export const THREAT_KNOWLEDGE: ThreatKnowledgeEntry[] = [
  {
    id: "T1411",
    techniqueId: "T1411",
    techniqueName: "Input Injection",
    tactic: "Collection",
    description: "Overlay attacks inject fake UI over banking apps to harvest credentials.",
    keywords: ["overlay", "SYSTEM_ALERT", "WindowManager", "phishing"],
    mitigations: ["Block overlay permissions", "Use app attestation"],
  },
  {
    id: "T1541",
    techniqueId: "T1541",
    techniqueName: "Abuse Accessibility",
    tactic: "Credential Access",
    description: "Accessibility services automate UI interaction for banking trojans.",
    keywords: ["accessibility", "AccessibilityService", "BIND_ACCESSIBILITY"],
    mitigations: ["Restrict accessibility to trusted apps", "MDM policy enforcement"],
  },
  {
    id: "T1636",
    techniqueId: "T1636",
    techniqueName: "Protected User Data",
    tactic: "Collection",
    description: "SMS interception steals OTP codes for MFA bypass.",
    keywords: ["SMS", "SmsManager", "OTP", "READ_SMS", "RECEIVE_SMS"],
    mitigations: ["SMS permission audit", "Use app-based MFA instead of SMS OTP"],
  },
  {
    id: "T1407",
    techniqueId: "T1407",
    techniqueName: "Download New Code",
    tactic: "Defense Evasion",
    description: "Dynamic code loading hides malicious payloads.",
    keywords: ["DexClassLoader", "loadDex", "PathClassLoader"],
    mitigations: ["Runtime application self-protection", "Code signing verification"],
  },
  {
    id: "T1071",
    techniqueId: "T1071",
    techniqueName: "Application Layer Protocol",
    tactic: "Command and Control",
    description: "Malware communicates with C2 via HTTP/HTTPS or messaging APIs.",
    keywords: ["http", "telegram", "bot", "firebase", "c2"],
    mitigations: ["Network IOC blocking", "TLS inspection"],
  },
  {
    id: "T1475",
    techniqueId: "T1475",
    techniqueName: "Deliver Malicious App",
    tactic: "Initial Access",
    description: "Dropper APKs install secondary malicious payloads.",
    keywords: ["INSTALL_PACKAGES", "install", "dropper"],
    mitigations: ["Block unknown sources", "App installation allowlists"],
  },
  {
    id: "BANK-001",
    techniqueId: "CAPEC-98",
    techniqueName: "Phishing",
    tactic: "Fraud",
    description: "Banking fraud via fake login screens and social engineering.",
    keywords: ["bank", "upi", "wallet", "pin", "credential"],
    mitigations: ["Customer awareness", "Transaction anomaly detection"],
  },
];

export function searchThreatKnowledge(query: string, limit = 5): ThreatKnowledgeEntry[] {
  const q = query.toLowerCase();
  const scored = THREAT_KNOWLEDGE.map((entry) => {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score += 3;
    }
    if (entry.techniqueName.toLowerCase().includes(q)) score += 2;
    return { entry, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

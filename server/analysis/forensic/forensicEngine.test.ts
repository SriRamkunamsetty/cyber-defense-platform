import { describe, it, expect } from "vitest";
import { runForensicEngine } from "./forensicEngine";
import type { ApkEvidence } from "../../../shared/evidence";

const baseEvidence: ApkEvidence = {
  packageName: "com.bank.trojan",
  hashes: { md5: "a", sha1: "b", sha256: "c".repeat(64) },
  sha256: "c".repeat(64),
  fileSize: 5000,
  permissions: [
    {
      name: "android.permission.BIND_ACCESSIBILITY_SERVICE",
      riskLevel: "critical",
      abuseDescription: "Accessibility abuse",
    },
    {
      name: "android.permission.READ_SMS",
      riskLevel: "critical",
      abuseDescription: "SMS read",
    },
  ],
  activities: [],
  services: [],
  receivers: [],
  providers: [],
  suspiciousMethods: [
    {
      className: "Loader",
      methodName: "DexClassLoader",
      filePath: "/Loader.java",
      snippet: "new DexClassLoader(",
      threatCategory: "dynamic_loading",
      severity: "high",
    },
  ],
  iocs: [
    {
      type: "network_endpoint",
      value: "https://evil.example.com/c2",
      severity: "high",
      description: "URL",
      source: "code",
    },
  ],
  fileTree: [],
  analysisNotes: [],
  toolsUsed: ["apktool", "jadx"],
  manifestXml: "<manifest package='com.bank.trojan'/>",
};

describe("Forensic Engine", () => {
  it("validates and enriches evidence with static findings", () => {
    const bundle = runForensicEngine(baseEvidence);
    expect(bundle.forensicConfidence).toBeGreaterThan(50);
    expect(bundle.staticFindings.length).toBeGreaterThan(0);
    expect(bundle.malwareDna.fingerprintId).toMatch(/^DNA-/);
    expect(bundle.attackChain.length).toBeGreaterThan(1);
  });

  it("deduplicates IOCs", () => {
    const duped = {
      ...baseEvidence,
      iocs: [...baseEvidence.iocs, ...baseEvidence.iocs],
    };
    const bundle = runForensicEngine(duped);
    expect(bundle.evidence.iocs.length).toBe(1);
  });
});

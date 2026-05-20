import { describe, expect, it } from "vitest";
import { runForensicEngine } from "./forensic/forensicEngine";
import { buildInvestigationEvidenceLineage } from "./evidenceLineage";
import type { ApkEvidence } from "../../shared/evidence";

const baseEvidence: ApkEvidence = {
  packageName: "com.test.banktrojan",
  hashes: { md5: "a", sha1: "b", sha256: "c".repeat(64) },
  sha256: "c".repeat(64),
  fileSize: 5000,
  permissions: [
    {
      name: "android.permission.READ_SMS",
      riskLevel: "critical",
      abuseDescription: "Reads OTP SMS messages",
    },
  ],
  activities: ["com.test.MainActivity"],
  services: ["com.test.SyncService"],
  receivers: [],
  providers: [],
  suspiciousMethods: [
    {
      className: "OtpStealer",
      methodName: "SmsManager.sendTextMessage",
      filePath: "/smali/OtpStealer.smali",
      snippet: "SmsManager.sendTextMessage",
      threatCategory: "sms_abuse",
      severity: "critical",
    },
  ],
  iocs: [
    {
      type: "permission",
      value: "READ_SMS",
      severity: "critical",
      description: "SMS read permission",
      source: "manifest",
    },
    {
      type: "network_endpoint",
      value: "https://evil.example.com/c2",
      severity: "high",
      description: "Suspicious C2 endpoint",
      source: "code",
    },
  ],
  fileTree: [],
  analysisNotes: [],
  toolsUsed: ["apktool", "jadx"],
  manifestXml: "<manifest package='com.test.banktrojan'/>",
};

describe("Evidence lineage graph", () => {
  it("builds normalized entities and edges from forensic bundle", () => {
    const bundle = runForensicEngine(baseEvidence);
    const graph = buildInvestigationEvidenceLineage(42, bundle);

    expect(graph.entities.some((entity) => entity.entityType === "package")).toBe(
      true
    );
    expect(
      graph.entities.some((entity) => entity.entityType === "permission")
    ).toBe(true);
    expect(graph.entities.some((entity) => entity.entityType === "ioc")).toBe(
      true
    );
    expect(graph.edges.some((edge) => edge.relationshipType === "declares")).toBe(
      true
    );
    expect(
      graph.edges.some((edge) => edge.relationshipType === "supports")
    ).toBe(true);
  });
});

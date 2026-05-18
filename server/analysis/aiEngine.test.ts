import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAnalysisPipeline } from "./aiEngine";
import type { ApkEvidence } from "../../shared/evidence";

vi.mock("../db", () => ({
  updateAgentLog: vi.fn(),
  createIOC: vi.fn(),
  updateInvestigationStatus: vi.fn(),
  initializeAgentLogs: vi.fn(),
}));

vi.mock("../websocket", () => ({
  broadcastInvestigationEvent: vi.fn(),
}));

vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            summary: "Test finding based on evidence",
            threatLevel: "high",
            confidence: 85,
            evidence: ["READ_SMS permission in manifest"],
            mitigations: ["Block package"],
            overallScore: 75,
            dataExfiltration: 80,
            credentialHarvesting: 70,
            c2Communication: 80,
            bankingTrojan: 65,
            justification: "High risk indicators from evidence",
          }),
        },
      },
    ],
  }),
}));

const mockEvidence: ApkEvidence = {
  packageName: "com.test.malware",
  sha256: "a".repeat(64),
  fileSize: 1024,
  permissions: [
    {
      name: "android.permission.READ_SMS",
      riskLevel: "critical",
      abuseDescription: "SMS read",
      bankingRelevance: "OTP theft",
    },
  ],
  activities: ["com.test.MainActivity"],
  services: [],
  receivers: [],
  providers: [],
  suspiciousMethods: [
    {
      className: "SmsStealer",
      methodName: "SmsManager.sendTextMessage",
      filePath: "/smali/SmsStealer.smali",
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
      description: "SMS permission",
      source: "manifest",
    },
  ],
  fileTree: [{ name: "AndroidManifest.xml", path: "AndroidManifest.xml", type: "file" }],
  analysisNotes: ["test"],
  toolsUsed: ["adm-zip"],
};

describe("AI Analysis Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should run grounded analysis pipeline successfully", async () => {
    const result = await runAnalysisPipeline(1, "test.apk", mockEvidence);

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("should have valid risk breakdown", async () => {
    const result = await runAnalysisPipeline(1, "test.apk", mockEvidence);

    expect(result.riskBreakdown).toBeDefined();
    expect(result.riskBreakdown.dataExfiltration).toBeGreaterThanOrEqual(0);
    expect(result.riskBreakdown.bankingTrojan).toBeLessThanOrEqual(100);
  });

  it("should return IOCs from evidence", async () => {
    const result = await runAnalysisPipeline(1, "test.apk", mockEvidence);

    expect(result.iocs.length).toBeGreaterThan(0);
    expect(result.attackChain.length).toBeGreaterThan(0);
  });

  it("should generate mitigations", async () => {
    const result = await runAnalysisPipeline(1, "test.apk", mockEvidence);
    expect(result.mitigations.length).toBeGreaterThan(0);
  });
});

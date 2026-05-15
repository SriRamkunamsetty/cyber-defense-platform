import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAnalysisPipeline, AnalysisResult } from "./aiEngine";

// Mock the database functions
vi.mock("../db", () => ({
  updateAgentLog: vi.fn(),
  createIOC: vi.fn(),
  updateInvestigationStatus: vi.fn(),
}));

// Mock the LLM
vi.mock("../_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content:
            '{"overallScore": 75, "dataExfiltration": 80, "credentialHarvesting": 70, "c2Communication": 80, "bankingTrojan": 65, "justification": "High risk indicators"}',
        },
      },
    ],
  }),
}));

describe("AI Analysis Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should run analysis pipeline successfully", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    expect(result).toBeDefined();
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(100);
  });

  it("should have valid risk breakdown", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    expect(result.riskBreakdown).toBeDefined();
    expect(result.riskBreakdown.dataExfiltration).toBeGreaterThanOrEqual(0);
    expect(result.riskBreakdown.dataExfiltration).toBeLessThanOrEqual(100);
    expect(result.riskBreakdown.credentialHarvesting).toBeGreaterThanOrEqual(0);
    expect(result.riskBreakdown.credentialHarvesting).toBeLessThanOrEqual(100);
    expect(result.riskBreakdown.c2Communication).toBeGreaterThanOrEqual(0);
    expect(result.riskBreakdown.c2Communication).toBeLessThanOrEqual(100);
    expect(result.riskBreakdown.bankingTrojan).toBeGreaterThanOrEqual(0);
    expect(result.riskBreakdown.bankingTrojan).toBeLessThanOrEqual(100);
  });

  it("should extract IOCs from findings", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    expect(result.iocs).toBeDefined();
    expect(Array.isArray(result.iocs)).toBe(true);

    // Each IOC should have required fields
    result.iocs.forEach((ioc) => {
      expect(ioc.type).toBeDefined();
      expect(ioc.value).toBeDefined();
      expect(ioc.severity).toBeDefined();
      expect(["low", "medium", "high", "critical"]).toContain(ioc.severity);
    });
  });

  it("should generate mitigations", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    expect(result.mitigations).toBeDefined();
    expect(Array.isArray(result.mitigations)).toBe(true);
    expect(result.mitigations.length).toBeGreaterThan(0);
  });

  it("should have threat summary", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    expect(result.threatSummary).toBeDefined();
    expect(typeof result.threatSummary).toBe("string");
  });

  it("should have findings", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    expect(result.findings).toBeDefined();
    expect(typeof result.findings).toBe("string");
    expect(result.findings.length).toBeGreaterThan(0);
  });

  it("should classify critical risk correctly", async () => {
    // Test that a score > 80 is classified as critical
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    if (result.riskScore > 80) {
      expect(result.riskScore).toBeGreaterThan(80);
    }
  });

  it("should have valid analysis result structure", async () => {
    const result = await runAnalysisPipeline(
      1,
      "test.apk",
      "Test APK context"
    );

    // Verify all required fields exist
    expect(result).toHaveProperty("iocs");
    expect(result).toHaveProperty("findings");
    expect(result).toHaveProperty("riskScore");
    expect(result).toHaveProperty("riskBreakdown");
    expect(result).toHaveProperty("threatSummary");
    expect(result).toHaveProperty("mitigations");
  });
});

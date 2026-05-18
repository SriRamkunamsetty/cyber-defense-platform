import { describe, it, expect } from "vitest";

describe("Investigation WebSocket events", () => {
  it("serializes investigation progress events", () => {
    const event = {
      type: "agent_progress" as const,
      investigationId: 42,
      agentName: "Static Malware Analysis",
      message: "Scanning dangerous permissions",
      progress: 60,
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(event);
    const parsed = JSON.parse(json);

    expect(parsed.investigationId).toBe(42);
    expect(parsed.type).toBe("agent_progress");
    expect(parsed.message).toContain("permissions");
  });

  it("supports investigation_complete payload", () => {
    const event = {
      type: "investigation_complete" as const,
      investigationId: 1,
      timestamp: new Date().toISOString(),
      data: { riskScore: 85, iocCount: 12 },
    };

    expect(event.data?.riskScore).toBe(85);
  });
});

import { describe, expect, it } from "vitest";
import {
  assertLifecycleTransition,
  mapLifecycleStateToPublicStatus,
  normalizeLifecycleState,
} from "./investigationStateMachine";

describe("Investigation state machine", () => {
  it("maps lifecycle states to public statuses", () => {
    expect(mapLifecycleStateToPublicStatus("created")).toBe("pending");
    expect(mapLifecycleStateToPublicStatus("ai_processing")).toBe("analyzing");
    expect(mapLifecycleStateToPublicStatus("completed")).toBe("completed");
  });

  it("normalizes legacy statuses", () => {
    expect(normalizeLifecycleState(undefined, "pending")).toBe("created");
    expect(normalizeLifecycleState(undefined, "analyzing")).toBe(
      "ai_processing"
    );
  });

  it("allows forward transitions and blocks invalid jumps", () => {
    expect(() =>
      assertLifecycleTransition("reverse_engineering", "forensic_validation")
    ).not.toThrow();

    expect(() =>
      assertLifecycleTransition("created", "ai_processing")
    ).toThrow(/Invalid investigation lifecycle transition/);
  });
});

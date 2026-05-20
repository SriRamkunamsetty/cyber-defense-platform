export const INVESTIGATION_LIFECYCLE_STATES = [
  "created",
  "queued",
  "downloading_artifact",
  "reverse_engineering",
  "forensic_validation",
  "ai_processing",
  "completed",
  "failed",
] as const;

export type InvestigationLifecycleState =
  (typeof INVESTIGATION_LIFECYCLE_STATES)[number];

export type InvestigationPublicStatus =
  | "pending"
  | "analyzing"
  | "completed"
  | "failed";

const ALLOWED_TRANSITIONS: Record<
  InvestigationLifecycleState,
  InvestigationLifecycleState[]
> = {
  created: ["queued", "failed"],
  queued: ["downloading_artifact", "failed"],
  downloading_artifact: ["reverse_engineering", "failed"],
  reverse_engineering: ["forensic_validation", "failed"],
  forensic_validation: ["ai_processing", "failed"],
  ai_processing: ["completed", "failed"],
  completed: [],
  failed: ["queued"],
};

export function mapLifecycleStateToPublicStatus(
  state: InvestigationLifecycleState
): InvestigationPublicStatus {
  switch (state) {
    case "created":
    case "queued":
      return "pending";
    case "downloading_artifact":
    case "reverse_engineering":
    case "forensic_validation":
    case "ai_processing":
      return "analyzing";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
  }
}

export function normalizeLifecycleState(
  lifecycleState: string | null | undefined,
  status?: string | null
): InvestigationLifecycleState {
  if (
    lifecycleState &&
    INVESTIGATION_LIFECYCLE_STATES.includes(
      lifecycleState as InvestigationLifecycleState
    )
  ) {
    return lifecycleState as InvestigationLifecycleState;
  }

  switch (status) {
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "analyzing":
      return "ai_processing";
    case "pending":
    default:
      return "created";
  }
}

export function assertLifecycleTransition(
  currentState: InvestigationLifecycleState,
  nextState: InvestigationLifecycleState
): void {
  if (currentState === nextState) return;

  const allowed = ALLOWED_TRANSITIONS[currentState] ?? [];
  if (!allowed.includes(nextState)) {
    throw new Error(
      `Invalid investigation lifecycle transition: ${currentState} -> ${nextState}`
    );
  }
}

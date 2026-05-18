import type { ApkEvidence } from "../../../shared/evidence";
import type { ValidatedForensicBundle } from "../../../shared/forensics";
import { buildRagContext } from "../intelligence/ragRetriever";
import { validateAndEnrichEvidence } from "./evidenceValidator";

/**
 * Enterprise forensic engine — validates, enriches, and correlates APK evidence
 * before AI agents run. All outputs are evidence-backed.
 */
export function runForensicEngine(raw: ApkEvidence): ValidatedForensicBundle {
  const ragContext = buildRagContext(raw);
  return validateAndEnrichEvidence(raw, ragContext);
}

export { validateAndEnrichEvidence } from "./evidenceValidator";
export { runAdvancedStaticAnalysis } from "./staticAnalyzer";
export { buildMalwareDnaProfile } from "./malwareDnaProfiler";
export { reconstructAttackChain } from "./attackChainEngine";

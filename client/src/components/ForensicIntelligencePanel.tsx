import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Dna, Fingerprint, Shield, Network, AlertTriangle } from "lucide-react";
import type { ApkEvidence } from "@shared/evidence";

interface ForensicIntelligencePanelProps {
  evidence: ApkEvidence | null;
  consensus?: {
    threatClassification?: string;
    overallConfidence?: number;
    forensicConfidence?: number;
    agentAgreementScore?: number;
    validatedFindings?: string[];
  } | null;
}

export function ForensicIntelligencePanel({
  evidence,
  consensus,
}: ForensicIntelligencePanelProps) {
  if (!evidence) {
    return (
      <Card className="p-6 bg-black/40 border-white/10 text-gray-400">
        Forensic intelligence will appear after analysis completes.
      </Card>
    );
  }

  const dna = evidence.malwareDna;
  const staticFindings = evidence.staticFindings || [];
  const infra = evidence.infrastructureIntel || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-cyan-950/40 to-black/60 border-cyan-500/20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-cyan-400 mb-2"
          >
            <Fingerprint className="w-4 h-4" />
            <span className="text-sm font-medium">Forensic Confidence</span>
          </motion.div>
          <p className="text-3xl font-bold text-white">
            {evidence.forensicConfidence ?? "—"}%
          </p>
          <p className="text-xs text-gray-500 mt-1">Evidence validation score</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-950/40 to-black/60 border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Dna className="w-4 h-4" />
            <span className="text-sm font-medium">Malware DNA</span>
          </div>
          <p className="text-lg font-mono text-white truncate">
            {dna?.fingerprintId || "Profiling..."}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {dna?.familyMatches?.[0]
              ? `${dna.familyMatches[0].family} (${dna.familyMatches[0].similarity}%)`
              : "No family match"}
          </p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-emerald-950/40 to-black/60 border-emerald-500/20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-emerald-400 mb-2"
          >
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Consensus</span>
          </motion.div>
          <p className="text-lg font-bold text-white truncate">
            {consensus?.threatClassification || "Pending"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Agent agreement: {consensus?.agentAgreementScore ?? "—"}%
          </p>
        </Card>
      </div>

      {evidence.hashes && (
        <Card className="p-4 bg-black/40 border-white/10">
          <h4 className="text-sm font-medium text-cyan-300 mb-2">File Hashes</h4>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="font-mono text-xs text-gray-400 space-y-1"
          >
            <p>SHA256: {evidence.hashes.sha256}</p>
            <p>SHA1: {evidence.hashes.sha1}</p>
            <p>MD5: {evidence.hashes.md5}</p>
          </motion.div>
        </Card>
      )}

      {staticFindings.length > 0 && (
        <Card className="p-4 bg-black/40 border-white/10">
          <h4 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Static Behavior Findings ({staticFindings.length})
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {staticFindings.map((f) => (
              <div
                key={f.id}
                className="text-xs p-2 rounded bg-white/5 border border-white/5"
              >
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] mr-2 ${
                    f.severity === "critical"
                      ? "bg-red-500/20 text-red-300"
                      : f.severity === "high"
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {f.severity}
                </span>
                <span className="text-white font-medium">{f.title}</span>
                <p className="text-gray-500 mt-1">{f.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {infra.length > 0 && (
        <Card className="p-4 bg-black/40 border-white/10">
          <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
            <Network className="w-4 h-4" />
            Infrastructure Intelligence
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {infra.map((item, i) => (
              <div key={i} className="text-xs p-2 rounded bg-white/5">
                <span className="text-cyan-400">{item.indicatorType}</span>
                <span className="text-gray-300 ml-2 truncate">{item.indicator}</span>
                <span className="text-gray-500 ml-2">rep: {item.reputationScore}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </motion.div>
  );
}

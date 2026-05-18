import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowDown, ShieldAlert } from "lucide-react";
import type { AttackChainStep } from "@shared/evidence";

interface AttackChainFlowProps {
  steps: AttackChainStep[];
}

const severityColors: Record<string, string> = {
  low: "border-green-500/40 bg-green-500/10",
  medium: "border-yellow-500/40 bg-yellow-500/10",
  high: "border-orange-500/40 bg-orange-500/10",
  critical: "border-red-500/40 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.2)]",
};

export function AttackChainFlow({ steps }: AttackChainFlowProps) {
  if (steps.length === 0) {
    return (
      <Card className="bg-white/5 border border-white/10 p-8 text-center text-muted-foreground text-sm">
        Attack chain will be reconstructed from forensic evidence after analysis
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border border-white/10 backdrop-blur-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <ShieldAlert className="w-5 h-5 text-cyan-400" />
        <h3 className="font-semibold">Malware Attack Chain</h3>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.12 } },
        }}
        className="space-y-2"
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <motion.div
              variants={{
                hidden: { opacity: 0, x: -20 },
                visible: { opacity: 1, x: 0 },
              }}
              className={`relative rounded-lg border p-4 ${severityColors[step.severity] || severityColors.medium}`}
            >
              <motion.div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-cyan-400"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
              />
              <p className="font-semibold text-foreground pl-2">{step.stage}</p>
              <p className="text-sm text-muted-foreground mt-1 pl-2">{step.description}</p>
              {step.evidence.length > 0 && (
                <div className="mt-2 pl-2 flex flex-wrap gap-1">
                  {step.evidence.slice(0, 4).map((ev, i) => (
                    <span
                      key={i}
                      className="text-xs font-mono px-2 py-0.5 rounded bg-black/30 text-cyan-300/90"
                    >
                      {ev.length > 40 ? ev.slice(0, 40) + "…" : ev}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
            {index < steps.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.12 + 0.05 }}
                className="flex justify-center py-1"
              >
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowDown className="w-5 h-5 text-cyan-500/60" />
                </motion.div>
              </motion.div>
            )}
          </React.Fragment>
        ))}
      </motion.div>
    </Card>
  );
}

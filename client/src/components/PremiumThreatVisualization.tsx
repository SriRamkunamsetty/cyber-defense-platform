import React from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ThreatNode {
  id: string;
  label: string;
  severity: number;
  type: "permission" | "endpoint" | "api" | "behavior";
}

interface PremiumThreatVisualizationProps {
  threats: ThreatNode[];
  title?: string;
}

// Mock data for visualization
const mockTimelineData = [
  { time: "00:00", risk: 10 },
  { time: "00:30", risk: 25 },
  { time: "01:00", risk: 45 },
  { time: "01:30", risk: 65 },
  { time: "02:00", risk: 80 },
  { time: "02:30", risk: 92 },
];

const mockCategoryData = [
  { category: "Data Exfil", value: 85 },
  { category: "Credential", value: 92 },
  { category: "C2 Comm", value: 78 },
  { category: "Banking", value: 88 },
];

export function PremiumThreatVisualization({
  threats,
  title = "Threat Intelligence",
}: PremiumThreatVisualizationProps) {
  const severityColors: Record<string, string> = {
    permission: "#ef4444",
    endpoint: "#f97316",
    api: "#eab308",
    behavior: "#8b5cf6",
  };

  return (
    <div className="space-y-4">
      {/* Risk Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-white/5 border-white/10 p-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">Risk Timeline</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={mockTimelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="risk"
                stroke="#22d3ee"
                dot={false}
                strokeWidth={2}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Risk Breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="bg-white/5 border-white/10 p-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">Risk Breakdown</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockCategoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="category" stroke="rgba(255,255,255,0.3)" />
              <YAxis stroke="rgba(255,255,255,0.3)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(0,0,0,0.8)",
                  border: "1px solid rgba(34, 211, 238, 0.3)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="value" fill="#22d3ee" isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </motion.div>

      {/* Threat Nodes */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card className="bg-white/5 border-white/10 p-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">Detected Threats</h3>
          <div className="grid grid-cols-2 gap-2">
            {threats.map((threat, index) => (
              <motion.div
                key={threat.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="p-2 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-foreground truncate">
                      {threat.label}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {threat.type}
                    </p>
                  </div>
                  <motion.div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{
                      backgroundColor: severityColors[threat.type],
                    }}
                    animate={{
                      boxShadow: [
                        `0 0 10px ${severityColors[threat.type]}`,
                        `0 0 20px ${severityColors[threat.type]}`,
                        `0 0 10px ${severityColors[threat.type]}`,
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    {threat.severity}
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Attack Chain */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="bg-white/5 border-white/10 p-4">
          <h3 className="text-sm font-semibold text-cyan-300 mb-3">Attack Chain</h3>
          <div className="space-y-2">
            {["Initialization", "Privilege Escalation", "Credential Harvesting", "C2 Communication", "Payload Execution"].map(
              (step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-cyan-400"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      delay: index * 0.2,
                      repeat: Infinity,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{step}</span>
                  {index < 4 && (
                    <motion.div
                      className="flex-1 h-px bg-gradient-to-r from-cyan-400/50 to-transparent"
                      animate={{
                        opacity: [0.3, 0.8, 0.3],
                      }}
                      transition={{
                        duration: 2,
                        delay: index * 0.2,
                        repeat: Infinity,
                      }}
                    />
                  )}
                </motion.div>
              )
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

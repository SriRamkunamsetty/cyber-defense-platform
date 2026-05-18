import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ThreatNode {
  id: string;
  label: string;
  severity: number;
  type: "permission" | "endpoint" | "api" | "behavior";
}

interface RiskBreakdown {
  dataExfiltration: number;
  credentialHarvesting: number;
  c2Communication: number;
  bankingTrojan: number;
}

interface PremiumThreatVisualizationProps {
  threats: ThreatNode[];
  title?: string;
  overallScore?: number;
  riskBreakdown?: RiskBreakdown;
}

export function PremiumThreatVisualization({
  threats,
  title = "Threat Intelligence",
  overallScore = 0,
  riskBreakdown,
}: PremiumThreatVisualizationProps) {
  const severityColors: Record<string, string> = {
    permission: "#ef4444",
    endpoint: "#f97316",
    api: "#eab308",
    behavior: "#8b5cf6",
  };

  const categoryData = useMemo(
    () => [
      { category: "Data Exfil", value: riskBreakdown?.dataExfiltration ?? 0 },
      { category: "Credential", value: riskBreakdown?.credentialHarvesting ?? 0 },
      { category: "C2 Comm", value: riskBreakdown?.c2Communication ?? 0 },
      { category: "Banking", value: riskBreakdown?.bankingTrojan ?? 0 },
    ],
    [riskBreakdown]
  );

  const timelineData = useMemo(() => {
    const base = Math.max(0, overallScore - 40);
    return [
      { time: "Upload", risk: Math.round(base * 0.2) },
      { time: "Forensics", risk: Math.round(base * 0.45) },
      { time: "Static", risk: Math.round(base * 0.65) },
      { time: "Agents", risk: Math.round(base * 0.85) },
      { time: "Consensus", risk: overallScore },
    ];
  }, [overallScore]);

  return (
    <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card className="bg-white/5 border-white/10 p-4">
        <h3 className="text-sm font-semibold text-cyan-300 mb-3">Investigation Risk Timeline</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" />
            <YAxis stroke="rgba(255,255,255,0.3)" domain={[0, 100]} />
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
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-white/5 border-white/10 p-4">
        <h3 className="text-sm font-semibold text-cyan-300 mb-3">Risk Breakdown (Evidence-Based)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="category" stroke="rgba(255,255,255,0.3)" />
            <YAxis stroke="rgba(255,255,255,0.3)" domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(34, 211, 238, 0.3)",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="value" fill="#22d3ee" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="bg-white/5 border-white/10 p-4">
        <h3 className="text-sm font-semibold text-cyan-300 mb-3">{title}</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {threats.length === 0 ? (
            <p className="text-xs text-muted-foreground">No threat nodes extracted yet.</p>
          ) : (
            threats.map((t) => (
              <motion.div
                key={t.id}
                className="flex items-center gap-2 text-xs p-2 rounded bg-black/30"
                whileHover={{ scale: 1.01 }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: severityColors[t.type] || "#22d3ee" }}
                />
                <span className="text-white truncate flex-1">{t.label}</span>
                <span className="text-cyan-400">{t.severity}</span>
              </motion.div>
            ))
          )}
        </div>
      </Card>
    </motion.div>
  );
}


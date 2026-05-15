import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Brain, Zap, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export interface AgentState {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  confidence?: number;
  reasoning?: string;
  progress?: number;
  icon?: React.ReactNode;
}

interface PremiumAgentCardProps {
  agent: AgentState;
  index: number;
}

const agentColors: Record<string, { bg: string; border: string; glow: string }> = {
  "Reverse Engineering": {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    glow: "0 0 20px rgba(59, 130, 246, 0.4)",
  },
  "Static Analysis": {
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    glow: "0 0 20px rgba(147, 51, 234, 0.4)",
  },
  "Dynamic Threat": {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    glow: "0 0 20px rgba(239, 68, 68, 0.4)",
  },
  "Threat Intelligence": {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    glow: "0 0 20px rgba(249, 115, 22, 0.4)",
  },
  "AI Reasoning": {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    glow: "0 0 20px rgba(34, 211, 238, 0.4)",
  },
  "Risk Scoring": {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    glow: "0 0 20px rgba(234, 179, 8, 0.4)",
  },
  "Executive Report": {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    glow: "0 0 20px rgba(16, 185, 129, 0.4)",
  },
};

export function PremiumAgentCard({ agent, index }: PremiumAgentCardProps) {
  const colors = agentColors[agent.name] || agentColors["AI Reasoning"];

  const statusConfig = {
    pending: {
      icon: <div className="w-3 h-3 rounded-full border border-white/30" />,
      label: "Pending",
      color: "text-muted-foreground",
    },
    running: {
      icon: (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-4 h-4 text-cyan-400" />
        </motion.div>
      ),
      label: "Running",
      color: "text-cyan-300",
    },
    completed: {
      icon: <CheckCircle2 className="w-4 h-4 text-green-400" />,
      label: "Completed",
      color: "text-green-300",
    },
    error: {
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
      label: "Error",
      color: "text-red-300",
    },
  };

  const status = statusConfig[agent.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
    >
      <Card
        className={`relative overflow-hidden backdrop-blur-xl ${colors.bg} border ${colors.border} p-4 transition-all duration-300 hover:border-opacity-100 group`}
        style={{
          boxShadow:
            agent.status === "running"
              ? colors.glow
              : "0 0 10px rgba(255, 255, 255, 0.05)",
        }}
      >
        {/* Animated background gradient */}
        {agent.status === "running" && (
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100"
            animate={{
              backgroundPosition: ["0% 0%", "100% 100%"],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
            }}
            style={{
              background: `linear-gradient(45deg, transparent, ${colors.glow}, transparent)`,
              backgroundSize: "200% 200%",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {agent.icon || <Brain className="w-5 h-5 text-cyan-400" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate text-sm">
                  {agent.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Agent {index + 1} of 7
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <Badge
              variant="outline"
              className={`flex items-center gap-1 whitespace-nowrap ${status.color}`}
            >
              {status.icon}
              <span className="text-xs">{status.label}</span>
            </Badge>
          </div>

          {/* Progress Bar */}
          {agent.status === "running" && agent.progress !== undefined && (
            <motion.div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-mono text-cyan-300">
                  {Math.round(agent.progress)}%
                </span>
              </div>
              <motion.div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300"
                  initial={{ width: 0 }}
                  animate={{ width: `${agent.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </motion.div>
            </motion.div>
          )}

          {/* Confidence Score */}
          {agent.confidence !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Confidence</span>
              <motion.div
                className="flex items-center gap-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${agent.confidence}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
                <span className="text-xs font-mono text-green-300 w-8 text-right">
                  {Math.round(agent.confidence)}%
                </span>
              </motion.div>
            </div>
          )}

          {/* Reasoning Snippet */}
          {agent.reasoning && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.3 }}
              className="text-xs text-muted-foreground line-clamp-2 italic border-l-2 border-cyan-500/30 pl-2"
            >
              "{agent.reasoning}"
            </motion.div>
          )}

          {/* Telemetry Dots */}
          {agent.status === "running" && (
            <div className="flex gap-1 pt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                  animate={{
                    opacity: [1, 0.3, 1],
                    scale: [1, 0.8, 1],
                  }}
                  transition={{
                    duration: 1,
                    delay: i * 0.2,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Holographic border glow */}
        {agent.status === "running" && (
          <motion.div
            className="absolute inset-0 rounded-lg pointer-events-none"
            animate={{
              boxShadow: [
                `inset 0 0 20px ${colors.glow}`,
                `inset 0 0 40px ${colors.glow}`,
                `inset 0 0 20px ${colors.glow}`,
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </Card>
    </motion.div>
  );
}

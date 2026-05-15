import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export interface LogEntry {
  id: string;
  agent: string;
  message: string;
  status: "pending" | "running" | "completed" | "error";
  timestamp: string;
  progress?: number;
}

interface LiveInvestigationLogProps {
  logs: LogEntry[];
  isActive: boolean;
  onComplete?: () => void;
}

const AGENT_SEQUENCE = [
  "Initializing secure malware sandbox",
  "Reverse engineering APK structure",
  "Extracting AndroidManifest.xml",
  "Scanning dangerous permissions",
  "Investigating accessibility abuse",
  "Detecting SMS interception behavior",
  "Monitoring encrypted payload execution",
  "Correlating threat intelligence",
  "Running AI malware reasoning",
  "Generating executive threat report",
];

export function LiveInvestigationLog({
  logs,
  isActive,
  onComplete,
}: LiveInvestigationLogProps) {
  const [displayedLogs, setDisplayedLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    setDisplayedLogs(logs);
  }, [logs]);

  return (
    <Card className="bg-white/5 border-white/10 p-4 font-mono text-sm h-96 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          {isActive ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="w-4 h-4 text-cyan-400" />
            </motion.div>
          ) : (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          )}
          <span className="text-cyan-300 font-semibold">
            {isActive ? "Analyzing APK..." : "Analysis Complete"}
          </span>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        <AnimatePresence mode="popLayout">
          {displayedLogs.map((log, index) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: "auto" }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                ease: "easeOut",
              }}
              className="flex items-start gap-2 text-xs"
            >
              {/* Status Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {log.status === "completed" && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  </motion.div>
                )}
                {log.status === "running" && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="w-4 h-4 text-cyan-400" />
                  </motion.div>
                )}
                {log.status === "pending" && (
                  <div className="w-4 h-4 rounded-full border border-white/30" />
                )}
                {log.status === "error" && (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>

              {/* Log Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-cyan-300">[✓]</span>
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className={`${
                      log.status === "completed"
                        ? "text-green-300"
                        : log.status === "running"
                          ? "text-cyan-300"
                          : log.status === "error"
                            ? "text-red-300"
                            : "text-muted-foreground"
                    }`}
                  >
                    {log.message}
                  </motion.span>
                </div>

                {/* Progress Bar */}
                {log.status === "running" && log.progress !== undefined && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${log.progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-1 bg-gradient-to-r from-cyan-500 to-cyan-300 rounded mt-1 opacity-60"
                  />
                )}

                {/* Timestamp */}
                <div className="text-xs text-muted-foreground/60 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Cursor animation when active */}
        {isActive && displayedLogs.length > 0 && (
          <motion.div
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="text-cyan-300"
          >
            █
          </motion.div>
        )}
      </div>

      {/* Footer Stats */}
      {displayedLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 pt-3 border-t border-white/10 text-xs text-muted-foreground"
        >
          <div className="flex justify-between">
            <span>
              Completed: {displayedLogs.filter((l) => l.status === "completed").length}
              /{displayedLogs.length}
            </span>
            <span>
              Elapsed: {Math.round((Date.now() - new Date(displayedLogs[0]?.timestamp).getTime()) / 1000)}s
            </span>
          </div>
        </motion.div>
      )}
    </Card>
  );
}

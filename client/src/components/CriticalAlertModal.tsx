import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Zap, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CriticalAlertModalProps {
  isOpen: boolean;
  riskScore: number;
  apkName: string;
  topThreats: string[];
  onClose: () => void;
  onViewDetails: () => void;
}

export function CriticalAlertModal({
  isOpen,
  riskScore,
  apkName,
  topThreats,
  onClose,
  onViewDetails,
}: CriticalAlertModalProps) {
  const [audioPlayed, setAudioPlayed] = useState(false);

  useEffect(() => {
    if (isOpen && !audioPlayed) {
      // Play alert sound (optional - uncomment if audio file available)
      // const audio = new Audio('/alert.mp3');
      // audio.play().catch(() => {});
      setAudioPlayed(true);
    }
  }, [isOpen, audioPlayed]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Alert Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              className="relative w-full max-w-md rounded-lg overflow-hidden"
              animate={{
                boxShadow: [
                  "0 0 20px rgba(239, 68, 68, 0.3)",
                  "0 0 40px rgba(239, 68, 68, 0.6)",
                  "0 0 20px rgba(239, 68, 68, 0.3)",
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              {/* Animated background */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-red-950/40 via-red-900/20 to-red-950/40"
                animate={{
                  backgroundPosition: ["0% 0%", "100% 100%"],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />

              {/* Content */}
              <div className="relative z-10 bg-black/80 backdrop-blur-xl border-2 border-red-500/50 p-6 space-y-4">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{
                        rotate: [0, -5, 5, -5, 0],
                      }}
                      transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    >
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </motion.div>
                    <h2 className="text-2xl font-bold text-red-300">
                      CRITICAL THREAT DETECTED
                    </h2>
                  </div>
                  <p className="text-sm text-red-200/70">
                    Malicious APK identified - Immediate action required
                  </p>
                </motion.div>

                {/* Risk Score */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Risk Score</span>
                    <span className="text-3xl font-bold text-red-300">{riskScore}</span>
                    <span className="text-lg text-red-300">/100</span>
                  </div>
                  <motion.div
                    className="h-2 bg-red-500/20 rounded-full overflow-hidden"
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-red-500 via-red-400 to-red-300"
                      initial={{ width: 0 }}
                      animate={{ width: `${riskScore}%` }}
                      transition={{ delay: 0.4, duration: 1 }}
                    />
                  </motion.div>
                </motion.div>

                {/* APK Name */}
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-1"
                >
                  <p className="text-xs text-muted-foreground">Suspicious APK</p>
                  <p className="text-sm font-mono text-red-200 break-all">{apkName}</p>
                </motion.div>

                {/* Top Threats */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <p className="text-xs font-semibold text-red-300">Top Threats</p>
                  <div className="space-y-1">
                    {topThreats.map((threat, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.35 + index * 0.05 }}
                        className="flex items-center gap-2 text-xs text-red-200/80"
                      >
                        <Zap className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="truncate">{threat}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3 pt-2"
                >
                  <Button
                    onClick={onViewDetails}
                    className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="flex-1 border-white/20 text-muted-foreground"
                  >
                    Dismiss
                  </Button>
                </motion.div>

                {/* Warning Pulse */}
                <motion.div
                  className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-400"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [1, 0.3, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

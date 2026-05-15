import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  CheckCircle,
  Clock,
  AlertTriangle,
  Zap,
  Shield,
  Network,
} from "lucide-react";
import { motion } from "framer-motion";

interface Agent {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: "pending" | "running" | "completed" | "error";
  progress: number;
  findings?: string;
}

export default function Investigation() {
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: "1",
      name: "APK Reverse Engineering",
      icon: <Zap className="w-5 h-5" />,
      status: "running",
      progress: 45,
    },
    {
      id: "2",
      name: "Static Malware Analysis",
      icon: <Shield className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "3",
      name: "Dynamic Threat Investigation",
      icon: <Network className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "4",
      name: "Threat Intelligence Correlation",
      icon: <Brain className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "5",
      name: "AI Malware Reasoning",
      icon: <Brain className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "6",
      name: "Risk Scoring",
      icon: <AlertTriangle className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
    {
      id: "7",
      name: "Executive Report Generation",
      icon: <Shield className="w-5 h-5" />,
      status: "pending",
      progress: 0,
    },
  ]);

  const [logs, setLogs] = useState<string[]>([
    "[✓] APK uploaded successfully",
    "[✓] File validation passed",
    "[→] Starting reverse engineering analysis...",
  ]);

  // Simulate agent progress
  useEffect(() => {
    const interval = setInterval(() => {
      setAgents((prev) => {
        const updated = [...prev];
        const runningAgent = updated.find((a) => a.status === "running");

        if (runningAgent) {
          if (runningAgent.progress < 100) {
            runningAgent.progress += Math.random() * 15;
            if (runningAgent.progress > 100) {
              runningAgent.progress = 100;
              runningAgent.status = "completed";

              // Move to next agent
              const nextIndex =
                updated.findIndex((a) => a.id === runningAgent.id) + 1;
              if (nextIndex < updated.length) {
                updated[nextIndex].status = "running";
              }
            }
          }
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "running":
        return <Clock className="w-5 h-5 text-cyan-400 animate-spin" />;
      case "error":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const overallProgress = Math.round(
    agents.reduce((sum, a) => sum + a.progress, 0) / agents.length
  );

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      {/* Header */}
      <div className="border-b border-white/10 py-8 px-4">
        <div className="container">
          <h1 className="text-4xl font-bold mb-2">Live Investigation</h1>
          <p className="text-muted-foreground">
            Real-time malware analysis in progress
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Investigation Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Overall Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="card-premium">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Analysis Progress</h2>
                  <span className="text-2xl font-bold text-cyan-400">
                    {overallProgress}%
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </Card>
            </motion.div>

            {/* Agent Cards */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">AI Agents</h2>
              {agents.map((agent, idx) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: idx * 0.05 }}
                >
                  <Card
                    className={`card-premium transition-all ${
                      agent.status === "running"
                        ? "border-cyan-500/50 bg-cyan-500/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-cyan-400 mt-1">{agent.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{agent.name}</h3>
                          {getStatusIcon(agent.status)}
                        </div>

                        {agent.status !== "pending" && (
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-cyan-400 to-blue-400"
                              initial={{ width: 0 }}
                              animate={{ width: `${agent.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        )}

                        {agent.status === "running" && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Processing...
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Activity Log */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="card-premium">
                <h2 className="text-xl font-semibold mb-4">Activity Log</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
                  {logs.map((log, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-muted-foreground"
                    >
                      <span className="text-cyan-400">{log}</span>
                    </motion.div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Analysis Info */}
              <Card className="card-premium">
                <h3 className="font-semibold mb-4">Analysis Info</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">File Name</p>
                    <p className="font-semibold">sample.apk</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-semibold">45.2 MB</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Started</p>
                    <p className="font-semibold">Just now</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="font-semibold text-cyan-400">In Progress</p>
                  </div>
                </div>
              </Card>

              {/* Preliminary Findings */}
              <Card className="card-premium">
                <h3 className="font-semibold mb-4">Preliminary Findings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span>Dangerous permissions detected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span>Obfuscated code found</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span>Suspicious API calls</span>
                  </div>
                </div>
              </Card>

              {/* Estimated Time */}
              <Card className="card-premium border-cyan-500/30 bg-cyan-500/5">
                <h3 className="font-semibold mb-2 text-cyan-300">
                  Estimated Time
                </h3>
                <p className="text-sm text-muted-foreground">
                  Analysis will complete in approximately 2-3 minutes.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

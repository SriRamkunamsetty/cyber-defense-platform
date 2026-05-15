import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumAgentCard } from "@/components/PremiumAgentCard";
import { LiveInvestigationLog, type LogEntry } from "@/components/LiveInvestigationLog";
import { ThreatIntelligencePanel, type IOC } from "@/components/ThreatIntelligencePanel";
import { AIReasoningPanel } from "@/components/AIReasoningPanel";
import { RiskScoreVisualization } from "@/components/RiskScoreVisualization";
import { PremiumSOCCopilot } from "@/components/PremiumSOCCopilot";
import { PremiumThreatVisualization } from "@/components/PremiumThreatVisualization";
import { ExecutiveReportViewer } from "@/components/ExecutiveReportViewer";
import { CriticalAlertModal } from "@/components/CriticalAlertModal";
import { AlertTriangle, Brain, Shield, Zap, Network } from "lucide-react";

interface AgentState {
  name: string;
  status: "pending" | "running" | "completed" | "error";
  confidence?: number;
  reasoning?: string;
  progress?: number;
  icon?: React.ReactNode;
}

const AGENT_CONFIGS: AgentState[] = [
  {
    name: "Reverse Engineering",
    status: "pending",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    name: "Static Analysis",
    status: "pending",
    icon: <Shield className="w-5 h-5" />,
  },
  {
    name: "Dynamic Threat",
    status: "pending",
    icon: <Network className="w-5 h-5" />,
  },
  {
    name: "Threat Intelligence",
    status: "pending",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    name: "AI Reasoning",
    status: "pending",
    icon: <Brain className="w-5 h-5" />,
  },
  {
    name: "Risk Scoring",
    status: "pending",
    icon: <AlertTriangle className="w-5 h-5" />,
  },
  {
    name: "Executive Report",
    status: "pending",
    icon: <Shield className="w-5 h-5" />,
  },
];

const INVESTIGATION_LOGS = [
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

export default function Investigation() {
  const [agents, setAgents] = useState<AgentState[]>(AGENT_CONFIGS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [riskScore, setRiskScore] = useState(0);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("live");

  // Simulate investigation progress
  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setLogs((prev) => {
        if (prev.length < INVESTIGATION_LOGS.length) {
          const newLog: LogEntry = {
            id: `log-${Date.now()}`,
            agent: INVESTIGATION_LOGS[prev.length],
            message: INVESTIGATION_LOGS[prev.length],
            status: "running",
            timestamp: new Date().toISOString(),
            progress: Math.random() * 100,
          };
          return [...prev, newLog];
        }
        return prev;
      });

      setAgents((prev) => {
        const updated = [...prev];
        const currentIndex = logs.length;

        if (currentIndex < updated.length) {
          // Mark current agent as running
          if (currentIndex > 0) {
            updated[currentIndex - 1].status = "completed";
            updated[currentIndex - 1].confidence = 85 + Math.random() * 15;
          }

          updated[currentIndex].status = "running";
          updated[currentIndex].progress = Math.random() * 100;
          updated[currentIndex].reasoning =
            "Analyzing APK structure and permissions...";

          // Update risk score
          setRiskScore(Math.min(100, (currentIndex + 1) * 12 + Math.random() * 8));
        } else {
          // All agents completed
          updated[updated.length - 1].status = "completed";
          updated[updated.length - 1].confidence = 92;
          setIsAnalyzing(false);

          // Show critical alert if risk score is high
          if (riskScore > 80) {
            setTimeout(() => setShowCriticalAlert(true), 1000);
          }
        }

        return updated;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [logs.length, isAnalyzing, riskScore]);

  // Mark completed logs
  useEffect(() => {
    setLogs((prev) =>
      prev.map((log, index) => ({
        ...log,
        status:
          index < logs.length - 1 ? "completed" : isAnalyzing ? "running" : "completed",
      }))
    );
  }, [isAnalyzing, logs.length]);

  return (
    <div className="space-y-6 pb-8">
      {/* Critical Alert Modal */}
      <CriticalAlertModal
        isOpen={showCriticalAlert}
        riskScore={Math.round(riskScore)}
        apkName="com.malicious.trojan.banking"
        topThreats={[
          "Banking Trojan Behavior",
          "SMS Interception",
          "Credential Harvesting",
        ]}
        onClose={() => setShowCriticalAlert(false)}
        onViewDetails={() => setActiveTab("report")}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold text-foreground">Live Investigation</h1>
        <p className="text-muted-foreground">
          Real-time APK analysis with 7 autonomous AI agents
        </p>
      </motion.div>

      {/* Risk Score Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Current Risk Score</p>
          <motion.p
            className="text-3xl font-bold text-cyan-300"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {Math.round(riskScore)}
            <span className="text-lg text-muted-foreground">/100</span>
          </motion.p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Agents Active</p>
          <p className="text-3xl font-bold text-cyan-300">
            {agents.filter((a) => a.status !== "pending").length}
            <span className="text-lg text-muted-foreground">/7</span>
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Status</p>
          <p className={`text-lg font-bold ${isAnalyzing ? "text-cyan-300" : "text-green-300"}`}>
            {isAnalyzing ? "Analyzing..." : "Complete"}
          </p>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-white/5 border border-white/10">
          <TabsTrigger value="live">Live Stream</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        {/* Live Stream Tab */}
        <TabsContent value="live" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <LiveInvestigationLog
                logs={logs}
                isActive={isAnalyzing}
                onComplete={() => setIsAnalyzing(false)}
              />
            </div>
            <div>
              <RiskScoreVisualization
              overallScore={Math.round(riskScore)}
              breakdown={{
                dataExfiltration: 85,
                credentialHarvesting: 92,
                c2Communication: 78,
                bankingTrojan: 88,
              }}
            />
            </div>
          </div>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {agents.map((agent, index) => (
              <PremiumAgentCard key={agent.name} agent={agent} index={index} />
            ))}
          </div>
        </TabsContent>

        {/* Threats Tab */}
        <TabsContent value="threats" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <ThreatIntelligencePanel
                iocs={[
                  {
                    type: "permission",
                    value: "READ_SMS",
                    severity: "critical",
                    description: "Allows reading SMS messages",
                  },
                  {
                    type: "network_endpoint",
                    value: "192.168.1.100:8080",
                    severity: "high",
                    description: "Command and control server",
                  },
                ]}
              />
            </div>
            <div>
              <PremiumThreatVisualization
                threats={[
                  {
                    id: "perm-1",
                    label: "READ_SMS",
                    severity: 95,
                    type: "permission",
                  },
                  {
                    id: "endpoint-1",
                    label: "192.168.1.100:8080",
                    severity: 88,
                    type: "endpoint",
                  },
                  {
                    id: "api-1",
                    label: "AccessibilityService",
                    severity: 92,
                    type: "api",
                  },
                  {
                    id: "behavior-1",
                    label: "Encrypted Payload",
                    severity: 85,
                    type: "behavior",
                  },
                ]}
              />
            </div>
          </div>
        </TabsContent>

        {/* Reasoning Tab */}
        <TabsContent value="reasoning" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AIReasoningPanel />
            <PremiumSOCCopilot />
          </div>
        </TabsContent>

        {/* Report Tab */}
        <TabsContent value="report" className="space-y-4">
          <ExecutiveReportViewer
            apkName="com.malicious.trojan.banking"
            riskScore={Math.round(riskScore)}
            timestamp={new Date()}
            summary="This APK exhibits multiple indicators of malicious intent, including banking trojan behavior, SMS interception capabilities, and encrypted command-and-control communication. The application demonstrates sophisticated evasion techniques and poses a critical threat to financial security."
            findings={[
              "Accessibility service abuse detected for credential harvesting",
              "SMS interception capabilities identified",
              "Encrypted C2 communication mechanism discovered",
              "Dynamic payload execution framework detected",
              "Permission escalation vulnerabilities exploited",
            ]}
            recommendations={[
              "Immediately remove APK from all affected devices",
              "Reset all compromised financial credentials",
              "Monitor for unauthorized transactions",
              "Deploy enhanced behavioral detection rules",
              "Implement SMS verification bypass protections",
            ]}
            timeline={[
              { time: "00:00", event: "APK upload initiated" },
              { time: "00:15", event: "Reverse engineering completed" },
              { time: "00:30", event: "Malicious permissions detected" },
              { time: "00:45", event: "C2 communication identified" },
              { time: "01:00", event: "Risk assessment finalized" },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

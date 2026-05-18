import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PremiumAgentCard, type AgentState } from "@/components/PremiumAgentCard";
import { LiveInvestigationLog, type LogEntry } from "@/components/LiveInvestigationLog";
import { ThreatIntelligencePanel, type IOC } from "@/components/ThreatIntelligencePanel";
import { AIReasoningPanel, type AttackChainStep as UIAttackStep } from "@/components/AIReasoningPanel";
import { RiskScoreVisualization } from "@/components/RiskScoreVisualization";
import { PremiumSOCCopilot } from "@/components/PremiumSOCCopilot";
import { PremiumThreatVisualization } from "@/components/PremiumThreatVisualization";
import { ExecutiveReportViewer } from "@/components/ExecutiveReportViewer";
import { CriticalAlertModal } from "@/components/CriticalAlertModal";
import { ApkFileExplorer } from "@/components/ApkFileExplorer";
import { AttackChainFlow } from "@/components/AttackChainFlow";
import { AlertTriangle, Brain, Shield, Zap, Network, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useInvestigationWebSocket, type InvestigationEvent } from "@/hooks/useInvestigationWebSocket";
import {
  AGENT_NAMES,
  AGENT_DISPLAY_NAMES,
  type AgentName,
} from "@shared/evidence";

const AGENT_ICONS: Record<string, React.ReactNode> = {
  "Reverse Engineering": <Zap className="w-5 h-5" />,
  "Static Analysis": <Shield className="w-5 h-5" />,
  "Dynamic Threat": <Network className="w-5 h-5" />,
  "Threat Intelligence": <Brain className="w-5 h-5" />,
  "AI Reasoning": <Brain className="w-5 h-5" />,
  "Risk Scoring": <AlertTriangle className="w-5 h-5" />,
  "Executive Report": <Shield className="w-5 h-5" />,
};

function mapAgentLogsToCards(
  agentLogs: Array<{
    agentName: string;
    status: string;
    progress: number | null;
    findings: string | null;
  }>
): AgentState[] {
  return AGENT_NAMES.map((name) => {
    const log = agentLogs.find((l) => l.agentName === name);
    const display = AGENT_DISPLAY_NAMES[name];
    let reasoning: string | undefined;
    if (log?.findings) {
      try {
        const parsed = JSON.parse(log.findings);
        reasoning = parsed.summary || log.findings.slice(0, 200);
      } catch {
        reasoning = log.findings.slice(0, 200);
      }
    }
    return {
      name: display,
      status: (log?.status as AgentState["status"]) || "pending",
      progress: log?.progress ?? 0,
      confidence:
        log?.status === "completed"
          ? 85
          : log?.status === "running"
            ? 50
            : undefined,
      reasoning,
      icon: AGENT_ICONS[display],
    };
  });
}

export default function Investigation() {
  const [, params] = useRoute("/investigation/:id");
  const investigationId = params?.id ? parseInt(params.id, 10) : null;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showCriticalAlert, setShowCriticalAlert] = useState(false);
  const [activeTab, setActiveTab] = useState("live");
  const [alertShown, setAlertShown] = useState(false);

  const { data, isLoading, refetch } = trpc.investigation.getWithDetails.useQuery(
    { id: investigationId! },
    {
      enabled: !!investigationId && !isNaN(investigationId),
      refetchInterval: (query) => {
        const status = query.state.data?.investigation.status;
        return status === "pending" || status === "analyzing" ? 3000 : false;
      },
    }
  );

  const copilotMutation = trpc.investigation.askCopilot.useMutation();

  const handleWsEvent = useCallback(
    (event: InvestigationEvent) => {
      if (event.investigationId !== investigationId) return;

      if (event.message) {
        const entry: LogEntry = {
          id: `ws-${event.timestamp}-${Math.random()}`,
          agent: event.agentName || "System",
          message: event.message,
          status:
            event.type === "agent_error" || event.type === "investigation_error"
              ? "error"
              : event.type === "investigation_complete" ||
                  event.type === "agent_complete"
                ? "completed"
                : "running",
          timestamp: event.timestamp,
          progress: event.progress,
        };
        setLogs((prev) => {
          if (prev.some((l) => l.message === entry.message && l.status === entry.status))
            return prev;
          return [...prev, entry];
        });
      }

      if (event.type === "investigation_complete") {
        refetch();
        const score = (event.data?.riskScore as number) ?? 0;
        if (score > 80 && !alertShown) {
          setTimeout(() => setShowCriticalAlert(true), 800);
          setAlertShown(true);
        }
      }

      if (
        event.type === "agent_complete" ||
        event.type === "agent_start" ||
        event.type === "agent_progress"
      ) {
        refetch();
      }
    },
    [investigationId, refetch, alertShown]
  );

  const { isConnected } = useInvestigationWebSocket({
    investigationId,
    onEvent: handleWsEvent,
  });

  const investigation = data?.investigation;
  const isAnalyzing =
    investigation?.status === "pending" || investigation?.status === "analyzing";

  const agents = useMemo(
    () => mapAgentLogsToCards(data?.agentLogs ?? []),
    [data?.agentLogs]
  );

  const iocs: IOC[] = useMemo(
    () =>
      (data?.iocs ?? []).map((ioc) => ({
        id: ioc.id,
        type: ioc.type,
        value: ioc.value,
        severity: ioc.severity as IOC["severity"],
        description: ioc.description || "",
      })),
    [data?.iocs]
  );

  const threatNodes = useMemo(
    () =>
      iocs.slice(0, 8).map((ioc, i) => ({
        id: `ioc-${i}`,
        label: ioc.value.length > 24 ? ioc.value.slice(0, 24) + "…" : ioc.value,
        severity:
          ioc.severity === "critical"
            ? 95
            : ioc.severity === "high"
              ? 80
              : ioc.severity === "medium"
                ? 55
                : 30,
        type: ioc.type.includes("permission")
          ? "permission"
          : ioc.type.includes("network")
            ? "endpoint"
            : "api",
      })),
    [iocs]
  );

  const reasoningText = useMemo(() => {
    const reasoningLog = data?.agentLogs?.find(
      (l) => l.agentName === "AI Malware Reasoning"
    );
    if (reasoningLog?.findings) {
      try {
        return JSON.parse(reasoningLog.findings).summary || reasoningLog.findings;
      } catch {
        return reasoningLog.findings;
      }
    }
    return investigation?.aiReasoning?.slice(0, 4000) || "";
  }, [data?.agentLogs, investigation?.aiReasoning]);

  const attackChainUI: UIAttackStep[] = useMemo(
    () =>
      (data?.attackChain ?? []).map((step) => ({
        id: step.id,
        technique: step.stage,
        description: step.description,
        severity: step.severity,
        evidence: step.evidence,
      })),
    [data?.attackChain]
  );

  const findingsList = useMemo(() => {
    const list: string[] = [];
    data?.evidence?.suspiciousMethods?.slice(0, 5).forEach((m) => {
      list.push(`${m.threatCategory}: ${m.methodName} in ${m.filePath}`);
    });
    data?.evidence?.permissions
      ?.filter((p) => p.riskLevel === "critical" || p.riskLevel === "high")
      .slice(0, 5)
      .forEach((p) => list.push(`${p.name}: ${p.abuseDescription}`));
    return list.length ? list : ["Analysis findings will appear as agents complete"];
  }, [data?.evidence]);

  if (!investigationId || isNaN(investigationId)) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Invalid investigation ID.{" "}
        <a href="/dashboard" className="text-cyan-400 underline">
          Upload an APK
        </a>
      </div>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] gap-3 pt-24">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <span className="text-muted-foreground">Loading investigation…</span>
      </div>
    );
  }

  const riskScore = investigation?.riskScore ?? 0;
  const breakdown = {
    dataExfiltration: investigation?.dataExfiltrationScore ?? 0,
    credentialHarvesting: investigation?.credentialHarvestingScore ?? 0,
    c2Communication: investigation?.c2CommunicationScore ?? 0,
    bankingTrojan: investigation?.bankingTrojanScore ?? 0,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-8 min-h-screen bg-background px-4 pt-24"
    >
      <CriticalAlertModal
        isOpen={showCriticalAlert}
        riskScore={riskScore}
        apkName={investigation?.packageName || investigation?.fileName || "Unknown APK"}
        topThreats={iocs
          .filter((i) => i.severity === "critical" || i.severity === "high")
          .slice(0, 3)
          .map((i) => i.description || i.value)}
        onClose={() => setShowCriticalAlert(false)}
        onViewDetails={() => setActiveTab("report")}
      />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold text-neon">Live Investigation</h1>
            <p className="text-muted-foreground font-mono text-sm">
              {investigation?.fileName} · #{investigationId}
              {investigation?.packageName && ` · ${investigation.packageName}`}
            </p>
          </div>
          <motion.div
            animate={{ opacity: isConnected ? 1 : 0.5 }}
            className="flex items-center gap-2 text-xs font-mono"
          >
            <span
              className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-400 animate-pulse" : "bg-gray-500"}`}
            />
            {isConnected ? "Live stream connected" : "Connecting…"}
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="grid grid-cols-3 gap-4"
      >
        <div className="bg-white/5 border border-white/10 rounded-lg p-4 card-premium">
          <p className="text-xs text-muted-foreground mb-2">Risk Score</p>
          <motion.p
            key={riskScore}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-3xl font-bold text-cyan-300"
          >
            {riskScore}
            <span className="text-lg text-muted-foreground">/100</span>
          </motion.p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Agents</p>
          <p className="text-3xl font-bold text-cyan-300">
            {agents.filter((a) => a.status === "completed").length}
            <span className="text-lg text-muted-foreground">/7</span>
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-2">Status</p>
          <p
            className={`text-lg font-bold capitalize ${
              isAnalyzing ? "text-cyan-300 animate-pulse" : investigation?.status === "failed" ? "text-red-400" : "text-green-300"
            }`}
          >
            {investigation?.status ?? "unknown"}
          </p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 bg-white/5 border border-white/10">
          <TabsTrigger value="live">Live</TabsTrigger>
          <TabsTrigger value="explorer">Explorer</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="threats">Threats</TabsTrigger>
          <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
        </TabsList>

        <TabsContent value="live" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <LiveInvestigationLog
                logs={logs}
                isActive={isAnalyzing}
                onComplete={() => refetch()}
              />
            </div>
            <RiskScoreVisualization overallScore={riskScore} breakdown={breakdown} />
          </div>
        </TabsContent>

        <TabsContent value="explorer" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ApkFileExplorer
              fileTree={data?.evidence?.fileTree ?? []}
              packageName={data?.evidence?.packageName || investigation?.packageName || undefined}
              manifestPreview={data?.evidence?.manifestXml}
            />
            <AttackChainFlow steps={data?.attackChain ?? []} />
          </div>
          {data?.evidence?.suspiciousMethods && data.evidence.suspiciousMethods.length > 0 && (
            <Card className="bg-white/5 border border-white/10 p-4">
              <h3 className="font-semibold mb-3 text-cyan-300">Suspicious Code Patterns</h3>
              <motion.div className="space-y-2 max-h-64 overflow-y-auto">
                {data.evidence.suspiciousMethods.slice(0, 10).map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-3 rounded bg-black/30 border border-white/5 font-mono text-xs"
                  >
                    <span className="text-amber-400">{m.threatCategory}</span> — {m.methodName}
                    <pre className="text-muted-foreground mt-1 whitespace-pre-wrap">{m.snippet.slice(0, 200)}</pre>
                  </motion.div>
                ))}
              </motion.div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="agents">
          <div className="grid grid-cols-2 gap-3">
            {agents.map((agent, index) => (
              <PremiumAgentCard key={agent.name} agent={agent} index={index} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <ThreatIntelligencePanel iocs={iocs} isLoading={isAnalyzing} />
            <PremiumThreatVisualization threats={threatNodes} />
          </div>
        </TabsContent>

        <TabsContent value="reasoning" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <AIReasoningPanel
              reasoning={reasoningText}
              attackChain={attackChainUI}
              isLoading={isAnalyzing}
            />
            <PremiumSOCCopilot
              investigationId={investigationId}
              onQuerySubmit={async (query) => {
                const result = await copilotMutation.mutateAsync({
                  investigationId,
                  query,
                });
                return result.response;
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="report">
          <ExecutiveReportViewer
            apkName={investigation?.packageName || investigation?.fileName || "APK"}
            riskScore={riskScore}
            timestamp={investigation?.completedAt ? new Date(investigation.completedAt) : new Date()}
            summary={
              investigation?.threatSummary ||
              "Executive summary will be generated upon investigation completion."
            }
            findings={findingsList}
            recommendations={data?.mitigations ?? []}
            timeline={[
              { time: "T+0", event: "APK uploaded and validated" },
              ...logs.slice(-5).map((l, i) => ({
                time: `T+${i + 1}`,
                event: l.message,
              })),
              ...(investigation?.status === "completed"
                ? [{ time: "End", event: "Investigation completed" }]
                : []),
            ]}
          />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

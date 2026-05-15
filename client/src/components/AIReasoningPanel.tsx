import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronDown,
  ChevronUp,
  Brain,
  GitBranch,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";

export interface AttackChainStep {
  id: string;
  technique: string;
  description: string;
  mitreTechnique?: string;
  severity: "low" | "medium" | "high" | "critical";
  evidence: string[];
}

interface AIReasoningPanelProps {
  reasoning?: string;
  attackChain?: AttackChainStep[];
  mitreMappings?: Array<{
    technique: string;
    tactic: string;
    description: string;
  }>;
  isLoading?: boolean;
}

export function AIReasoningPanel({
  reasoning,
  attackChain,
  mitreMappings,
  isLoading,
}: AIReasoningPanelProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="reasoning" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white/5 border-white/10">
          <TabsTrigger value="reasoning" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Brain className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Reasoning</span>
          </TabsTrigger>
          <TabsTrigger value="chain" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <GitBranch className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Attack Chain</span>
          </TabsTrigger>
          <TabsTrigger value="mitre" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Target className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">MITRE ATT&CK</span>
          </TabsTrigger>
        </TabsList>

        {/* Reasoning Tab */}
        <TabsContent value="reasoning" className="mt-4">
          <Card className="bg-white/5 border-white/10 p-4">
            {isLoading ? (
              <div className="text-center text-muted-foreground py-8">
                Analyzing malware behavior...
              </div>
            ) : reasoning ? (
              <div className="prose prose-invert max-w-none">
                <Streamdown>{reasoning}</Streamdown>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No reasoning available yet
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Attack Chain Tab */}
        <TabsContent value="chain" className="mt-4">
          <div className="space-y-2">
            {!attackChain || attackChain.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-4 text-center text-muted-foreground">
                No attack chain identified
              </Card>
            ) : (
              attackChain.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card
                    className="bg-white/5 border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-colors"
                    onClick={() => toggleStep(step.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-cyan-300">
                              Step {index + 1}
                            </span>
                            <Badge
                              variant="outline"
                              className={`capitalize text-xs ${
                                step.severity === "critical"
                                  ? "bg-red-500/20 text-red-300 border-red-500/30"
                                  : step.severity === "high"
                                    ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                                    : "bg-yellow-500/20 text-yellow-300 border-yellow-500/30"
                              }`}
                            >
                              {step.severity}
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-foreground">
                            {step.technique}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          {expandedSteps.has(step.id) ? (
                            <ChevronUp className="w-5 h-5 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedSteps.has(step.id) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-white/10"
                          >
                            {step.mitreTechnique && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold text-cyan-300 mb-1">
                                  MITRE Technique
                                </p>
                                <p className="text-sm text-foreground font-mono">
                                  {step.mitreTechnique}
                                </p>
                              </div>
                            )}

                            {step.evidence.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-cyan-300 mb-2">
                                  Evidence
                                </p>
                                <ul className="space-y-1">
                                  {step.evidence.map((evidence, i) => (
                                    <li
                                      key={i}
                                      className="text-sm text-muted-foreground flex gap-2"
                                    >
                                      <span className="text-cyan-400">•</span>
                                      <span>{evidence}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        {/* MITRE ATT&CK Tab */}
        <TabsContent value="mitre" className="mt-4">
          <div className="space-y-2">
            {!mitreMappings || mitreMappings.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-4 text-center text-muted-foreground">
                No MITRE ATT&CK techniques identified
              </Card>
            ) : (
              mitreMappings.map((mapping, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="bg-white/5 border-white/10 p-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-cyan-300">
                            {mapping.technique}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mapping.tactic}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-foreground">
                        {mapping.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Shield,
  Network,
  Code2,
  Lock,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

export interface IOC {
  id?: number;
  type: string;
  value: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
}

interface ThreatIntelligencePanelProps {
  iocs: IOC[];
  isLoading?: boolean;
}

const IOC_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  permission: {
    icon: <Shield className="w-4 h-4" />,
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    label: "Permissions",
  },
  network_endpoint: {
    icon: <Network className="w-4 h-4" />,
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    label: "Network Endpoints",
  },
  api_call: {
    icon: <Code2 className="w-4 h-4" />,
    color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
    label: "API Calls",
  },
  obfuscation: {
    icon: <Lock className="w-4 h-4" />,
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    label: "Obfuscation",
  },
  hardcoded_string: {
    icon: <Zap className="w-4 h-4" />,
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    label: "Hardcoded Strings",
  },
};

const SEVERITY_CONFIG: Record<string, string> = {
  critical: "bg-red-500/20 text-red-300 border-red-500/30",
  high: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  low: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export function ThreatIntelligencePanel({
  iocs,
  isLoading,
}: ThreatIntelligencePanelProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const groupedByType = iocs.reduce(
    (acc, ioc) => {
      if (!acc[ioc.type]) {
        acc[ioc.type] = [];
      }
      acc[ioc.type].push(ioc);
      return acc;
    },
    {} as Record<string, IOC[]>
  );

  const groupedBySeverity = iocs.reduce(
    (acc, ioc) => {
      if (!acc[ioc.severity]) {
        acc[ioc.severity] = [];
      }
      acc[ioc.severity].push(ioc);
      return acc;
    },
    {} as Record<string, IOC[]>
  );

  const criticalCount = (groupedBySeverity.critical || []).length;
  const highCount = (groupedBySeverity.high || []).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-xs text-muted-foreground">Critical IOCs</p>
              <p className="text-2xl font-bold text-red-300">{criticalCount}</p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/5 border-white/10 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-xs text-muted-foreground">High Severity</p>
              <p className="text-2xl font-bold text-orange-300">{highCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* IOCs by Type */}
      <Card className="bg-white/5 border-white/10 p-4">
        <h3 className="font-semibold text-cyan-300 mb-4">IOCs by Type</h3>

        <Tabs defaultValue={Object.keys(groupedByType)[0]} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 bg-white/5 border-white/10">
            {Object.entries(groupedByType).map(([type, items]) => {
              const config = IOC_TYPE_CONFIG[type] || {
                icon: <Shield className="w-4 h-4" />,
                label: type,
              };
              return (
                <TabsTrigger
                  key={type}
                  value={type}
                  className="text-xs data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300"
                >
                  <span className="hidden sm:inline">{config.label}</span>
                  <span className="sm:hidden">{items.length}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(groupedByType).map(([type, items]) => (
            <TabsContent key={type} value={type} className="space-y-2 mt-4">
              {items.map((ioc, index) => (
                <motion.div
                  key={ioc.id || index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3 rounded-lg border ${SEVERITY_CONFIG[ioc.severity]} space-y-1`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-mono break-all">{ioc.value}</p>
                      <p className="text-xs opacity-70 mt-1">{ioc.description}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`capitalize whitespace-nowrap ${SEVERITY_CONFIG[ioc.severity]}`}
                    >
                      {ioc.severity}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* IOCs by Severity */}
      <Card className="bg-white/5 border-white/10 p-4">
        <h3 className="font-semibold text-cyan-300 mb-4">IOCs by Severity</h3>

        <div className="space-y-3">
          {["critical", "high", "medium", "low"].map((severity) => {
            const items = groupedBySeverity[severity] || [];
            if (items.length === 0) return null;

            return (
              <div key={severity}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold capitalize text-foreground">
                    {severity}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} found
                  </span>
                </div>

                <div className="space-y-1">
                  {items.slice(0, 3).map((ioc, index) => (
                    <div
                      key={ioc.id || index}
                      className={`p-2 rounded text-xs ${SEVERITY_CONFIG[severity]}`}
                    >
                      <p className="font-mono truncate">{ioc.value}</p>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <p className="text-xs text-muted-foreground px-2 py-1">
                      +{items.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {isLoading && (
        <Card className="bg-white/5 border-white/10 p-4 text-center text-muted-foreground">
          Analyzing IOCs...
        </Card>
      )}
    </div>
  );
}

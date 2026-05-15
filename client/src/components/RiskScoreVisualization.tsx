import React from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface RiskScoreVisualizationProps {
  overallScore: number;
  breakdown: {
    dataExfiltration: number;
    credentialHarvesting: number;
    c2Communication: number;
    bankingTrojan: number;
  };
}

export function RiskScoreVisualization({
  overallScore,
  breakdown,
}: RiskScoreVisualizationProps) {
  const getRiskLevel = (score: number): string => {
    if (score >= 80) return "Critical";
    if (score >= 60) return "High";
    if (score >= 40) return "Medium";
    return "Low";
  };

  const getRiskColor = (score: number): string => {
    if (score >= 80) return "text-red-400";
    if (score >= 60) return "text-orange-400";
    if (score >= 40) return "text-yellow-400";
    return "text-green-400";
  };

  const getRiskBgColor = (score: number): string => {
    if (score >= 80) return "bg-red-500/20 border-red-500/30";
    if (score >= 60) return "bg-orange-500/20 border-orange-500/30";
    if (score >= 40) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-green-500/20 border-green-500/30";
  };

  const categories = [
    {
      label: "Data Exfiltration",
      value: breakdown.dataExfiltration,
      icon: "📤",
    },
    {
      label: "Credential Harvesting",
      value: breakdown.credentialHarvesting,
      icon: "🔑",
    },
    {
      label: "C2 Communication",
      value: breakdown.c2Communication,
      icon: "📡",
    },
    {
      label: "Banking Trojan Indicators",
      value: breakdown.bankingTrojan,
      icon: "🏦",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall Risk Score */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card className={`border p-6 ${getRiskBgColor(overallScore)}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Overall Risk Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getRiskColor(overallScore)}`}>
                  {overallScore}
                </span>
                <span className="text-lg text-foreground">/100</span>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${getRiskColor(overallScore)}`}>
                {getRiskLevel(overallScore)}
              </p>
              {overallScore >= 80 && (
                <div className="flex items-center gap-1 mt-2 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-semibold">CRITICAL</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={overallScore}
              className="h-3 bg-white/10"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
              <span>Critical</span>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Risk Breakdown */}
      <Card className="bg-white/5 border-white/10 p-6">
        <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Risk Breakdown
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <span className="text-lg">{category.icon}</span>
                  {category.label}
                </label>
                <span className={`text-lg font-bold ${getRiskColor(category.value)}`}>
                  {category.value}
                </span>
              </div>

              <div className="space-y-1">
                <Progress
                  value={category.value}
                  className="h-2 bg-white/10"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0</span>
                  <span>50</span>
                  <span>100</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Risk Assessment Summary */}
      <Card className="bg-white/5 border-white/10 p-4">
        <h4 className="text-sm font-semibold text-cyan-300 mb-3">
          Assessment Summary
        </h4>
        <div className="space-y-2 text-sm text-muted-foreground">
          {overallScore >= 80 && (
            <p className="text-red-300">
              ⚠️ This APK presents a critical security threat. Immediate action
              is recommended.
            </p>
          )}
          {overallScore >= 60 && overallScore < 80 && (
            <p className="text-orange-300">
              ⚠️ This APK shows high-risk indicators. Careful review and
              restrictions are advised.
            </p>
          )}
          {overallScore >= 40 && overallScore < 60 && (
            <p className="text-yellow-300">
              ⚠️ This APK has medium-risk characteristics. Monitor behavior
              closely.
            </p>
          )}
          {overallScore < 40 && (
            <p className="text-green-300">
              ✓ This APK appears to have low risk indicators, but standard
              security practices should still apply.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

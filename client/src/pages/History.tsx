import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Investigation {
  id: string;
  fileName: string;
  riskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  timestamp: string;
  status: "completed" | "failed";
}

export default function History() {
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");
  const [investigations] = useState<Investigation[]>([
    {
      id: "1",
      fileName: "app-v1.0.apk",
      riskScore: 15,
      riskLevel: "low",
      timestamp: "2 hours ago",
      status: "completed",
    },
    {
      id: "2",
      fileName: "banking-app.apk",
      riskScore: 85,
      riskLevel: "critical",
      timestamp: "1 day ago",
      status: "completed",
    },
    {
      id: "3",
      fileName: "game-installer.apk",
      riskScore: 42,
      riskLevel: "medium",
      timestamp: "3 days ago",
      status: "completed",
    },
  ]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "high":
        return "text-orange-400";
      case "critical":
        return "text-red-400";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-green-500/10 border-green-500/30";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/30";
      case "high":
        return "bg-orange-500/10 border-orange-500/30";
      case "critical":
        return "bg-red-500/10 border-red-500/30";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  const filteredInvestigations = investigations.filter((inv) => {
    const matchesSearch = inv.fileName
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesRisk =
      riskFilter === "all" || inv.riskLevel === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      {/* Header */}
      <div className="border-b border-white/10 py-8 px-4">
        <div className="container">
          <h1 className="text-4xl font-bold mb-2">Investigation History</h1>
          <p className="text-muted-foreground">
            View and manage all past APK analyses
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 px-4">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 flex flex-col sm:flex-row gap-4"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by file name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10">
              <SelectValue placeholder="Filter by risk level" />
            </SelectTrigger>
            <SelectContent className="bg-card border-white/10">
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Investigations List */}
        {filteredInvestigations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="card-premium text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No investigations found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters
              </p>
            </Card>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {filteredInvestigations.map((inv, idx) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
              >
                <Card
                  className={`card-premium cursor-pointer hover:shadow-lg transition-all ${getRiskBgColor(inv.riskLevel)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-white/10 rounded-lg">
                        <FileText className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{inv.fileName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {inv.timestamp}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div
                          className={`text-2xl font-bold ${getRiskColor(inv.riskLevel)}`}
                        >
                          {inv.riskScore}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {inv.riskLevel} Risk
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inv.status === "completed" ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        )}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/20 hover:bg-white/5"
                      >
                        View Report
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid md:grid-cols-4 gap-4 mt-12"
        >
          <Card className="card-premium text-center">
            <div className="text-3xl font-bold text-cyan-400">
              {investigations.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Analyses</div>
          </Card>
          <Card className="card-premium text-center">
            <div className="text-3xl font-bold text-green-400">
              {investigations.filter((i) => i.riskLevel === "low").length}
            </div>
            <div className="text-sm text-muted-foreground">Low Risk</div>
          </Card>
          <Card className="card-premium text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {investigations.filter((i) => i.riskLevel === "medium").length}
            </div>
            <div className="text-sm text-muted-foreground">Medium Risk</div>
          </Card>
          <Card className="card-premium text-center">
            <div className="text-3xl font-bold text-red-400">
              {investigations.filter((i) => i.riskLevel === "critical").length}
            </div>
            <div className="text-sm text-muted-foreground">Critical Risk</div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

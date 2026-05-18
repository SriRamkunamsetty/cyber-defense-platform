import { useState, useMemo } from "react";
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
import { Search, FileText, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("all");

  const { data: investigations, isLoading } =
    trpc.investigation.listUserInvestigations.useQuery();

  const filtered = useMemo(() => {
    if (!investigations) return [];
    return investigations.filter((inv) => {
      const matchesSearch =
        inv.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inv.packageName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesRisk =
        riskFilter === "all" || inv.riskLevel === riskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [investigations, searchTerm, riskFilter]);

  const getRiskColor = (level: string | null) => {
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

  const getRiskBgColor = (level: string | null) => {
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground pt-24 px-4"
    >
      <div className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-neon mb-2">Investigation History</h1>
          <p className="text-muted-foreground">
            Past APK malware investigations and threat intelligence reports
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4 mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by filename or package…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10">
              <SelectValue placeholder="Risk level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk levels</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="bg-white/5 border border-white/10 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No investigations found</p>
            <Button className="btn-cyber mt-4" onClick={() => navigate("/dashboard")}>
              Start First Investigation
            </Button>
          </Card>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.06 } },
            }}
            className="space-y-3"
          >
            {filtered.map((inv) => (
              <motion.div
                key={inv.id}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <Card
                  className={`p-4 border cursor-pointer hover:bg-white/10 transition-all ${getRiskBgColor(inv.riskLevel)}`}
                  onClick={() => navigate(`/investigation/${inv.id}`)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      {inv.status === "completed" ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : inv.status === "failed" ? (
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                      ) : (
                        <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      )}
                      <div>
                        <p className="font-semibold">{inv.fileName}</p>
                        {inv.packageName && (
                          <p className="text-xs font-mono text-muted-foreground">
                            {inv.packageName}
                          </p>
                        )}
                      </div>
                    </div>
                    <motion.div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${getRiskColor(inv.riskLevel)}`}>
                          {inv.riskScore ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {inv.riskLevel} risk
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}
                      </p>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

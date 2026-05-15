import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Zap, Shield, Brain, Radar, TrendingUp, Lock } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/5 backdrop-blur-md border border-white/10 border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-cyan-400" />
            <span className="text-xl font-bold text-neon">CyberDefense AI</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-muted-foreground">
                  Welcome, {user?.name || "User"}
                </span>
                <Button
                  onClick={() => navigate("/dashboard")}
                  className="btn-cyber"
                >
                  Dashboard
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate("/dashboard")}
                className="btn-cyber"
              >
                Get Started
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <motion.div
          className="container max-w-4xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Animated background elements */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-40 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" />
          </div>

          <motion.h1
            variants={itemVariants}
            className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
            transition={{ duration: 0.6 }}
          >
            <span className="text-neon">AI-Powered</span> Android Malware
            <br />
            <span className="text-cyan-400">Intelligence Platform</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed"
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Analyze suspicious APK files with enterprise-grade AI agents. Get
            real-time threat intelligence, explainable malware reasoning, and
            executive-ready security reports in minutes.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Button
              onClick={() => navigate("/dashboard")}
              className="btn-cyber px-8 py-3 text-base"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Analysis
            </Button>
            <Button
              variant="outline"
              className="px-8 py-3 text-base border-white/20 hover:bg-white/5"
            >
              View Documentation
            </Button>
          </motion.div>

          {/* Live threat counter */}
          <motion.div
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 max-w-md mx-auto"
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="card-premium text-center">
              <div className="text-2xl font-bold text-cyan-400">7</div>
              <div className="text-xs text-muted-foreground">AI Agents</div>
            </div>
            <div className="card-premium text-center">
              <div className="text-2xl font-bold text-cyan-400">0-100</div>
              <div className="text-xs text-muted-foreground">Risk Score</div>
            </div>
            <div className="card-premium text-center">
              <div className="text-2xl font-bold text-cyan-400">Real-time</div>
              <div className="text-xs text-muted-foreground">Updates</div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 border-t border-white/10">
        <motion.div
          className="container"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            variants={itemVariants}
            className="text-4xl font-bold text-center mb-16"
            transition={{ duration: 0.6 }}
          >
            Enterprise-Grade Threat Analysis
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Multi-Agent AI",
                description:
                  "7 specialized AI agents analyze APK files sequentially for comprehensive threat detection",
              },
              {
                icon: Radar,
                title: "Real-Time Streaming",
                description:
                  "Live WebSocket updates show agent progress and findings as analysis unfolds",
              },
              {
                icon: Shield,
                title: "Threat Intelligence",
                description:
                  "Extract IOCs including permissions, endpoints, API calls, and obfuscation patterns",
              },
              {
                icon: TrendingUp,
                title: "Risk Scoring",
                description:
                  "Composite 0-100 risk score with breakdown across data exfiltration, credential harvesting, C2, and banking trojans",
              },
              {
                icon: Lock,
                title: "Explainable AI",
                description:
                  "Step-by-step malware analysis with MITRE ATT&CK framework mapping",
              },
              {
                icon: Zap,
                title: "Executive Reports",
                description:
                  "Auto-generated PDF reports with findings, recommendations, and threat timelines",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="card-premium group hover:neon-glow-cyan"
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <feature.icon className="w-8 h-8 text-cyan-400 mb-4 group-hover:text-cyan-300 transition-colors" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-white/10">
        <motion.div
          className="container max-w-2xl mx-auto text-center"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2
            variants={itemVariants}
            className="text-4xl font-bold mb-6"
            transition={{ duration: 0.6 }}
          >
            Ready to Analyze?
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-lg text-muted-foreground mb-8"
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Upload your APK files and get instant AI-powered threat analysis
            with real-time progress tracking and comprehensive security reports.
          </motion.p>
          <motion.div variants={itemVariants} transition={{ duration: 0.6, delay: 0.2 }}>
            <Button
              onClick={() => navigate("/dashboard")}
              className="btn-cyber px-8 py-3 text-base"
            >
              Start Now
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 text-center text-sm text-muted-foreground">
        <div className="container">
          <p>
            CyberDefense AI © 2026. Enterprise-grade malware analysis platform.
          </p>
        </div>
      </footer>
    </div>
  );
}

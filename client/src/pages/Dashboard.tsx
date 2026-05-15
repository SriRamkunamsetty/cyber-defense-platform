import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.name.endsWith(".apk")) {
        setSelectedFile(file);
      } else {
        alert("Please drop a valid APK file");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAnalyze = () => {
    if (selectedFile) {
      // Navigate to investigation page with file
      navigate("/investigation/new");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-20">
      {/* Header */}
      <div className="border-b border-white/10 py-8 px-4">
        <div className="container">
          <h1 className="text-4xl font-bold mb-2">APK Analysis Dashboard</h1>
          <p className="text-muted-foreground">
            Upload suspicious APK files for instant AI-powered threat analysis
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-12 px-4">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Card className="bg-white/5 backdrop-blur-md border border-white/10 p-0 overflow-hidden">
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`p-12 text-center transition-all duration-300 ${
                    dragActive
                      ? "bg-cyan-500/10 border-cyan-500/50"
                      : "bg-transparent"
                  }`}
                >
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-lg flex items-center justify-center transition-all ${
                        dragActive
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-white/5 text-cyan-300"
                      }`}
                    >
                      <Upload className="w-8 h-8" />
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold mb-2">
                        {selectedFile
                          ? selectedFile.name
                          : "Drop your APK file here"}
                      </h2>
                      <p className="text-muted-foreground mb-4">
                        or click to select from your computer
                      </p>
                    </div>

                    <input
                      type="file"
                      accept=".apk"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="apk-input"
                    />
                    <label htmlFor="apk-input">
                      <Button
                        asChild
                        className="btn-cyber cursor-pointer"
                      >
                        <span>Browse Files</span>
                      </Button>
                    </label>

                    {selectedFile && (
                      <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10 w-full text-left">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-cyan-400" />
                          <div className="flex-1">
                            <p className="font-semibold">{selectedFile.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedFile && (
                  <div className="border-t border-white/10 p-6 flex gap-4">
                    <Button
                      onClick={handleAnalyze}
                      className="btn-cyber flex-1"
                    >
                      Start Analysis
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFile(null)}
                      className="border-white/20"
                    >
                      Clear
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="card-premium">
                  <AlertCircle className="w-6 h-6 text-cyan-400 mb-3" />
                  <h3 className="font-semibold mb-2">Supported Files</h3>
                  <p className="text-sm text-muted-foreground">
                    Android APK files up to 500MB. All files are analyzed
                    securely and deleted after processing.
                  </p>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="card-premium">
                  <Clock className="w-6 h-6 text-cyan-400 mb-3" />
                  <h3 className="font-semibold mb-2">Analysis Time</h3>
                  <p className="text-sm text-muted-foreground">
                    Most analyses complete in 2-5 minutes. You'll see real-time
                    progress updates as agents work.
                  </p>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Quick Stats */}
              <Card className="card-premium">
                <h3 className="font-semibold mb-4">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Analyses</span>
                    <span className="font-semibold">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">High Risk</span>
                    <span className="font-semibold text-red-400">0</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">This Month</span>
                    <span className="font-semibold">0</span>
                  </div>
                </div>
              </Card>

              {/* Recent Analyses */}
              <Card className="card-premium">
                <h3 className="font-semibold mb-4">Recent Analyses</h3>
                <p className="text-sm text-muted-foreground text-center py-4">
                  No analyses yet. Upload an APK to get started.
                </p>
              </Card>

              {/* Help */}
              <Card className="card-premium border-cyan-500/30 bg-cyan-500/5">
                <h3 className="font-semibold mb-2 text-cyan-300">Need Help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Check our documentation for detailed analysis information.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
                >
                  View Docs
                </Button>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

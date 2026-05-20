import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, AlertCircle, Clock, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getDevLoginUrl, isLocalDevClient } from "@/const";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = trpc.investigation.createFromUpload.useMutation({
    onSuccess: (data) => {
      setUploadProgress(100);
      toast.success("APK uploaded — investigation started");
      navigate(`/investigation/${data.investigationId}`);
    },
    onError: (err) => {
      toast.error(err.message || "Upload failed");
      setUploadProgress(0);
    },
  });

  const { data: investigations } = trpc.investigation.listUserInvestigations.useQuery();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.name.endsWith(".apk")) setSelectedFile(file);
    else toast.error("Please drop a valid .apk file");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const getUploadUrlMutation = trpc.investigation.getPresignedUploadUrl.useMutation();

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setUploadProgress(10);
    try {
      const { uploadUrl, fileKey } = await getUploadUrlMutation.mutateAsync({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
      });
      setUploadProgress(30);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", "application/vnd.android.package-archive");

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percentComplete = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(30 + Math.round(percentComplete * 0.5));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(selectedFile);
      });

      setUploadProgress(85);

      await uploadMutation.mutateAsync({
        fileName: selectedFile.name,
        fileKey,
        fileSize: selectedFile.size,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Upload process failed");
      setUploadProgress(0);
    }
  };

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20 px-4">
        <Card className="bg-white/5 border border-white/10 p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication required</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Sign in to upload APKs and run investigations.
          </p>
          {isLocalDevClient ? (
            <Button
              className="btn-cyber"
              onClick={() => {
                window.location.href = getDevLoginUrl("/dashboard");
              }}
            >
              Dev Login
            </Button>
          ) : (
            <Button className="btn-cyber" asChild>
              <a href="/api/oauth/callback">Sign in</a>
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const recentCount = investigations?.length ?? 0;
  const criticalCount =
    investigations?.filter((i) => (i.riskScore ?? 0) > 80).length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background text-foreground pt-20"
    >
      <div className="border-b border-white/10 py-8 px-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="container"
        >
          <h1 className="text-4xl font-bold mb-2 text-neon">TRINETRA AI</h1>
          <p className="text-muted-foreground">
            Upload suspicious APK files for autonomous reverse engineering and threat intelligence
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="container py-12 px-4"
      >
        <motion.div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="bg-white/5 backdrop-blur-md border border-white/10 p-0 overflow-hidden card-premium">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`p-12 text-center transition-all duration-300 ${
                  dragActive ? "bg-cyan-500/10 border-cyan-500/50" : ""
                }`}
              >
                <motion.div
                  animate={dragActive ? { scale: 1.05 } : { scale: 1 }}
                  className="flex flex-col items-center gap-4"
                >
                  <Upload className="w-16 h-16 text-cyan-400/80" />
                  <h2 className="text-xl font-semibold">Drop APK for Analysis</h2>
                  <p className="text-muted-foreground text-sm max-w-md">
                    Real forensic pipeline: APKTool, JADX, permission intelligence, and grounded AI agents
                  </p>
                  <input
                    type="file"
                    accept=".apk"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="apk-upload"
                  />
                  <label htmlFor="apk-upload">
                    <Button variant="outline" className="btn-cyber cursor-pointer" asChild>
                      <span>Browse Files</span>
                    </Button>
                  </label>
                </motion.div>

                {selectedFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-8 p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <motion.div className="flex items-center gap-3 justify-center">
                      <FileText className="w-5 h-5 text-cyan-400" />
                      <span className="font-mono text-sm">{selectedFile.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </motion.div>
                    {uploadMutation.isPending && (
                      <div className="mt-4 space-y-2">
                        <Progress value={uploadProgress} className="h-1" />
                        <p className="text-xs text-cyan-300">Uploading and starting investigation…</p>
                      </div>
                    )}
                    <Button
                      className="btn-cyber mt-4 w-full"
                      onClick={handleAnalyze}
                      disabled={uploadMutation.isPending}
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting Investigation…
                        </>
                      ) : (
                        "Start Autonomous Investigation"
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Investigation Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Total Analyses</span>
                  <span className="font-bold text-cyan-300">{recentCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Critical Threats</span>
                  <span className="font-bold text-red-400">{criticalCount}</span>
                </div>
              </div>
            </Card>

            <Card className="bg-white/5 border border-white/10 p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Pipeline
              </h3>
              <ul className="text-xs text-muted-foreground space-y-1 font-mono">
                <li>→ APK unpack & manifest</li>
                <li>→ JADX decompilation</li>
                <li>→ IOC extraction</li>
                <li>→ 7 grounded AI agents</li>
                <li>→ Executive report</li>
              </ul>
            </Card>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  AlertTriangle,
  Package,
} from "lucide-react";
import type { ApkFileNode } from "@shared/evidence";

interface ApkFileExplorerProps {
  fileTree: ApkFileNode[];
  packageName?: string;
  manifestPreview?: string;
}

function TreeNode({ node, depth = 0 }: { node: ApkFileNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2);
  const isFolder = node.type === "folder" && node.children?.length;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.03 }}
      className="select-none"
    >
      <button
        type="button"
        onClick={() => isFolder && setOpen(!open)}
        className={`flex items-center gap-2 w-full text-left py-1 px-2 rounded-md hover:bg-white/5 transition-colors ${
          node.flagged ? "text-cyan-300" : "text-muted-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isFolder ? (
          open ? (
            <ChevronDown className="w-3 h-3 shrink-0" />
          ) : (
            <ChevronRight className="w-3 h-3 shrink-0" />
          )
        ) : (
          <span className="w-3" />
        )}
        {isFolder ? (
          <Folder className="w-4 h-4 text-cyan-400/80 shrink-0" />
        ) : (
          <File className="w-4 h-4 shrink-0" />
        )}
        <span className="text-sm font-mono truncate">{node.name}</span>
        {node.flagged && (
          <AlertTriangle className="w-3 h-3 text-amber-400 ml-auto shrink-0" />
        )}
      </button>
      <AnimatePresence>
        {isFolder && open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            {node.children?.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function ApkFileExplorer({
  fileTree,
  packageName,
  manifestPreview,
}: ApkFileExplorerProps) {
  return (
    <Card className="bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-4 border-b border-white/10 flex items-center justify-between"
      >
        <motion.div
          animate={{ boxShadow: ["0 0 0px rgba(34,211,238,0)", "0 0 20px rgba(34,211,238,0.2)", "0 0 0px rgba(34,211,238,0)"] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="flex items-center gap-2"
        >
          <Package className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-foreground">APK Architecture</h3>
        </motion.div>
        {packageName && (
          <Badge variant="outline" className="font-mono text-xs border-cyan-500/30 text-cyan-300">
            {packageName}
          </Badge>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-2 max-h-80 overflow-y-auto font-mono text-sm"
      >
        {fileTree.length === 0 ? (
          <p className="text-muted-foreground text-center py-8 text-sm">
            File tree will appear after APK analysis
          </p>
        ) : (
          fileTree.map((node) => <TreeNode key={node.path} node={node} />)
        )}
      </motion.div>

      {manifestPreview && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="border-t border-white/10 p-3"
        >
          <p className="text-xs text-muted-foreground mb-2">AndroidManifest.xml (preview)</p>
          <pre className="text-xs text-cyan-200/80 overflow-x-auto max-h-32 bg-black/30 rounded p-2">
            {manifestPreview.slice(0, 800)}
            {manifestPreview.length > 800 ? "…" : ""}
          </pre>
        </motion.div>
      )}
    </Card>
  );
}

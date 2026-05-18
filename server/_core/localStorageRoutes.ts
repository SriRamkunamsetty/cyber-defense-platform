import type { Express, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { isLocalDev, LOCAL_STORAGE_DIR } from "./localDev";

export function registerLocalStorageRoutes(app: Express): void {
  if (!isLocalDev()) return;

  app.get("/api/local-files/*", async (req: Request, res: Response) => {
    try {
      const key = (req.params as { 0?: string })[0];
      if (!key) {
        res.status(400).json({ error: "Missing file key" });
        return;
      }

      const filePath = path.join(LOCAL_STORAGE_DIR, decodeURIComponent(key));
      const resolved = path.resolve(filePath);
      if (!resolved.startsWith(path.resolve(LOCAL_STORAGE_DIR))) {
        res.status(403).json({ error: "Invalid path" });
        return;
      }

      await fs.access(resolved);
      res.sendFile(resolved);
    } catch {
      res.status(404).json({ error: "File not found" });
    }
  });

  console.log("[Storage] Local filesystem storage:", LOCAL_STORAGE_DIR);
}

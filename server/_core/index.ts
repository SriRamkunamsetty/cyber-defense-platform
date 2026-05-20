import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { getStorageMode } from "../storage";
import { initializeWebSocket } from "../websocket";
import { createContext } from "./context";
import { registerDevAuthRoutes } from "./devAuth";
import { ENV } from "./env";
import { useCloudTasks, useRedisPubSub } from "./gcpConfig";
import { isLocalDev } from "./localDev";
import { registerLocalStorageRoutes } from "./localStorageRoutes";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { serveStatic, setupVite } from "./vite";
import { registerWorkerRoutes } from "./workerRoutes";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function isWebSocketRoleEnabled(): boolean {
  return ENV.workerRole !== "forensics" && ENV.workerRole !== "ai";
}

function validateRealtimeTopology(): void {
  if (ENV.isProduction && isWebSocketRoleEnabled() && !useRedisPubSub()) {
    console.warn(
      "[Topology] WARNING: REDIS_URL not set in production. WebSocket sync limited to single instance. Set --max-instances=1 on Cloud Run or configure Memorystore Redis."
    );
  }
}

import { registerSecurityHeaders } from "./securityHeaders";
import { registerCors } from "./cors";
import { apiRateLimit } from "./rateLimiter";

async function startServer() {
  const app = express();
  const server = createServer(app);

  validateRealtimeTopology();

  if (isWebSocketRoleEnabled()) {
    initializeWebSocket(server);
  }

  // Register security headers and CORS
  registerSecurityHeaders(app);
  registerCors(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  
  // Apply API rate limit to tRPC and internal API routes
  app.use("/api/trpc", apiRateLimit);
  app.use("/api/internal", apiRateLimit);

  registerLocalStorageRoutes(app);
  registerStorageProxy(app);
  registerDevAuthRoutes(app);
  registerWorkerRoutes(app);
  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log("");
    console.log("===================================================");
    console.log("  TRINETRA AI - Cyber Defense Platform");
    console.log(`  http://localhost:${port}/`);
    if (isLocalDev()) {
      console.log("  Mode: LOCAL_DEV (filesystem storage + dev auth)");
      console.log(`  Dev login: http://localhost:${port}/api/dev/login`);
    }
    console.log(
      `  WebSocket: ${
        isWebSocketRoleEnabled()
          ? `ws://localhost:${port}/api/ws`
          : "disabled for worker-only role"
      }`
    );
    console.log(
      `  Database: ${
        ENV.databaseUrl ? "configured" : "MISSING - set DATABASE_URL"
      }`
    );
    console.log(
      `  LLM: ${
        ENV.forgeApiKey
          ? "Forge/Gemini"
          : isLocalDev()
            ? "mock (grounded)"
            : "MISSING API KEY"
      }`
    );
    console.log(`  Storage: ${getStorageMode()}`);
    console.log(`  Queue: ${useCloudTasks() ? "Cloud Tasks" : "inline"}`);
    console.log(
      `  Redis WS bridge: ${
        useRedisPubSub() ? "enabled" : "disabled (single-instance)"
      }`
    );
    console.log(`  Worker role: ${ENV.workerRole}`);
    console.log(`  Region: ${ENV.deploymentRegion}`);
    console.log("===================================================");
    console.log("");
  });
}

startServer().catch(console.error);

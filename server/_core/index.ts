import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerDevAuthRoutes } from "./devAuth";
import { registerLocalStorageRoutes } from "./localStorageRoutes";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { ENV } from "./env";
import { isLocalDev } from "./localDev";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeWebSocket, type HTTPServer } from "../websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize WebSocket server for real-time investigation updates
  initializeWebSocket(server);
  
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerLocalStorageRoutes(app);
  registerStorageProxy(app);
  registerDevAuthRoutes(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log("");
    console.log("═══════════════════════════════════════════════════");
    console.log("  TRINETRA AI — Cyber Defense Platform");
    console.log(`  http://localhost:${port}/`);
    if (isLocalDev()) {
      console.log("  Mode: LOCAL_DEV (filesystem storage + dev auth)");
      console.log(`  Dev login: http://localhost:${port}/api/dev/login`);
    }
    console.log(`  WebSocket: ws://localhost:${port}/api/ws`);
    console.log(`  Database: ${ENV.databaseUrl ? "configured" : "MISSING — set DATABASE_URL"}`);
    console.log(`  LLM: ${ENV.forgeApiKey ? "Forge/Gemini" : isLocalDev() ? "mock (grounded)" : "MISSING API KEY"}`);
    console.log("═══════════════════════════════════════════════════");
    console.log("");
  });
}

startServer().catch(console.error);

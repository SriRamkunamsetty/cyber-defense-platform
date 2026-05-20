import type { Express } from "express";
import cors from "cors";
import { ENV } from "./env";

export function registerCors(app: Express): void {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  // If we have a Cloud Run URL or custom domain, allow it too
  if (process.env.SERVICE_URL) {
    allowedOrigins.push(process.env.SERVICE_URL);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.some((o) => origin.startsWith(o)) || !ENV.isProduction) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
    })
  );
}

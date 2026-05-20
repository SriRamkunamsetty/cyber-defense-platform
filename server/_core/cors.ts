import type { Express } from "express";
import cors from "cors";
import { ENV } from "./env";

export function registerCors(app: Express): void {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
  ];

  if (process.env.SERVICE_URL) {
    allowedOrigins.push(process.env.SERVICE_URL);
  }

  const corsOptionsDelegate = (req: any, callback: any) => {
    const origin = req.header("Origin");
    const host = req.header("Host");
    let allow = false;

    if (!origin) {
      allow = true;
    } else if (!ENV.isProduction) {
      allow = true;
    } else if (allowedOrigins.some((o) => origin.startsWith(o))) {
      allow = true;
    } else if (host && (origin === `https://${host}` || origin === `http://${host}`)) {
      allow = true;
    }

    const corsOptions = {
      origin: allow ? origin : false,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
    };

    callback(null, corsOptions);
  };

  app.use(cors(corsOptionsDelegate));
}

import type { Request, Response, NextFunction } from "express";

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

function cleanOldTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

function getClientIdentifier(req: Request, keyPrefix: string): string {
  // If user is set via context (e.g. if we check req.user, though req.user might be attached by trpc context)
  // Express doesn't have req.user by default unless we set it. Let's check headers first or IP.
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown-ip";
  
  // Custom header for user identification if passed by client, fallback to IP
  const userHeader = req.headers["x-user-id"] || "";
  return `${keyPrefix}:${userHeader || ip}`;
}

export function createLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix: string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientIdentifier(req, options.keyPrefix);
    let record = rateLimitStore.get(key);
    
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(key, record);
    }

    record.timestamps = cleanOldTimestamps(record.timestamps, options.windowMs);

    if (record.timestamps.length >= options.max) {
      res.status(429).json({ error: options.message });
      return;
    }

    record.timestamps.push(Date.now());
    next();
  };
}

// 5 requests per hour for APK uploads
export const uploadRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Too many APK uploads from this client, please try again in an hour.",
  keyPrefix: "upload",
});

// 30 requests per hour for AI copilot
export const copilotRateLimit = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Too many requests to SOC Copilot, please try again in an hour.",
  keyPrefix: "copilot",
});

// 100 requests per minute per IP for general APIs
export const apiRateLimit = createLimiter({
  windowMs: 60 * 1000,
  max: 100,
  message: "Too many requests, please slow down.",
  keyPrefix: "api",
});

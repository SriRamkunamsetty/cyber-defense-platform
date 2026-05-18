import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import { DEV_USER_NAME, DEV_USER_OPEN_ID, isLocalDev } from "./localDev";
import { sdk } from "./sdk";

export function registerDevAuthRoutes(app: Express): void {
  if (!isLocalDev()) return;

  app.get("/api/dev/login", async (req: Request, res: Response) => {
    try {
      await db.upsertUser({
        openId: DEV_USER_OPEN_ID,
        name: DEV_USER_NAME,
        email: "analyst@localhost",
        loginMethod: "local",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(DEV_USER_OPEN_ID, {
        name: DEV_USER_NAME,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      const redirect = typeof req.query.redirect === "string" ? req.query.redirect : "/dashboard";
      res.redirect(302, redirect);
    } catch (error) {
      console.error("[DevAuth] Login failed:", error);
      res.status(500).json({
        error: "Dev login failed",
        hint: "Ensure DATABASE_URL is set and migrations have run (npm run db:push)",
      });
    }
  });

  app.get("/api/dev/status", (_req: Request, res: Response) => {
    res.json({
      localDev: true,
      devLoginUrl: "/api/dev/login?redirect=/dashboard",
    });
  });

  console.log("[DevAuth] Local dev login: GET /api/dev/login");
}

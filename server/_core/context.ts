import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyFirebaseToken, extractBearerToken } from "./firebaseAuth";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  // Try Firebase Auth first (Bearer token in Authorization header)
  const bearerToken = extractBearerToken(opts.req.headers.authorization);
  if (bearerToken) {
    try {
      const decoded = await verifyFirebaseToken(bearerToken);
      if (decoded) {
        // Firebase user — upsert into our DB
        const openId = `firebase:${decoded.uid}`;
        await db.upsertUser({
          openId,
          name: decoded.name || decoded.email || null,
          email: decoded.email ?? null,
          loginMethod: decoded.firebase?.sign_in_provider ?? "firebase",
          lastSignedIn: new Date(),
        });
        const dbUser = await db.getUserByOpenId(openId);
        if (dbUser) {
          user = dbUser;
        }
      }
    } catch (error) {
      console.warn("[Context] Firebase auth failed:", error);
    }
  }

  // Fallback to session cookie auth (Manus OAuth / dev login)
  if (!user) {
    try {
      user = await sdk.authenticateRequest(opts.req);
    } catch (error) {
      // Authentication is optional for public procedures.
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}

import { z } from "zod";
import { execFile } from "child_process";
import { promisify } from "util";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { ENV } from "./env";
import { isLocalDev } from "./localDev";
import { sql } from "drizzle-orm";
import { getDb } from "../db";

const execFileAsync = promisify(execFile);

async function toolOnPath(cmd: string): Promise<boolean> {
  try {
    await execFileAsync(process.platform === "win32" ? "where" : "which", [cmd], {
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

export const systemRouter = router({
  diagnostics: publicProcedure.query(async () => {
    const db = await getDb();
    let dbOk = false;
    if (db) {
      try {
        await db.execute(sql`SELECT 1`);
        dbOk = true;
      } catch {
        dbOk = false;
      }
    }

    return {
      ok: dbOk,
      localDev: isLocalDev(),
      database: dbOk ? "connected" : "unavailable",
      llm: ENV.forgeApiKey ? "forge" : isLocalDev() ? "mock" : "missing",
      storage: isLocalDev() ? "local-filesystem" : "forge-s3",
      tools: {
        apktool: await toolOnPath("apktool"),
        jadx: await toolOnPath("jadx"),
      },
      devLoginPath: isLocalDev() ? "/api/dev/login" : null,
    };
  }),

  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});

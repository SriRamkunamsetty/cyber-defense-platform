#!/usr/bin/env node
/**
 * Validates environment before running TRINETRA AI locally.
 * Usage: node scripts/validate-env.mjs [--quiet]
 */
import fs from "fs";
import path from "path";

const quiet = process.argv.includes("--quiet");
const root = path.resolve(import.meta.dirname, "..");
const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

function log(msg) {
  if (!quiet) console.log(msg);
}

function warn(msg) {
  console.warn(msg);
}

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(examplePath)) {
    warn(
      "[setup] No .env file found. Copy .env.example to .env:\n" +
        "  copy .env.example .env   (Windows)\n" +
        "  cp .env.example .env     (macOS/Linux)"
    );
  } else {
    warn("[setup] Missing .env and .env.example");
  }
  if (!quiet) process.exit(1);
} else {
  log("[setup] .env found");
}

// Load .env for validation (simple parse)
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  const vars = Object.fromEntries(
    content
      .split("\n")
      .filter((l) => l.trim() && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      })
  );

  const localDev = vars.LOCAL_DEV === "true" || vars.LOCAL_DEV === "1";
  const required = localDev
    ? ["DATABASE_URL", "JWT_SECRET"]
    : [
        "DATABASE_URL",
        "JWT_SECRET",
        "OAUTH_SERVER_URL",
        "VITE_APP_ID",
        "BUILT_IN_FORGE_API_URL",
        "BUILT_IN_FORGE_API_KEY",
      ];

  let ok = true;
  for (const key of required) {
    if (!vars[key]) {
      warn(`[setup] Missing required env: ${key}`);
      ok = false;
    }
  }

  if (localDev) {
    log("[setup] LOCAL_DEV=true — filesystem storage + /api/dev/login enabled");
    if (!vars.BUILT_IN_FORGE_API_KEY) {
      log("[setup] No BUILT_IN_FORGE_API_KEY — grounded LLM mock will be used");
    }
  }

  if (!ok && !quiet) process.exit(1);
}

if (!quiet) {
  console.log("[setup] Next steps:");
  console.log("  1. npm install");
  console.log("  2. npm run db:push");
  console.log("  3. npm run tools:check   (optional: apktool, jadx)");
  console.log("  4. npm run dev");
  console.log("  5. Open http://localhost:3000/api/dev/login");
}

#!/usr/bin/env node
/**
 * Checks optional APK reverse-engineering tools on PATH.
 */
import { execFile } from "child_process";
import { promisify } from "util";

const exec = promisify(execFile);
const isWin = process.platform === "win32";

async function which(cmd) {
  try {
    await exec(isWin ? "where" : "which", [cmd]);
    return true;
  } catch {
    return false;
  }
}

async function version(cmd, args) {
  try {
    const { stdout } = await exec(cmd, args);
    return stdout.split("\n")[0].trim();
  } catch {
    return null;
  }
}

console.log("TRINETRA AI — APK tool check\n");

const tools = [
  { name: "apktool", required: false, note: "Decodes AndroidManifest.xml" },
  { name: "jadx", required: false, note: "Decompiles DEX to Java" },
  { name: "java", required: false, note: "Often required by apktool/jadx" },
];

for (const tool of tools) {
  const found = await which(tool.name);
  if (found) {
    const ver = await version(tool.name, ["--version"]).catch(() => null);
    console.log(`  [OK] ${tool.name}${ver ? ` — ${ver}` : ""}`);
  } else {
    console.log(`  [--] ${tool.name} not on PATH — ${tool.note}`);
    console.log(`       Fallback: ZIP/string analysis still runs`);
  }
}

console.log("\nWithout apktool/jadx, analysis uses adm-zip + pattern scanning.");
console.log("Install for full reverse-engineering depth.\n");

import { createHash } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import type {
  ApkEvidence,
  ApkFileNode,
  ExtractedIOC,
  PermissionEvidence,
  SuspiciousMethod,
} from "../../shared/evidence";
import {
  analyzePermissions,
  DANGEROUS_API_PATTERNS,
  PERMISSION_RISK_MAP,
} from "./permissionEngine";
import { extractIOCsFromContent } from "./iocExtractor";

const execFileAsync = promisify(execFile);

const SUSPICIOUS_API_PATTERNS = DANGEROUS_API_PATTERNS;

export type ProgressCallback = (message: string, progress?: number) => void;

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const checker = process.platform === "win32" ? "where" : "which";
    await execFileAsync(checker, [cmd], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function runTool(
  cmd: string,
  args: string[],
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(cmd, args, {
    cwd,
    timeout: 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });
}

function buildFileTree(entries: string[]): ApkFileNode[] {
  const root: ApkFileNode[] = [];
  const folderMap = new Map<string, ApkFileNode>();

  const sorted = [...entries].sort();
  for (const entry of sorted) {
    const parts = entry.split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let currentPath = "";
    let siblings = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && !entry.endsWith("/");
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isFile) {
        const flagged = /\.(dex|so|jar)$|AndroidManifest|smali|classes/i.test(
          entry
        );
        siblings.push({
          name: part,
          path: entry,
          type: "file",
          flagged,
        });
      } else {
        let folder = folderMap.get(currentPath);
        if (!folder) {
          folder = {
            name: part,
            path: currentPath,
            type: "folder",
            children: [],
          };
          folderMap.set(currentPath, folder);
          siblings.push(folder);
        }
        siblings = folder!.children!;
      }
    }
  }

  return root;
}

function parseManifestXml(manifestXml: string): {
  packageName: string;
  permissions: string[];
  activities: string[];
  services: string[];
  receivers: string[];
  providers: string[];
  versionName?: string;
  versionCode?: string;
  minSdk?: string;
  targetSdk?: string;
} {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(manifestXml);
  const manifest = parsed.manifest || parsed["android:manifest"] || {};
  const packageName =
    manifest["@_package"] || manifest["@_android:package"] || "unknown";

  const collectNames = (tag: string): string[] => {
    const node = manifest[tag] || manifest[`android:${tag}`];
    if (!node) return [];
    const items = Array.isArray(node) ? node : [node];
    return items
      .map((item: Record<string, string>) => item["@_android:name"] || item["@_name"])
      .filter(Boolean);
  };

  const usesPerm = manifest["uses-permission"] || manifest["uses-permission"] || [];
  const permNodes = Array.isArray(usesPerm) ? usesPerm : usesPerm ? [usesPerm] : [];
  const permissions = permNodes
    .map(
      (p: Record<string, string>) =>
        p["@_android:name"] || p["@_name"] || ""
    )
    .filter((p: string) => p.includes("permission"));

  return {
    packageName,
    permissions,
    activities: collectNames("activity"),
    services: collectNames("service"),
    receivers: collectNames("receiver"),
    providers: collectNames("provider"),
    versionName: manifest["@_android:versionName"] || manifest["@_versionName"],
    versionCode: manifest["@_android:versionCode"] || manifest["@_versionCode"],
    minSdk:
      manifest["uses-sdk"]?.["@_android:minSdkVersion"] ||
      manifest["uses-sdk"]?.["@_minSdkVersion"],
    targetSdk:
      manifest["uses-sdk"]?.["@_android:targetSdkVersion"] ||
      manifest["uses-sdk"]?.["@_targetSdkVersion"],
  };
}

async function scanDirectoryForThreats(
  dir: string,
  onProgress?: ProgressCallback
): Promise<SuspiciousMethod[]> {
  const findings: SuspiciousMethod[] = [];

  async function walk(current: string) {
    const entries = await fs.readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!/\.(java|smali|xml|json|txt)$/i.test(entry.name)) continue;

      try {
        const content = await fs.readFile(full, "utf-8");
        for (const pattern of SUSPICIOUS_API_PATTERNS) {
          if (pattern.regex.test(content)) {
            const match = content.match(pattern.regex);
            const lines = content.split("\n");
            const lineIdx = lines.findIndex((l) => pattern.regex.test(l));
            const snippet =
              lineIdx >= 0
                ? lines.slice(Math.max(0, lineIdx - 1), lineIdx + 3).join("\n")
                : match?.[0] || pattern.label;

            findings.push({
              className: path.basename(full, path.extname(full)),
              methodName: match?.[0]?.slice(0, 80) || pattern.label,
              filePath: full.replace(dir, "").replace(/\\/g, "/"),
              snippet: snippet.slice(0, 500),
              threatCategory: pattern.category,
              severity: pattern.severity,
            });
          }
        }
      } catch {
        // skip binary/unreadable
      }
    }
  }

  onProgress?.("Scanning decompiled code for suspicious APIs", 55);
  await walk(dir);
  return findings.slice(0, 50);
}

function extractPermissionsFromZipStrings(zip: AdmZip): string[] {
  const found = new Set<string>();
  const permRegex = /android\.permission\.[A-Z0-9_]+/g;
  for (const entry of zip.getEntries()) {
    try {
      const data = entry.getData().toString("utf8", 0, Math.min(entry.header.size, 500_000));
      const matches = data.match(permRegex);
      matches?.forEach((m) => found.add(m));
    } catch {
      // binary entry
    }
  }
  return Array.from(found);
}

/**
 * Deep APK forensic analysis: unpack, decode manifest, decompile, extract IOCs.
 */
export async function analyzeApkBuffer(
  apkBuffer: Buffer,
  fileName: string,
  onProgress?: ProgressCallback
): Promise<ApkEvidence> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "trinetra-apk-"));
  const apkPath = path.join(workDir, fileName);
  const decodeDir = path.join(workDir, "decoded");
  const jadxDir = path.join(workDir, "jadx-out");

  const toolsUsed: string[] = ["adm-zip"];
  const analysisNotes: string[] = [];

  try {
    await fs.writeFile(apkPath, apkBuffer);
    const sha256 = createHash("sha256").update(apkBuffer).digest("hex");
    onProgress?.("APK upload validated", 5);

    const zip = new AdmZip(apkBuffer);
    const zipEntries = zip.getEntries().map((e) => e.entryName);
    const fileTree = buildFileTree(zipEntries);
    onProgress?.("Unpacking APK structure", 10);

    let packageName = "unknown";
    let permissions: string[] = [];
    let activities: string[] = [];
    let services: string[] = [];
    let receivers: string[] = [];
    let providers: string[] = [];
    let manifestXml: string | undefined;
    let versionName: string | undefined;
    let versionCode: string | undefined;
    let minSdk: string | undefined;
    let targetSdk: string | undefined;

    const hasApktool = await commandExists("apktool");
    if (hasApktool) {
      try {
        onProgress?.("Running APKTool decode", 15);
        await runTool("apktool", ["d", apkPath, "-o", decodeDir, "-f"]);
        toolsUsed.push("apktool");
        const manifestPath = path.join(decodeDir, "AndroidManifest.xml");
        manifestXml = await fs.readFile(manifestPath, "utf-8");
        const parsed = parseManifestXml(manifestXml);
        packageName = parsed.packageName;
        permissions = parsed.permissions;
        activities = parsed.activities;
        services = parsed.services;
        receivers = parsed.receivers;
        providers = parsed.providers;
        versionName = parsed.versionName;
        versionCode = parsed.versionCode;
        minSdk = parsed.minSdk;
        targetSdk = parsed.targetSdk;
        onProgress?.("AndroidManifest.xml extracted", 25);
        analysisNotes.push("Manifest decoded via APKTool");
      } catch (e) {
        analysisNotes.push(
          `APKTool failed: ${e instanceof Error ? e.message : "unknown"}`
        );
      }
    } else {
      analysisNotes.push("APKTool not found — using ZIP string extraction for permissions");
      permissions = extractPermissionsFromZipStrings(zip);
      const pkgMatch = zipEntries.find((e) => e.includes("META-INF"));
      if (permissions.length > 0) {
        onProgress?.("Permissions extracted from APK resources", 22);
      }
    }

    if (!manifestXml) {
      permissions = permissions.length
        ? permissions
        : extractPermissionsFromZipStrings(zip);
    }

    let suspiciousMethods: SuspiciousMethod[] = [];
    const hasJadx = await commandExists("jadx");
    if (hasJadx) {
      try {
        onProgress?.("Decompiling with JADX", 35);
        await runTool("jadx", ["-d", jadxDir, apkPath]);
        toolsUsed.push("jadx");
        suspiciousMethods = await scanDirectoryForThreats(jadxDir, onProgress);
        onProgress?.("Suspicious methods identified in decompiled code", 50);
        analysisNotes.push(`JADX decompilation complete — ${suspiciousMethods.length} suspicious patterns`);
      } catch (e) {
        analysisNotes.push(
          `JADX failed: ${e instanceof Error ? e.message : "unknown"}`
        );
      }
    } else {
      analysisNotes.push("JADX not found — scanning APK archive strings for API patterns");
      onProgress?.("Scanning APK internal files for threat signatures", 40);
      const combined: string[] = [];
      for (const entry of zip.getEntries().slice(0, 200)) {
        if (entry.header.size > 2_000_000) continue;
        try {
          combined.push(entry.getData().toString("utf8", 0, Math.min(entry.header.size, 100_000)));
        } catch {
          /* binary */
        }
      }
      const content = combined.join("\n");
      for (const pattern of SUSPICIOUS_API_PATTERNS) {
        if (pattern.regex.test(content)) {
          suspiciousMethods.push({
            className: "APK Archive",
            methodName: pattern.label,
            filePath: fileName,
            snippet: pattern.label,
            threatCategory: pattern.category,
            severity: pattern.severity,
          });
        }
      }
    }

    onProgress?.("Analyzing permission combinations", 60);
    const permissionEvidence: PermissionEvidence[] = analyzePermissions(permissions);

    onProgress?.("Extracting indicators of compromise", 70);
    const manifestContent = manifestXml || permissions.join("\n");
    const codeContent = suspiciousMethods.map((m) => m.snippet).join("\n");
    const iocs: ExtractedIOC[] = [
      ...extractIOCsFromContent(manifestContent, "AndroidManifest"),
      ...extractIOCsFromContent(codeContent, "decompiled_code"),
      ...permissions.map((p) => ({
        type: "permission" as const,
        value: p.replace("android.permission.", ""),
        severity: (PERMISSION_RISK_MAP[p]?.severity || "medium") as ExtractedIOC["severity"],
        description: PERMISSION_RISK_MAP[p]?.abuseDescription || `Permission: ${p}`,
        source: "manifest",
      })),
    ];

    // Deduplicate IOCs
    const seen = new Set<string>();
    const uniqueIocs = iocs.filter((ioc) => {
      const key = `${ioc.type}:${ioc.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    onProgress?.("Permission intelligence analysis complete", 75);

    return {
      packageName,
      versionName,
      versionCode,
      minSdk,
      targetSdk,
      sha256,
      fileSize: apkBuffer.length,
      permissions: permissionEvidence,
      activities,
      services,
      receivers,
      providers,
      suspiciousMethods,
      iocs: uniqueIocs,
      fileTree,
      manifestXml,
      analysisNotes,
      toolsUsed,
    };
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function evidenceToContext(evidence: ApkEvidence): string {
  return JSON.stringify(
    {
      package: evidence.packageName,
      sha256: evidence.sha256,
      fileSize: evidence.fileSize,
      tools: evidence.toolsUsed,
      permissions: evidence.permissions,
      components: {
        activities: evidence.activities.slice(0, 20),
        services: evidence.services.slice(0, 20),
        receivers: evidence.receivers.slice(0, 10),
      },
      suspiciousMethods: evidence.suspiciousMethods.slice(0, 25),
      iocs: evidence.iocs.slice(0, 40),
      analysisNotes: evidence.analysisNotes,
    },
    null,
    2
  );
}

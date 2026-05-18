import type { ExtractedIOC } from "../../shared/evidence";

export function extractIOCsFromContent(
  content: string,
  source: string
): ExtractedIOC[] {
  const iocs: ExtractedIOC[] = [];

  const ipRegex =
    /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
  let match: RegExpExecArray | null;
  while ((match = ipRegex.exec(content)) !== null) {
    if (match[0].startsWith("0.") || match[0].startsWith("127.")) continue;
    iocs.push({
      type: "network_endpoint",
      value: match[0],
      severity: "high",
      description: `IP address found in ${source}`,
      source,
    });
  }

  const urlRegex =
    /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;
  while ((match = urlRegex.exec(content)) !== null) {
    iocs.push({
      type: "network_endpoint",
      value: match[0],
      severity: "high",
      description: `URL endpoint in ${source}`,
      source,
    });
  }

  const domainRegex =
    /\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\.(?:com|net|org|io|xyz|ru|cn|tk)\b/gi;
  while ((match = domainRegex.exec(content)) !== null) {
    if (match[0].includes("android.") || match[0].includes("google.")) continue;
    iocs.push({
      type: "network_endpoint",
      value: match[0],
      severity: "medium",
      description: `Domain in ${source}`,
      source,
    });
  }

  const apiKeyRegex = /(?:api[_-]?key|apikey)\s*[=:]\s*["']([a-zA-Z0-9_\-]{16,})["']/gi;
  while ((match = apiKeyRegex.exec(content)) !== null) {
    iocs.push({
      type: "hardcoded_string",
      value: match[1].slice(0, 32) + "...",
      severity: "high",
      description: `Hardcoded API key in ${source}`,
      source,
    });
  }

  const telegramRegex = /bot[0-9]+:[A-Za-z0-9_-]{20,}/g;
  while ((match = telegramRegex.exec(content)) !== null) {
    iocs.push({
      type: "hardcoded_string",
      value: match[0].slice(0, 20) + "...",
      severity: "critical",
      description: "Telegram bot token — potential C2 channel",
      source,
    });
  }

  const obfuscationRegex = /(?:base64|AES|encrypt|decrypt|xor)\s*\(/gi;
  if (obfuscationRegex.test(content)) {
    iocs.push({
      type: "obfuscation_pattern",
      value: "encryption_routines",
      severity: "medium",
      description: `Obfuscation/encryption patterns in ${source}`,
      source,
    });
  }

  return iocs;
}

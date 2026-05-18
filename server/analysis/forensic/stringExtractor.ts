import type { EmbeddedString } from "../../../shared/forensics";

const SUSPICIOUS_STRING_PATTERNS: Array<{
  regex: RegExp;
  category: string;
}> = [
  { regex: /bot[0-9]+:[A-Za-z0-9_-]{20,}/g, category: "telegram_c2" },
  { regex: /firebaseio\.com/gi, category: "firebase" },
  { regex: /google-services\.json/gi, category: "firebase_config" },
  { regex: /(?:api[_-]?key|secret|password|token)\s*[=:]/gi, category: "credential" },
  { regex: /(?:encrypt|decrypt|AES|RSA|xor|base64)/gi, category: "crypto" },
  { regex: /(?:bank|upi|otp|pin|wallet|paytm|phonepe|gpay)/gi, category: "banking" },
  { regex: /(?:accessibility|overlay|SYSTEM_ALERT)/gi, category: "trojan_ui" },
];

export function extractEmbeddedStrings(
  content: string,
  source: string,
  maxStrings = 80
): EmbeddedString[] {
  const results: EmbeddedString[] = [];
  const seen = new Set<string>();

  const printable = content.match(/[\x20-\x7E]{8,200}/g) || [];
  for (const raw of printable) {
    const value = raw.trim();
    if (value.length < 8 || seen.has(value)) continue;
    seen.add(value);

    let flagged = false;
    let category: string | undefined;
    for (const p of SUSPICIOUS_STRING_PATTERNS) {
      if (p.regex.test(value)) {
        flagged = true;
        category = p.category;
        break;
      }
    }

    if (flagged || value.includes("http") || value.includes("permission")) {
      results.push({ value: value.slice(0, 200), source, flagged, category });
    }
    if (results.length >= maxStrings) break;
  }

  return results;
}

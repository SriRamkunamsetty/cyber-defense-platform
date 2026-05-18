import type { PermissionEvidence } from "../../shared/evidence";

export const PERMISSION_RISK_MAP: Record<
  string,
  { severity: PermissionEvidence["riskLevel"]; abuseDescription: string; bankingRelevance?: string }
> = {
  "android.permission.READ_SMS": {
    severity: "critical",
    abuseDescription:
      "Allows reading SMS messages including OTP codes used for banking MFA",
    bankingRelevance: "Direct MFA bypass and OTP interception risk",
  },
  "android.permission.RECEIVE_SMS": {
    severity: "critical",
    abuseDescription:
      "Allows intercepting incoming SMS before user notification — OTP theft",
    bankingRelevance: "Banking trojan SMS stealer capability",
  },
  "android.permission.SEND_SMS": {
    severity: "high",
    abuseDescription: "Can send SMS to premium numbers or spread malware",
    bankingRelevance: "Fraudulent transaction confirmation abuse",
  },
  "android.permission.BIND_ACCESSIBILITY_SERVICE": {
    severity: "critical",
    abuseDescription:
      "Accessibility abuse enables UI automation, credential harvesting, overlay attacks",
    bankingRelevance: "Primary technique in Android banking trojans",
  },
  "android.permission.SYSTEM_ALERT_WINDOW": {
    severity: "high",
    abuseDescription: "Enables overlay phishing attacks over banking apps",
    bankingRelevance: "Fake login screen injection",
  },
  "android.permission.READ_CONTACTS": {
    severity: "medium",
    abuseDescription: "Contact exfiltration and social engineering",
  },
  "android.permission.REQUEST_INSTALL_PACKAGES": {
    severity: "high",
    abuseDescription: "Silent secondary payload installation",
  },
  "android.permission.INTERNET": {
    severity: "low",
    abuseDescription: "Network communication — required for C2 and exfiltration",
  },
  "android.permission.READ_PHONE_STATE": {
    severity: "medium",
    abuseDescription: "Device fingerprinting and IMSI collection",
  },
  "android.permission.CAMERA": {
    severity: "medium",
    abuseDescription: "Surveillance and document capture",
  },
  "android.permission.RECORD_AUDIO": {
    severity: "medium",
    abuseDescription: "Ambient audio surveillance",
  },
};

export const DANGEROUS_API_PATTERNS: Array<{
  label: string;
  regex: RegExp;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
}> = [
  {
    label: "SmsManager.sendTextMessage",
    regex: /SmsManager[\s\S]{0,40}sendTextMessage/gi,
    category: "sms_abuse",
    severity: "critical",
  },
  {
    label: "AccessibilityService",
    regex: /AccessibilityService|onAccessibilityEvent/gi,
    category: "accessibility_abuse",
    severity: "critical",
  },
  {
    label: "Runtime.exec",
    regex: /Runtime\.getRuntime\(\)\.exec/gi,
    category: "code_execution",
    severity: "high",
  },
  {
    label: "DexClassLoader",
    regex: /DexClassLoader/gi,
    category: "dynamic_loading",
    severity: "high",
  },
  {
    label: "Cipher encryption",
    regex: /javax\.crypto\.Cipher|AES\/GCM/gi,
    category: "encryption",
    severity: "medium",
  },
  {
    label: "HttpURLConnection C2",
    regex: /HttpURLConnection|okhttp3|retrofit2/gi,
    category: "network_c2",
    severity: "medium",
  },
  {
    label: "WebView JavaScript bridge",
    regex: /addJavascriptInterface|@JavascriptInterface/gi,
    category: "webview_abuse",
    severity: "high",
  },
  {
    label: "Telegram bot API",
    regex: /api\.telegram\.org|bot\d+:/gi,
    category: "c2_infrastructure",
    severity: "high",
  },
  {
    label: "Firebase config",
    regex: /firebaseio\.com|google-services\.json/gi,
    category: "infrastructure",
    severity: "medium",
  },
];

export function analyzePermissions(permissions: string[]): PermissionEvidence[] {
  return permissions.map((name) => {
    const normalized = name.startsWith("android.permission.")
      ? name
      : `android.permission.${name}`;
    const meta = PERMISSION_RISK_MAP[normalized];
    return {
      name: normalized,
      riskLevel: meta?.severity || "low",
      abuseDescription:
        meta?.abuseDescription ||
        `Application requests ${normalized} which may expand attack surface`,
      bankingRelevance: meta?.bankingRelevance,
    };
  });
}

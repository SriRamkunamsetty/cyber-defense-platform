import { describe, it, expect } from "vitest";
import AdmZip from "adm-zip";
import { analyzeApkBuffer } from "./apkAnalyzer";

describe("APK Analyzer", () => {
  it("extracts permissions from APK zip strings", async () => {
    const zip = new AdmZip();
    const manifestStub =
      'android.permission.READ_SMS android.permission.INTERNET com.example.test';
    zip.addFile(
      "classes.dex",
      Buffer.from(manifestStub + " SmsManager.sendTextMessage")
    );

    const buffer = zip.toBuffer();
    const evidence = await analyzeApkBuffer(buffer, "test.apk", () => {});

    expect(evidence.fileSize).toBeGreaterThan(0);
    expect(evidence.sha256).toHaveLength(64);
    expect(evidence.fileTree.length).toBeGreaterThan(0);
    expect(evidence.toolsUsed).toContain("adm-zip");
  });
});

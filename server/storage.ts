// Storage: GCS (GCP) | Forge S3 presign (Manus) | local filesystem (LOCAL_DEV)

import fs from "fs/promises";
import path from "path";
import { ENV } from "./_core/env";
import { isLocalDev, LOCAL_STORAGE_DIR } from "./_core/localDev";
import { useGcsStorage } from "./_core/gcpConfig";
import { gcsGetBuffer, gcsPut } from "./storage/gcsStorage";

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;

  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set GCS_BUCKET (GCP), or BUILT_IN_FORGE_API_* (Manus), or LOCAL_DEV=true"
    );
  }

  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

async function localStoragePut(
  relKey: string,
  data: Buffer,
  _contentType: string
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const filePath = path.join(LOCAL_STORAGE_DIR, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
  return { key, url: `/api/local-files/${encodeURIComponent(key)}` };
}

async function forgeStoragePut(
  relKey: string,
  buffer: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const key = appendHashSuffix(normalizeKey(relKey));

  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: new Uint8Array(buffer),
  });

  if (!uploadResp.ok) {
    throw new Error(`Storage upload failed (${uploadResp.status})`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetPresignedUploadUrl(
  relKey: string,
  contentType = "application/vnd.android.package-archive"
): Promise<{ uploadUrl: string; key: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));

  if (isLocalDev()) {
    return {
      uploadUrl: `http://127.0.0.1:${ENV.port}/api/local-upload/${encodeURIComponent(key)}`,
      key,
    };
  }

  if (useGcsStorage()) {
    const bucketName = ENV.gcsBucket;
    if (!bucketName) throw new Error("GCS_BUCKET not configured");
    const { Storage } = await import("@google-cloud/storage");
    const storageInstance = new Storage({ projectId: ENV.gcpProjectId || undefined });
    const [url] = await storageInstance
      .bucket(bucketName)
      .file(key)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
      });
    return { uploadUrl: url, key };
  }

  // Forge fallback
  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);

  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");

  return { uploadUrl: s3Url, key };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/vnd.android.package-archive"
): Promise<{ key: string; url: string }> {
  const buffer = Buffer.isBuffer(data)
    ? data
    : typeof data === "string"
      ? Buffer.from(data)
      : Buffer.from(data);

  if (useGcsStorage()) {
    return gcsPut(relKey, buffer, contentType);
  }

  if (isLocalDev()) {
    return localStoragePut(relKey, buffer, contentType);
  }

  return forgeStoragePut(relKey, buffer, contentType);
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  if (useGcsStorage()) {
    return { key, url: `gs://${ENV.gcsBucket}/${key}` };
  }
  if (isLocalDev()) {
    return { key, url: `/api/local-files/${encodeURIComponent(key)}` };
  }
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);

  if (isLocalDev()) {
    return `http://127.0.0.1:${ENV.port}/api/local-files/${encodeURIComponent(key)}`;
  }

  if (useGcsStorage()) {
    const { Storage } = await import("@google-cloud/storage");
    const storage = new Storage({ projectId: ENV.gcpProjectId || undefined });
    const [url] = await storage
      .bucket(ENV.gcsBucket)
      .file(key)
      .getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000,
      });
    return url;
  }

  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);

  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });

  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }

  const { url } = (await resp.json()) as { url: string };
  return url;
}

export async function storageGetBuffer(relKey: string): Promise<Buffer> {
  const key = normalizeKey(relKey);

  if (useGcsStorage()) {
    return gcsGetBuffer(key);
  }

  if (isLocalDev()) {
    const filePath = path.join(LOCAL_STORAGE_DIR, key);
    return fs.readFile(filePath);
  }

  const signedUrl = await storageGetSignedUrl(key);
  const response = await fetch(signedUrl);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export function getStorageMode(): "gcs" | "local" | "forge" {
  if (useGcsStorage()) return "gcs";
  if (isLocalDev()) return "local";
  return "forge";
}

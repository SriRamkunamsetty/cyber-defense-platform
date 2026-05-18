import { Storage } from "@google-cloud/storage";
import { ENV } from "../_core/env";

let storage: Storage | null = null;

function getStorage(): Storage {
  if (!storage) {
    storage = new Storage({
      projectId: ENV.gcpProjectId || undefined,
    });
  }
  return storage;
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

export async function gcsPut(
  relKey: string,
  data: Buffer,
  contentType: string
): Promise<{ key: string; url: string }> {
  const bucketName = ENV.gcsBucket;
  if (!bucketName) throw new Error("GCS_BUCKET not configured");

  const key = appendHashSuffix(normalizeKey(relKey));
  const bucket = getStorage().bucket(bucketName);
  const file = bucket.file(key);

  await file.save(data, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: "private, max-age=0",
    },
  });

  return {
    key,
    url: `gs://${bucketName}/${key}`,
  };
}

export async function gcsGetBuffer(relKey: string): Promise<Buffer> {
  const bucketName = ENV.gcsBucket;
  if (!bucketName) throw new Error("GCS_BUCKET not configured");

  const key = normalizeKey(relKey);
  const [contents] = await getStorage().bucket(bucketName).file(key).download();
  return contents;
}

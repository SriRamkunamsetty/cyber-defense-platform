const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;
const ANALYSIS_TIMEOUT_MS = 600_000;

export async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  retries = MAX_RETRIES
): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[${label}] Attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export async function withTimeout<T>(
  fn: () => Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function isValidApkBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // ZIP magic (APK is ZIP): PK\x03\x04
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

export async function runInvestigationWithStability(
  runner: () => Promise<void>
): Promise<void> {
  await withRetry(
    () => withTimeout(runner, ANALYSIS_TIMEOUT_MS, "Investigation pipeline"),
    "Investigation"
  );
}

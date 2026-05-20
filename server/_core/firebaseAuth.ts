// Firebase Admin SDK — Server-side token verification for TRINETRA AI
import { ENV } from "./env";

interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  name?: string;
  picture?: string;
  firebase: {
    sign_in_provider: string;
  };
  exp: number;
  iat: number;
}

// Lightweight Firebase token verification using Google's public keys
// This avoids the heavy firebase-admin SDK dependency in the production bundle

let cachedKeys: Record<string, string> | null = null;
let cacheExpiry = 0;

async function getGooglePublicKeys(): Promise<Record<string, string>> {
  if (cachedKeys && Date.now() < cacheExpiry) return cachedKeys;

  const res = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
  );
  if (!res.ok) throw new Error("Failed to fetch Google public keys");

  // Cache for 1 hour
  cachedKeys = (await res.json()) as Record<string, string>;
  cacheExpiry = Date.now() + 3600_000;
  return cachedKeys;
}

/**
 * Verify a Firebase ID token and return decoded claims.
 * Uses jose library (already in deps) for JWT verification.
 */
export async function verifyFirebaseToken(
  idToken: string
): Promise<DecodedFirebaseToken | null> {
  try {
    const { importX509, jwtVerify } = await import("jose");
    const keys = await getGooglePublicKeys();

    // Decode header to find key ID (kid)
    const headerB64 = idToken.split(".")[0];
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf-8")
    );
    const kid = header.kid as string;

    const cert = keys[kid];
    if (!cert) {
      console.warn("[FirebaseAuth] No matching key for kid:", kid);
      return null;
    }

    const publicKey = await importX509(cert, "RS256");
    const { payload } = await jwtVerify(idToken, publicKey, {
      issuer: `https://securetoken.google.com/${getFirebaseProjectId()}`,
      audience: getFirebaseProjectId(),
    });

    const decoded = payload as unknown as DecodedFirebaseToken;

    // Validate expiry
    if (decoded.exp * 1000 < Date.now()) {
      console.warn("[FirebaseAuth] Token expired");
      return null;
    }

    return decoded;
  } catch (error) {
    console.warn("[FirebaseAuth] Token verification failed:", error);
    return null;
  }
}

export function getFirebaseProjectId(): string {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    ENV.firebaseProjectId ||
    "iithyderabad-apk"
  );
}

/**
 * Extract Firebase token from Authorization header.
 * Supports: "Bearer <token>"
 */
export function extractBearerToken(
  authHeader: string | undefined
): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

import type { CertificateInfo } from "../../../shared/forensics";

/** Extract signing certificate metadata from META-INF in APK zip entries */
export function extractCertificatesFromZip(
  zipEntries: string[],
  readEntry: (name: string) => Buffer | null
): CertificateInfo[] {
  const certs: CertificateInfo[] = [];
  const certFiles = zipEntries.filter(
    (e) =>
      e.startsWith("META-INF/") &&
      /\.(RSA|DSA|EC|SF)$/i.test(e) &&
      !e.endsWith(".SF")
  );

  for (const certPath of certFiles.slice(0, 3)) {
    const data = readEntry(certPath);
    if (!data || data.length < 20) continue;

    const subjectMatch = data.toString("binary").match(/CN=([^,\x00]+)/);
    const issuerMatch = data.toString("binary").match(/O=([^,\x00]+)/);

    certs.push({
      subject: subjectMatch?.[1]?.trim() || certPath,
      issuer: issuerMatch?.[1]?.trim() || "Unknown",
      fingerprint: data.slice(0, 16).toString("hex"),
    });
  }

  return certs;
}

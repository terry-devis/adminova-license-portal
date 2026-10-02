import { KEYUTIL, KJUR, hextob64 } from "jsrsasign";

export function normalizeExpiresAt(dateInput: string | Date | null): string {
  if (!dateInput) return "";
  const d = new Date(dateInput);
  const pad = (n: number) => String(n).padStart(2, "0");
  const YYYY = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const HH = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

export function buildPayload(licenseKey: string, expiresAt: string | null, status: string): string {
  return `${licenseKey}|${normalizeExpiresAt(expiresAt)}|${status}`;
}

export function signLicense(
  licenseKey: string,
  expiresAt: string | null,
  status: string,
  privateKeyPem: string
): string {
  try {
    const payload = buildPayload(licenseKey, expiresAt, status);
    const sig = new KJUR.crypto.Signature({ alg: "SHA256withRSA" });
    const prvKey = KEYUTIL.getKey(privateKeyPem.trim());
    sig.init(prvKey);
    sig.updateString(payload);
    const sigHex = sig.sign();
    return hextob64(sigHex);
  } catch (err: any) {
    throw new Error("RSA Signature Generation Failed: " + (err.message || String(err)));
  }
}

export function validatePrivateKey(pem: string): boolean {
  if (!pem) return false;
  return (
    pem.includes("BEGIN RSA PRIVATE KEY") ||
    pem.includes("BEGIN PRIVATE KEY")
  );
}

// Session in-memory cache for Private Key (never saved to database or network)
export function getSessionPrivateKey(): string {
  return sessionStorage.getItem("adminova_rsa_pk") || "";
}

export function setSessionPrivateKey(key: string): void {
  if (key) {
    sessionStorage.setItem("adminova_rsa_pk", key.trim());
  } else {
    sessionStorage.removeItem("adminova_rsa_pk");
  }
}

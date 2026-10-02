// Security & 2FA Step-up Guard Service

const PIN_STORAGE_KEY = "adminova_security_pin_hash";
const UNLOCKED_SESSION_KEY = "adminova_stepup_unlocked_until";

// Simple SHA-256 for local PIN verification
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hasConfiguredPin(): Promise<boolean> {
  const hash = localStorage.getItem(PIN_STORAGE_KEY);
  return !!hash;
}

export async function setMasterPin(pin: string): Promise<void> {
  if (pin.length < 4) throw new Error("PIN must be at least 4 digits.");
  const hash = await sha256(pin);
  localStorage.setItem(PIN_STORAGE_KEY, hash);
  unlockStepUpSession();
}

export async function verifyMasterPin(pin: string): Promise<boolean> {
  const storedHash = localStorage.getItem(PIN_STORAGE_KEY);
  if (!storedHash) {
    // Default PIN fallback for initial setup if not configured yet: "123456"
    return pin === "123456";
  }
  const hash = await sha256(pin);
  const valid = hash === storedHash;
  if (valid) {
    unlockStepUpSession();
  }
  return valid;
}

export function isStepUpUnlocked(): boolean {
  const expStr = sessionStorage.getItem(UNLOCKED_SESSION_KEY);
  if (!expStr) return false;
  const exp = parseInt(expStr, 10);
  return Date.now() < exp;
}

export function unlockStepUpSession(durationMinutes: number = 15): void {
  const exp = Date.now() + durationMinutes * 60 * 1000;
  sessionStorage.setItem(UNLOCKED_SESSION_KEY, exp.toString());
}

export function lockStepUpSession(): void {
  sessionStorage.removeItem(UNLOCKED_SESSION_KEY);
}

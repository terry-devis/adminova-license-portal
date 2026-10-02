import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import type { SchoolClient, PlanType, LicenseStatus } from "../types";
import { signLicense, getSessionPrivateKey } from "./cryptoService";

const COLLECTION_SCHOOLS = "schools";
const COLLECTION_TOKENS = "install_tokens";
const COLLECTION_LICENSES = "licenses";

export function subscribeToSchools(callback: (schools: SchoolClient[]) => void) {
  const q = query(collection(db, COLLECTION_SCHOOLS), orderBy("created_at", "desc"));
  return onSnapshot(q, (snapshot) => {
    const list: SchoolClient[] = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SchoolClient, "id">)
    }));
    callback(list);
  }, (error) => {
    console.error("Firestore schools subscription error:", error);
  });
}

export interface CreateSchoolParams {
  school_id: string; // Slug, e.g. "APS-ISB"
  school_name: string;
  contact_email?: string;
  contact_phone?: string;
  plan: PlanType;
  days_valid: number;
  enabled_modules: string[];
}

export async function createUnifiedSchool(params: CreateSchoolParams): Promise<SchoolClient> {
  const privateKey = getSessionPrivateKey();
  if (!privateKey) {
    throw new Error("RSA Private Key is not loaded. Please click 'Load private.pem' in the top bar first.");
  }

  const cleanId = params.school_id.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "_");
  const rand4 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand6 = Math.random().toString(36).substring(2, 8).toUpperCase();

  const tokenStr = `SIMS-TOK-${cleanId}-${rand4}`;
  const licenseKey = `LIC-SIMS-${cleanId}-${rand6}`;

  const now = new Date();
  const expires = new Date(now.getTime() + params.days_valid * 24 * 60 * 60 * 1000);
  const expiresIso = expires.toISOString();
  const nowIso = now.toISOString();

  // Sign cryptographic license
  const signature = signLicense(licenseKey, expiresIso, "active", privateKey);

  const newSchool: SchoolClient = {
    id: cleanId,
    school_name: params.school_name.trim(),
    contact_email: params.contact_email?.trim() || "",
    contact_phone: params.contact_phone?.trim() || "",
    plan: params.plan,
    expires_at: expiresIso,
    status: "active",
    enabled_modules: params.enabled_modules,
    config_version: 1,
    token: {
      token_string: tokenStr,
      status: "unused",
      burned_at: null
    },
    license: {
      key: licenseKey,
      rsa_signature: signature,
      last_synced_at: null,
      installed_version: "2.5.2"
    },
    telemetry: {
      bound_machine_uuid: null,
      public_ip: null,
      location: null,
      isp: null,
      hostname: null,
      last_active_at: null
    },
    created_at: nowIso,
    updated_at: nowIso
  };

  // 1. Write Unified School document
  await setDoc(doc(db, COLLECTION_SCHOOLS, cleanId), newSchool);

  // 2. Write backwards-compatible Token for Windows Installer
  await setDoc(doc(db, COLLECTION_TOKENS, tokenStr), {
    token: tokenStr,
    school_name: newSchool.school_name,
    school_id: cleanId,
    license_key: licenseKey,
    plan: newSchool.plan,
    status: "unused",
    bound_machine_uuid: null,
    created_at: nowIso,
    expires_at: expiresIso,
    burned_at: null
  });

  // 3. Write backwards-compatible License for SIMS client sync
  await setDoc(doc(db, COLLECTION_LICENSES, licenseKey), {
    id: licenseKey,
    license_key: licenseKey,
    school_id: cleanId,
    school_name: newSchool.school_name,
    plan: newSchool.plan,
    status: "active",
    expires_at: expiresIso,
    rsa_signature: signature,
    enabled_modules: newSchool.enabled_modules,
    bound_machine_uuid: null,
    created_at: nowIso,
    updated_at: nowIso
  });

  return newSchool;
}

export async function updateRemotePolicy(
  school: SchoolClient,
  updates: {
    status?: LicenseStatus;
    enabled_modules?: string[];
    broadcast_announcement?: string;
  }
): Promise<void> {
  const privateKey = getSessionPrivateKey();
  const newStatus = updates.status || school.status;
  const newModules = updates.enabled_modules || school.enabled_modules;
  const newVersion = (school.config_version || 1) + 1;
  const nowIso = new Date().toISOString();

  // Re-sign license with updated status
  let signature = school.license.rsa_signature;
  if (privateKey && (updates.status || !signature)) {
    signature = signLicense(school.license.key, school.expires_at, newStatus, privateKey);
  }

  const patch: Partial<SchoolClient> = {
    status: newStatus,
    enabled_modules: newModules,
    broadcast_announcement: updates.broadcast_announcement !== undefined ? updates.broadcast_announcement : school.broadcast_announcement,
    config_version: newVersion,
    updated_at: nowIso,
    license: {
      ...school.license,
      rsa_signature: signature
    }
  };

  await updateDoc(doc(db, COLLECTION_SCHOOLS, school.id), patch as any);

  try {
    await updateDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
      status: newStatus,
      enabled_modules: newModules,
      rsa_signature: signature,
      broadcast_announcement: updates.broadcast_announcement || "",
      updated_at: nowIso
    });
  } catch (e) {
    await setDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
      id: school.license.key,
      license_key: school.license.key,
      school_id: school.id,
      school_name: school.school_name,
      plan: school.plan,
      status: newStatus,
      expires_at: school.expires_at,
      rsa_signature: signature,
      enabled_modules: newModules,
      updated_at: nowIso
    }, { merge: true });
  }
}

export async function resetMachineLock(school: SchoolClient): Promise<void> {
  const nowIso = new Date().toISOString();
  await updateDoc(doc(db, COLLECTION_SCHOOLS, school.id), {
    "telemetry.bound_machine_uuid": null,
    "token.status": "unused",
    "token.burned_at": null,
    updated_at: nowIso
  });

  if (school.token?.token_string) {
    await updateDoc(doc(db, COLLECTION_TOKENS, school.token.token_string), {
      status: "unused",
      bound_machine_uuid: null,
      burned_at: null
    });
  }
}

export async function renewLicense(school: SchoolClient, additionalDays: number): Promise<void> {
  const privateKey = getSessionPrivateKey();
  if (!privateKey) {
    throw new Error("RSA Private Key is required to renew licenses. Please load your private key.");
  }

  const currentExp = new Date(school.expires_at).getTime();
  const baseTime = currentExp > Date.now() ? currentExp : Date.now();
  const newExp = new Date(baseTime + additionalDays * 24 * 60 * 60 * 1000);
  const newExpIso = newExp.toISOString();
  const nowIso = new Date().toISOString();

  const signature = signLicense(school.license.key, newExpIso, school.status, privateKey);
  const newVersion = (school.config_version || 1) + 1;

  await updateDoc(doc(db, COLLECTION_SCHOOLS, school.id), {
    expires_at: newExpIso,
    status: "active",
    config_version: newVersion,
    "license.rsa_signature": signature,
    updated_at: nowIso
  });

  await updateDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
    expires_at: newExpIso,
    status: "active",
    rsa_signature: signature,
    updated_at: nowIso
  });
}

export async function deleteSchool(school: SchoolClient): Promise<void> {
  await deleteDoc(doc(db, COLLECTION_SCHOOLS, school.id));
  if (school.token?.token_string) {
    try { await deleteDoc(doc(db, COLLECTION_TOKENS, school.token.token_string)); } catch {}
  }
  if (school.license?.key) {
    try { await deleteDoc(doc(db, COLLECTION_LICENSES, school.license.key)); } catch {}
  }
}

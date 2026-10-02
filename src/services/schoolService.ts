import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { db } from "./firebase";
import type { SchoolClient, PlanType, LicenseStatus } from "../types";
import { signLicense, getSessionPrivateKey } from "./cryptoService";

const COLLECTION_SCHOOLS = "schools";
const COLLECTION_TOKENS = "install_tokens";
const COLLECTION_LICENSES = "licenses";

/**
 * Universal real-time subscription that queries:
 * 1. Unified 'schools' collection (v3)
 * 2. Legacy 'licenses' collection (v2.5)
 * 3. Legacy 'install_tokens' collection (v2.5)
 * 
 * Automatically synthesizes and deduplicates existing records so that
 * pre-existing licenses and tokens in Firebase immediately display in the portal.
 */
export function subscribeToSchools(callback: (schools: SchoolClient[]) => void) {
  let modernSchools: SchoolClient[] = [];
  let legacyLicenses: any[] = [];
  let legacyTokens: any[] = [];

  const emitUnified = () => {
    const map = new Map<string, SchoolClient>();

    // 1. Ingest all modern unified schools
    for (const school of modernSchools) {
      map.set(school.id, { ...school });
    }

    // 2. Ingest legacy licenses (e.g. your existing 2 licenses in Firebase)
    for (const lic of legacyLicenses) {
      const licKey = lic.id || lic.license_key || "";
      const schoolId = lic.school_id || licKey;

      // Check if already represented in modern schools
      const existing = Array.from(map.values()).find(
        (s) => s.license?.key === licKey || s.id === schoolId
      );

      if (existing) {
        // Enrich telemetry if modern is empty but legacy has machine binding
        if (lic.bound_machine_uuid && !existing.telemetry?.bound_machine_uuid) {
          existing.telemetry.bound_machine_uuid = lic.bound_machine_uuid;
        }
      } else {
        // Find matching token if available
        const matchedToken = legacyTokens.find(
          (t) => t.license_key === licKey || t.school_id === schoolId || (lic.school_name && t.school_name === lic.school_name)
        );

        const fallbackDate = new Date().toISOString();
        const synth: SchoolClient = {
          id: schoolId,
          school_name: lic.school_name || lic.school_id || `Legacy School (${licKey.substring(0, 16)}...)`,
          contact_email: lic.contact_email || "",
          contact_phone: lic.contact_phone || "",
          plan: (lic.plan as PlanType) || "standard",
          expires_at: lic.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: (lic.status as LicenseStatus) || "active",
          enabled_modules: lic.enabled_modules || ["fees", "exams", "attendance", "whatsapp", "reports"],
          config_version: lic.config_version || 1,
          broadcast_announcement: lic.broadcast_announcement || "",
          is_legacy: true,
          token: matchedToken
            ? {
                token_string: matchedToken.token || matchedToken.id,
                status: matchedToken.status || "unused",
                burned_at: matchedToken.burned_at || null
              }
            : {
                token_string: "LEGACY-DIRECT-KEY",
                status: "burned",
                burned_at: lic.created_at || null
              },
          license: {
            key: licKey,
            rsa_signature: lic.rsa_signature || "",
            last_synced_at: lic.updated_at || null,
            installed_version: "2.5.2"
          },
          telemetry: {
            bound_machine_uuid: lic.bound_machine_uuid || matchedToken?.bound_machine_uuid || null,
            public_ip: lic.public_ip || null,
            location: lic.location || null,
            isp: lic.isp || null,
            hostname: lic.hostname || null,
            last_active_at: lic.updated_at || null
          },
          created_at: lic.created_at || fallbackDate,
          updated_at: lic.updated_at || fallbackDate
        };

        map.set(synth.id, synth);
      }
    }

    // 3. Ingest standalone unused/fresh tokens (e.g. your existing 1 token in Firebase)
    for (const tok of legacyTokens) {
      const tokStr = tok.token || tok.id || "";
      const isAlreadyCovered = Array.from(map.values()).some(
        (s) => s.token?.token_string === tokStr || (tok.license_key && s.license?.key === tok.license_key)
      );

      if (!isAlreadyCovered) {
        const fallbackDate = new Date().toISOString();
        const tokenEntity: SchoolClient = {
          id: tok.school_id || tokStr,
          school_name: tok.school_name || "Unassigned Installation Token",
          contact_email: "",
          contact_phone: "",
          plan: (tok.plan as PlanType) || "standard",
          expires_at: tok.expires_at || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          enabled_modules: ["fees", "exams", "attendance", "whatsapp", "reports"],
          config_version: 1,
          is_legacy_token: true,
          token: {
            token_string: tokStr,
            status: tok.status || "unused",
            burned_at: tok.burned_at || null
          },
          license: {
            key: tok.license_key || "PENDING-FIRST-INSTALL",
            rsa_signature: "",
            last_synced_at: null,
            installed_version: "Pending Setup"
          },
          telemetry: {
            bound_machine_uuid: tok.bound_machine_uuid || null,
            public_ip: null,
            location: null,
            isp: null,
            hostname: null,
            last_active_at: null
          },
          created_at: tok.created_at || fallbackDate,
          updated_at: tok.created_at || fallbackDate
        };

        map.set(`token_${tokStr}`, tokenEntity);
      }
    }

    // Sort by created_at descending
    const list = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    callback(list);
  };

  // 1. Modern schools listener
  const unsubSchools = onSnapshot(collection(db, COLLECTION_SCHOOLS), (snapshot) => {
    modernSchools = snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<SchoolClient, "id">)
    }));
    emitUnified();
  }, (err) => console.warn("Firestore schools listener:", err));

  // 2. Legacy licenses listener
  const unsubLicenses = onSnapshot(collection(db, COLLECTION_LICENSES), (snapshot) => {
    legacyLicenses = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    emitUnified();
  }, (err) => console.warn("Firestore licenses listener:", err));

  // 3. Legacy install_tokens listener
  const unsubTokens = onSnapshot(collection(db, COLLECTION_TOKENS), (snapshot) => {
    legacyTokens = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));
    emitUnified();
  }, (err) => console.warn("Firestore tokens listener:", err));

  return () => {
    unsubSchools();
    unsubLicenses();
    unsubTokens();
  };
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

/**
 * Migrates a legacy license or token into the unified v3 'schools' collection.
 */
export async function migrateLegacySchool(school: SchoolClient): Promise<void> {
  const nowIso = new Date().toISOString();
  const cleanId = school.id.startsWith("token_") ? school.token.token_string : school.id;

  const upgraded: SchoolClient = {
    ...school,
    id: cleanId,
    config_version: (school.config_version || 1) + 1,
    is_legacy: false,
    is_legacy_token: false,
    updated_at: nowIso
  };

  await setDoc(doc(db, COLLECTION_SCHOOLS, cleanId), upgraded);

  // Ensure licenses collection has corresponding entry
  if (upgraded.license?.key && upgraded.license.key !== "PENDING-FIRST-INSTALL") {
    await setDoc(doc(db, COLLECTION_LICENSES, upgraded.license.key), {
      id: upgraded.license.key,
      license_key: upgraded.license.key,
      school_id: cleanId,
      school_name: upgraded.school_name,
      plan: upgraded.plan,
      status: upgraded.status,
      expires_at: upgraded.expires_at,
      rsa_signature: upgraded.license.rsa_signature,
      enabled_modules: upgraded.enabled_modules,
      bound_machine_uuid: upgraded.telemetry.bound_machine_uuid,
      updated_at: nowIso
    }, { merge: true });
  }
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

  // Update unified schools document
  if (!school.is_legacy && !school.is_legacy_token) {
    await updateDoc(doc(db, COLLECTION_SCHOOLS, school.id), patch as any);
  } else {
    // If it was legacy, upgrade it immediately
    await migrateLegacySchool({
      ...school,
      ...patch
    } as SchoolClient);
  }

  // Update legacy licenses collection
  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    try {
      await updateDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
        status: newStatus,
        enabled_modules: newModules,
        rsa_signature: signature,
        broadcast_announcement: updates.broadcast_announcement || "",
        updated_at: nowIso
      });
    } catch {
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
}

export async function resetMachineLock(school: SchoolClient): Promise<void> {
  const nowIso = new Date().toISOString();
  
  if (!school.is_legacy && !school.is_legacy_token) {
    await updateDoc(doc(db, COLLECTION_SCHOOLS, school.id), {
      "telemetry.bound_machine_uuid": null,
      "token.status": "unused",
      "token.burned_at": null,
      updated_at: nowIso
    });
  }

  if (school.token?.token_string && school.token.token_string !== "LEGACY-DIRECT-KEY") {
    try {
      await updateDoc(doc(db, COLLECTION_TOKENS, school.token.token_string), {
        status: "unused",
        bound_machine_uuid: null,
        burned_at: null
      });
    } catch {}
  }

  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    try {
      await updateDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
        bound_machine_uuid: null,
        updated_at: nowIso
      });
    } catch {}
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

  if (!school.is_legacy && !school.is_legacy_token) {
    await updateDoc(doc(db, COLLECTION_SCHOOLS, school.id), {
      expires_at: newExpIso,
      status: "active",
      config_version: newVersion,
      "license.rsa_signature": signature,
      updated_at: nowIso
    });
  }

  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    await updateDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
      expires_at: newExpIso,
      status: "active",
      rsa_signature: signature,
      updated_at: nowIso
    });
  }
}

export async function deleteSchool(school: SchoolClient): Promise<void> {
  if (!school.is_legacy && !school.is_legacy_token) {
    try { await deleteDoc(doc(db, COLLECTION_SCHOOLS, school.id)); } catch {}
  }
  if (school.token?.token_string && school.token.token_string !== "LEGACY-DIRECT-KEY") {
    try { await deleteDoc(doc(db, COLLECTION_TOKENS, school.token.token_string)); } catch {}
  }
  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    try { await deleteDoc(doc(db, COLLECTION_LICENSES, school.license.key)); } catch {}
  }
}

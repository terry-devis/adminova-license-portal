import {
  collection,
  doc,
  setDoc,
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
 */
export function subscribeToSchools(callback: (schools: SchoolClient[]) => void, onError?: (err: any) => void) {
  let modernSchools: SchoolClient[] = [];
  let legacyLicenses: any[] = [];
  let legacyTokens: any[] = [];

  const emitUnified = () => {
    const map = new Map<string, SchoolClient>();

    // 1. Ingest all modern unified schools
    for (const school of modernSchools) {
      const s = { ...school };
      if (s.telemetry?.bound_machine_uuid && s.token?.status !== "burned") {
        s.token = {
          ...s.token,
          status: "burned"
        };
      }
      map.set(s.id, s);
    }

    // 2. Ingest legacy licenses
    for (const lic of legacyLicenses) {
      const licKey = lic.id || lic.license_key || "";
      const schoolId = lic.school_id || licKey;

      const existing = Array.from(map.values()).find(
        (s) => s.license?.key === licKey || s.id === schoolId
      );

      if (existing) {
        if (!existing.telemetry) {
          existing.telemetry = { bound_machine_uuid: null, public_ip: null, location: null, isp: null, hostname: null, last_active_at: null };
        }
        if (lic.bound_machine_uuid !== undefined) existing.telemetry.bound_machine_uuid = lic.bound_machine_uuid;
        if (lic.hostname !== undefined) existing.telemetry.hostname = lic.hostname;
        if (lic.public_ip) existing.telemetry.public_ip = lic.public_ip;
        if (lic.location) existing.telemetry.location = lic.location;
        if (lic.isp) existing.telemetry.isp = lic.isp;
        if (lic.last_active_at) existing.telemetry.last_active_at = lic.last_active_at;

        if (existing.telemetry?.bound_machine_uuid && existing.token?.status !== "burned") {
          existing.token = {
            ...existing.token,
            status: "burned"
          };
        }
      } else {
        const matchedToken = legacyTokens.find(
          (t) => t.license_key === licKey || t.school_id === schoolId || (lic.school_name && t.school_name === lic.school_name)
        );

        const isLicBurned = Boolean(lic.bound_machine_uuid) || matchedToken?.status === "burned" || matchedToken?.status === "used" || Boolean(matchedToken?.bound_machine_uuid);

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
                status: isLicBurned ? "burned" : (matchedToken.status || "unused"),
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
            bound_machine_uuid: lic.bound_machine_uuid !== undefined ? lic.bound_machine_uuid : (matchedToken?.bound_machine_uuid || null),
            public_ip: lic.public_ip || matchedToken?.public_ip || null,
            location: lic.location || matchedToken?.location || null,
            isp: lic.isp || matchedToken?.isp || null,
            hostname: lic.hostname || matchedToken?.hostname || null,
            last_active_at: lic.last_active_at || matchedToken?.last_active_at || null
          },
          created_at: lic.created_at || new Date().toISOString(),
          updated_at: lic.updated_at || new Date().toISOString()
        };
        map.set(synth.id, synth);
      }
    }

    // 3. Ingest and merge tokens from install_tokens
    for (const tok of legacyTokens) {
      const tokId = tok.id || tok.token || "";
      const existing = Array.from(map.values()).find(
        (s) => s.token?.token_string === tokId || (tok.license_key && s.license?.key === tok.license_key) || (tok.school_id && s.id === tok.school_id)
      );

      if (existing) {
        // Real-time synchronization of token status from install_tokens collection into the school object
        const isBurned = tok.status === "burned" || tok.status === "used" || Boolean(tok.bound_machine_uuid) || Boolean(existing.telemetry?.bound_machine_uuid);
        existing.token = {
          token_string: existing.token?.token_string || tokId,
          status: isBurned ? "burned" : (tok.status || "unused"),
          burned_at: tok.burned_at || existing.token?.burned_at || null
        };
        if (!existing.telemetry) {
          existing.telemetry = { bound_machine_uuid: null, public_ip: null, location: null, isp: null, hostname: null, last_active_at: null };
        }
        if (tok.bound_machine_uuid && !existing.telemetry.bound_machine_uuid) {
          existing.telemetry.bound_machine_uuid = tok.bound_machine_uuid;
        }
        if (tok.hostname && !existing.telemetry.hostname) existing.telemetry.hostname = tok.hostname;
        if (tok.public_ip && !existing.telemetry.public_ip) existing.telemetry.public_ip = tok.public_ip;
        if (tok.location && !existing.telemetry.location) existing.telemetry.location = tok.location;
        if (tok.isp && !existing.telemetry.isp) existing.telemetry.isp = tok.isp;
        if (tok.burned_at && !existing.telemetry.last_active_at) existing.telemetry.last_active_at = tok.burned_at;
      } else {
        const isBurned = tok.status === "burned" || tok.status === "used" || Boolean(tok.bound_machine_uuid);
        const synth: SchoolClient = {
          id: `token_${tokId}`,
          school_name: tok.school_name || `Install Token (${tokId})`,
          contact_email: "",
          contact_phone: "",
          plan: (tok.plan as PlanType) || "standard",
          expires_at: tok.expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          enabled_modules: ["fees", "exams", "attendance", "whatsapp", "reports"],
          config_version: 1,
          is_legacy_token: true,
          token: {
            token_string: tokId,
            status: isBurned ? "burned" : "unused",
            burned_at: tok.burned_at || null
          },
          license: {
            key: tok.license_key || "PENDING-FIRST-INSTALL",
            rsa_signature: "",
            last_synced_at: null,
            installed_version: "2.5.2"
          },
          telemetry: {
            bound_machine_uuid: tok.bound_machine_uuid || null,
            public_ip: tok.public_ip || null,
            location: tok.location || null,
            isp: tok.isp || null,
            hostname: tok.hostname || null,
            last_active_at: tok.last_active_at || tok.burned_at || null
          },
          created_at: tok.created_at || new Date().toISOString(),
          updated_at: tok.created_at || new Date().toISOString()
        };
        map.set(synth.id, synth);
      }
    }

    const unifiedList = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    callback(unifiedList);
  };

  const unsubSchools = onSnapshot(
    collection(db, COLLECTION_SCHOOLS),
    (snapshot) => {
      modernSchools = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as SchoolClient[];
      emitUnified();
    },
    (err) => {
      console.warn("Schools snapshot notice:", err);
      if (onError) onError(err);
    }
  );

  const unsubLicenses = onSnapshot(
    collection(db, COLLECTION_LICENSES),
    (snapshot) => {
      legacyLicenses = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      emitUnified();
    },
    (err) => {
      console.warn("Licenses snapshot notice:", err);
    }
  );

  const unsubTokens = onSnapshot(
    collection(db, COLLECTION_TOKENS),
    (snapshot) => {
      legacyTokens = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      emitUnified();
    },
    (err) => {
      console.warn("Tokens snapshot notice:", err);
    }
  );

  return () => {
    unsubSchools();
    unsubLicenses();
    unsubTokens();
  };
}

export interface CreateSchoolParams {
  school_id: string;
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

  await setDoc(doc(db, COLLECTION_SCHOOLS, cleanId), newSchool);

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

  await setDoc(doc(db, COLLECTION_SCHOOLS, cleanId), upgraded, { merge: true });

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
      bound_machine_uuid: upgraded.telemetry?.bound_machine_uuid || null,
      updated_at: nowIso
    }, { merge: true });
  }
}

export async function updateSchoolAndLicense(
  school: SchoolClient,
  updates: Partial<SchoolClient>
): Promise<void> {
  const privateKey = getSessionPrivateKey();
  const newName = updates.school_name || school.school_name;
  const newStatus = updates.status || school.status;
  const newExpiresAt = updates.expires_at || school.expires_at;
  const newPlan = updates.plan || school.plan;
  const newModules = updates.enabled_modules || school.enabled_modules;
  const newBroadcast = updates.broadcast_announcement !== undefined ? updates.broadcast_announcement : (school.broadcast_announcement || "");
  const newBoundUuid = updates.telemetry?.bound_machine_uuid !== undefined ? updates.telemetry.bound_machine_uuid : (school.telemetry?.bound_machine_uuid || null);
  const newVersion = (school.config_version || 1) + 1;
  const nowIso = new Date().toISOString();

  let signature = school.license?.rsa_signature || "";
  const isCryptoChanged = newStatus !== school.status || newExpiresAt !== school.expires_at;
  if (privateKey && (isCryptoChanged || !signature)) {
    signature = signLicense(school.license.key, newExpiresAt, newStatus, privateKey);
  }

  const cleanSchoolId = school.id.startsWith("token_") ? school.token.token_string : school.id;

  const schoolPatch: any = {
    school_name: newName,
    contact_email: updates.contact_email !== undefined ? updates.contact_email : (school.contact_email || ""),
    contact_phone: updates.contact_phone !== undefined ? updates.contact_phone : (school.contact_phone || ""),
    plan: newPlan,
    status: newStatus,
    expires_at: newExpiresAt,
    enabled_modules: newModules,
    broadcast_announcement: newBroadcast,
    config_version: newVersion,
    updated_at: nowIso,
    license: {
      ...school.license,
      rsa_signature: signature
    },
    telemetry: {
      ...school.telemetry,
      bound_machine_uuid: newBoundUuid
    }
  };

  if (newBoundUuid === null) {
    schoolPatch.telemetry.hostname = null;
    schoolPatch.telemetry.last_active_at = null;
    schoolPatch.token = {
      ...school.token,
      status: "unused",
      burned_at: null
    };
  }

  // 1. Update in schools collection
  await setDoc(doc(db, COLLECTION_SCHOOLS, cleanSchoolId), schoolPatch, { merge: true });

  // 2. Update in licenses collection
  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    const licPatch: any = {
      id: school.license.key,
      license_key: school.license.key,
      school_id: cleanSchoolId,
      school_name: newName,
      plan: newPlan,
      status: newStatus,
      expires_at: newExpiresAt,
      rsa_signature: signature,
      enabled_modules: newModules,
      broadcast_announcement: newBroadcast,
      config_version: newVersion,
      bound_machine_uuid: newBoundUuid,
      updated_at: nowIso
    };
    if (newBoundUuid === null) {
      licPatch.hostname = null;
      licPatch.telemetry = {
        bound_machine_uuid: null,
        hostname: null,
        last_active_at: null
      };
    }
    await setDoc(doc(db, COLLECTION_LICENSES, school.license.key), licPatch, { merge: true });
  }

  // 3. Update in tokens collection
  if (school.token?.token_string && school.token.token_string !== "LEGACY-DIRECT-KEY") {
    const tokPatch: any = {
      school_name: newName,
      plan: newPlan,
      updated_at: nowIso
    };
    if (newBoundUuid === null) {
      tokPatch.status = "unused";
      tokPatch.bound_machine_uuid = null;
      tokPatch.burned_at = null;
      tokPatch.hostname = null;
    }
    await setDoc(doc(db, COLLECTION_TOKENS, school.token.token_string), tokPatch, { merge: true });
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
  await updateSchoolAndLicense(school, updates);
}

export async function resetMachineLock(school: SchoolClient): Promise<void> {
  const nowIso = new Date().toISOString();
  const cleanSchoolId = school.id.startsWith("token_") ? school.token.token_string : school.id;

  // 1. Reset in schools collection
  try {
    await setDoc(doc(db, COLLECTION_SCHOOLS, cleanSchoolId), {
      telemetry: {
        bound_machine_uuid: null,
        hostname: null,
        public_ip: null,
        location: null,
        isp: null,
        last_active_at: null
      },
      token: {
        ...school.token,
        status: "unused",
        burned_at: null
      },
      updated_at: nowIso
    }, { merge: true });
  } catch (err) {
    console.warn("Notice updating school lock:", err);
  }

  // 2. Reset in tokens collection
  if (school.token?.token_string && school.token.token_string !== "LEGACY-DIRECT-KEY") {
    try {
      await setDoc(doc(db, COLLECTION_TOKENS, school.token.token_string), {
        status: "unused",
        bound_machine_uuid: null,
        burned_at: null,
        hostname: null,
        public_ip: null,
        location: null,
        isp: null,
        updated_at: nowIso
      }, { merge: true });
    } catch (err) {
      console.warn("Notice updating token lock:", err);
    }
  }

  // 3. Reset in licenses collection
  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    try {
      await setDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
        bound_machine_uuid: null,
        hostname: null,
        telemetry: {
          bound_machine_uuid: null,
          hostname: null,
          public_ip: null,
          location: null,
          isp: null,
          last_active_at: null
        },
        updated_at: nowIso
      }, { merge: true });
    } catch (err) {
      console.warn("Notice updating license lock:", err);
    }
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
  const cleanSchoolId = school.id.startsWith("token_") ? school.token.token_string : school.id;

  await setDoc(doc(db, COLLECTION_SCHOOLS, cleanSchoolId), {
    expires_at: newExpIso,
    status: "active",
    config_version: newVersion,
    "license.rsa_signature": signature,
    updated_at: nowIso
  }, { merge: true });

  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    await setDoc(doc(db, COLLECTION_LICENSES, school.license.key), {
      expires_at: newExpIso,
      status: "active",
      rsa_signature: signature,
      config_version: newVersion,
      updated_at: nowIso
    }, { merge: true });
  }
}

export async function deleteSchool(school: SchoolClient): Promise<void> {
  const cleanSchoolId = school.id.startsWith("token_") ? school.token.token_string : school.id;
  try { await deleteDoc(doc(db, COLLECTION_SCHOOLS, cleanSchoolId)); } catch {}
  if (school.token?.token_string && school.token.token_string !== "LEGACY-DIRECT-KEY") {
    try { await deleteDoc(doc(db, COLLECTION_TOKENS, school.token.token_string)); } catch {}
  }
  if (school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL") {
    try { await deleteDoc(doc(db, COLLECTION_LICENSES, school.license.key)); } catch {}
  }
}

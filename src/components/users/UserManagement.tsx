import React, { useState, useEffect } from "react";
import type { User } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, doc, setDoc, onSnapshot, deleteDoc } from "firebase/firestore";
import { firebaseConfig, db } from "../../services/firebase";
import type { SchoolClient } from "../../types";
import {
  Users,
  UserCheck,
  Laptop,
  CheckCircle2,
  Trash2,
  Clock,
  MapPin,
  Eye,
  EyeOff,
  Sparkles,
  Lock,
  Mail,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert
} from "lucide-react";

interface Props {
  currentUser: User | null;
  schools: SchoolClient[];
  onRequire2FA: (actionTitle: string, callback: () => void) => void;
}

interface AdminRecord {
  uid: string;
  email: string;
  role: string;
  created_at: string;
  is_root?: boolean;
}

const FIRESTORE_RULES_SNIPPET = `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Authenticated portal administrators
    function isAuthenticated() {
      return request.auth != null;
    }

    // 1. Unified Schools (Portal v3)
    match /schools/{schoolId} {
      allow read, write: if isAuthenticated();
    }

    // 2. Portal Administrators
    match /portal_admins/{adminId} {
      allow read, write: if isAuthenticated();
    }

    // 3. Software Licenses (Public read for client app verification, write for admin)
    match /licenses/{licenseKey} {
      allow read: if true;
      allow write: if isAuthenticated();
    }

    // 4. One-Time Setup Tokens (Public read & update for installer, write for admin)
    match /install_tokens/{tokenId} {
      allow read, update: if true;
      allow create, delete: if isAuthenticated();
    }

    // Backwards compatibility for legacy tokens
    match /tokens/{tokenId} {
      allow read, update: if true;
      allow create, delete: if isAuthenticated();
    }
  }
}`;

export const UserManagement: React.FC<Props> = ({
  currentUser,
  schools,
  onRequire2FA
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"portal_admins" | "school_operators">("portal_admins");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("operator");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // Permissions state
  const [permissionError, setPermissionError] = useState(false);
  const [copiedRules, setCopiedRules] = useState(false);

  // Firestore admins list
  const [admins, setAdmins] = useState<AdminRecord[]>([]);

  useEffect(() => {
    let isSubscribed = true;
    try {
      const unsub = onSnapshot(
        collection(db, "portal_admins"),
        (snapshot) => {
          if (!isSubscribed) return;
          const list: AdminRecord[] = snapshot.docs.map((d) => ({
            uid: d.id,
            ...(d.data() as Omit<AdminRecord, "uid">)
          }));
          setAdmins(list);
          setPermissionError(false);
        },
        (error) => {
          console.warn("Firestore portal_admins subscription error:", error);
          if (isSubscribed) {
            if (error.code === "permission-denied" || error.message?.includes("Missing or insufficient permissions")) {
              setPermissionError(true);
            }
          }
        }
      );
      return () => {
        isSubscribed = false;
        unsub();
      };
    } catch (err: any) {
      console.warn("portal_admins listener error:", err);
      setPermissionError(true);
    }
  }, []);

  const handleCopyRules = () => {
    navigator.clipboard.writeText(FIRESTORE_RULES_SNIPPET);
    setCopiedRules(true);
    setTimeout(() => setCopiedRules(false), 2500);
  };

  const handleGeneratePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
    let generated = "";
    for (let i = 0; i < 14; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
    setConfirmPassword(generated);
    setShowPassword(true);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMsg("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFormError("Please enter a valid administrator email.");
      return;
    }

    if (password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    onRequire2FA(`Authorize New Administrator: ${cleanEmail}`, async () => {
      setIsSubmitting(true);
      try {
        // Use secondary app to prevent signing out the current logged-in admin
        let secondaryApp = getApps().find((a) => a.name === "SecondaryAdminCreator");
        if (!secondaryApp) {
          secondaryApp = initializeApp(firebaseConfig, "SecondaryAdminCreator");
        }
        const secondaryAuth = getAuth(secondaryApp);
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, cleanEmail, password);
        const newUid = userCredential.user.uid;
        await signOut(secondaryAuth);

        // Store role in Firestore
        try {
          await setDoc(doc(db, "portal_admins", newUid), {
            uid: newUid,
            email: cleanEmail,
            role,
            created_at: new Date().toISOString()
          });
        } catch (dbErr: any) {
          if (dbErr.code === "permission-denied" || dbErr.message?.includes("Missing or insufficient permissions")) {
            setPermissionError(true);
            throw new Error("Admin created in Firebase Auth, but Firestore write failed due to Missing Permissions. Please update your Firestore Security Rules in Firebase Console.");
          }
          throw dbErr;
        }

        setSuccessMsg(`Admin account created successfully for ${cleanEmail}!`);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } catch (err: any) {
        setFormError(err.message || "Failed to create administrator.");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleDeleteAdmin = (adm: AdminRecord) => {
    if (adm.email === currentUser?.email) {
      alert("You cannot delete your own active administrator account.");
      return;
    }

    onRequire2FA(`Remove Administrator Access for ${adm.email}`, async () => {
      if (confirm(`Remove administrator privileges for "${adm.email}"?`)) {
        try {
          await deleteDoc(doc(db, "portal_admins", adm.uid));
        } catch (e: any) {
          if (e.code === "permission-denied" || e.message?.includes("Missing or insufficient permissions")) {
            setPermissionError(true);
            alert("Firestore Permission Denied: Please update your Firestore Security Rules in the Firebase Console.");
          } else {
            alert("Error removing admin: " + e.message);
          }
        }
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Permissions Alert Banner if Firestore rules block portal_admins */}
      {permissionError && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "0.75rem",
            padding: "1rem 1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            boxShadow: "var(--shadow-sm)"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <ShieldAlert size={22} style={{ color: "#d97706", flexShrink: 0, marginTop: "0.15rem" }} />
              <div>
                <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "#92400e", margin: 0 }}>
                  Firestore Permission Required: "Missing or insufficient permissions"
                </h4>
                <p style={{ fontSize: "0.8rem", color: "#b45309", margin: "0.3rem 0 0 0", lineHeight: 1.45 }}>
                  Your Firebase Firestore Security Rules currently restrict access to the <code style={{ background: "#fef3c7", padding: "0.1rem 0.35rem", borderRadius: "0.25rem", fontWeight: 600 }}>portal_admins</code> collection.
                  Update your rules in the Firebase Console to allow authenticated portal administrators.
                </p>
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleCopyRules}
                className="btn btn-sm"
                style={{
                  background: "#d97706",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.75rem",
                  fontWeight: 600
                }}
              >
                {copiedRules ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedRules ? "Rules Copied!" : "Copy Firestore Rules"}</span>
              </button>

              <a
                href="https://console.firebase.google.com/project/sims-licensing/firestore/rules"
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm btn-outline"
                style={{
                  color: "#92400e",
                  borderColor: "#fde68a",
                  background: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.75rem"
                }}
              >
                <ExternalLink size={14} />
                <span>Open Firebase Console Rules</span>
              </a>
            </div>
          </div>

          <div style={{ background: "#ffffff", padding: "0.6rem 0.85rem", borderRadius: "0.5rem", border: "1px solid #fef3c7", fontSize: "0.75rem", color: "#78350f" }}>
            <strong>Quick Fix:</strong> Click <em>"Copy Firestore Rules"</em> above, go to <strong>Firebase Console &gt; Firestore Database &gt; Rules</strong>, paste the content, and click <strong>"Publish"</strong>.
          </div>
        </div>
      )}

      {/* Sub navigation bar */}
      <div style={{ display: "flex", gap: "0.4rem", background: "var(--bg-subtle)", padding: "0.25rem", borderRadius: "0.65rem", border: "1px solid var(--border-subtle)", width: "fit-content" }}>
        <button
          onClick={() => setActiveSubTab("portal_admins")}
          className="btn btn-sm"
          style={{
            background: activeSubTab === "portal_admins" ? "#ffffff" : "transparent",
            color: activeSubTab === "portal_admins" ? "var(--primary)" : "var(--text-muted)",
            boxShadow: activeSubTab === "portal_admins" ? "var(--shadow-sm)" : "none",
            border: activeSubTab === "portal_admins" ? "1px solid var(--border-subtle)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}
        >
          <UserCheck size={14} />
          <span>Portal Administrators</span>
        </button>

        <button
          onClick={() => setActiveSubTab("school_operators")}
          className="btn btn-sm"
          style={{
            background: activeSubTab === "school_operators" ? "#ffffff" : "transparent",
            color: activeSubTab === "school_operators" ? "var(--primary)" : "var(--text-muted)",
            boxShadow: activeSubTab === "school_operators" ? "var(--shadow-sm)" : "none",
            border: activeSubTab === "school_operators" ? "1px solid var(--border-subtle)" : "1px solid transparent",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}
        >
          <Laptop size={14} />
          <span>Connected School Operators ({schools.length})</span>
        </button>
      </div>

      {/* SUB-TAB 1: PORTAL ADMINISTRATORS */}
      {activeSubTab === "portal_admins" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Card: Add Administrator with Password */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-main)" }}>
                  <Users size={18} color="var(--primary)" />
                  <span>Create Portal Administrator</span>
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                  Add team members who can manage licenses, toggle remote modules, and issue tokens.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGeneratePassword}
                className="btn btn-sm btn-outline"
                style={{ fontSize: "0.72rem", color: "var(--primary)" }}
              >
                <Sparkles size={13} />
                <span>Generate Strong Password</span>
              </button>
            </div>

            {formError && (
              <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", color: "var(--rose)", padding: "0.65rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            {successMsg && (
              <div style={{ background: "var(--emerald-light)", border: "1px solid #a7f3d0", color: "var(--emerald)", padding: "0.65rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <CheckCircle2 size={15} />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateAdmin} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "0.85rem", alignItems: "flex-end" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Email Address
                </label>
                <div style={{ position: "relative" }}>
                  <Mail size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  <input
                    type="email"
                    required
                    className="input"
                    style={{ paddingLeft: "2.2rem" }}
                    placeholder="teammate@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="input"
                    style={{ paddingLeft: "2.2rem", paddingRight: "2.2rem" }}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", display: "flex", alignItems: "center" }}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Confirm Password
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="input"
                    style={{ paddingLeft: "2.2rem" }}
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                  Role & Permissions
                </label>
                <select
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="operator">Operator (View & Edit Modules)</option>
                  <option value="super_admin">Super Admin (Full RBAC + Delete)</option>
                </select>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ width: "100%", height: "2.4rem" }}
                >
                  {isSubmitting ? (
                    <span className="animate-spin" style={{ display: "inline-block", width: "1rem", height: "1rem", border: "2px solid #ffffff", borderTopColor: "transparent", borderRadius: "50%" }} />
                  ) : (
                    <span>Add Administrator</span>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card: Active Administrators List */}
          <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                Authorized Portal Administrators
              </div>
              <span className="badge badge-active" style={{ fontSize: "0.72rem" }}>
                {admins.filter(a => a.email !== currentUser?.email).length + (currentUser ? 1 : 0)} Accounts
              </span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.75rem 1.25rem" }}>Admin Email & Identity</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Role</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Auth Method</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Created Date</th>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Active Master Admin */}
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", background: "rgba(79, 70, 229, 0.02)" }}>
                  <td style={{ padding: "0.85rem 1.25rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <strong style={{ color: "var(--text-main)" }}>{currentUser?.email}</strong>
                      <span className="badge badge-active" style={{ fontSize: "0.6rem" }}>You (Active)</span>
                    </div>
                    <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>UID: {currentUser?.uid}</div>
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <span className="badge badge-active">Master Super Admin</span>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    Password + Master PIN Guard
                  </td>
                  <td style={{ padding: "0.85rem 1rem", color: "var(--text-dim)", fontSize: "0.75rem" }}>
                    Primary Account
                  </td>
                  <td style={{ padding: "0.85rem 1.25rem", textAlign: "right", color: "var(--text-dim)", fontSize: "0.75rem" }}>
                    Protected
                  </td>
                </tr>

                {/* Additional Admins Created */}
                {admins.filter(a => a.email !== currentUser?.email).map((adm) => (
                  <tr key={adm.uid} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "0.85rem 1.25rem" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{adm.email}</div>
                      <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>UID: {adm.uid}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className="badge badge-unused">{adm.role}</span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
                      Email / Password
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--text-dim)", fontSize: "0.75rem" }}>
                      {new Date(adm.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                      <button
                        onClick={() => handleDeleteAdmin(adm)}
                        className="btn btn-sm btn-danger"
                        style={{ padding: "0.25rem 0.5rem" }}
                        title="Revoke access"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SCHOOL OPERATORS & SITES */}
      {activeSubTab === "school_operators" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-main)" }}>
              <Laptop size={18} color="var(--primary)" />
              <span>Installed Client PC Telemetry & Operators</span>
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Hardware motherboard BIOS UUID, hostname, IP address, and location reported by SIMS instances on sync.
            </p>
          </div>

          <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
            {schools.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No school clients connected yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ padding: "0.75rem 1.25rem" }}>Institution</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Motherboard BIOS UUID</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Computer Hostname & Network</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Location & IP</th>
                    <th style={{ padding: "0.75rem 1rem" }}>SIMS Build</th>
                    <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Last Ping</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{s.school_name}</div>
                        <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{s.id}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {s.telemetry?.bound_machine_uuid ? (
                          <span className="mono" style={{ fontSize: "0.72rem", color: "var(--primary)", background: "var(--primary-light)", padding: "0.2rem 0.4rem", borderRadius: "0.3rem" }}>
                            {s.telemetry.bound_machine_uuid}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Unbound / Fresh</span>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ color: "var(--text-main)", fontWeight: 500 }}>{s.telemetry?.hostname || "Local PC"}</div>
                        <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{s.telemetry?.isp || "Local Network"}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
                          <MapPin size={12} color="var(--primary)" />
                          <span>{s.telemetry?.location || "Unknown"}</span>
                        </div>
                        <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                          {s.telemetry?.public_ip || "-"}
                        </div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span className="badge badge-unused">{s.license?.installed_version || "2.5.2"}</span>
                      </td>
                      <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                        {s.telemetry?.last_active_at ? (
                          <span style={{ color: "var(--emerald)", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontWeight: 600 }}>
                            <Clock size={12} />
                            {new Date(s.telemetry.last_active_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)" }}>Never</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
  AlertCircle
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

  // Firestore admins list
  const [admins, setAdmins] = useState<AdminRecord[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "portal_admins"), (snapshot) => {
      const list: AdminRecord[] = snapshot.docs.map((d) => ({
        uid: d.id,
        ...(d.data() as Omit<AdminRecord, "uid">)
      }));
      setAdmins(list);
    });
    return () => unsub();
  }, []);

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
        await setDoc(doc(db, "portal_admins", newUid), {
          uid: newUid,
          email: cleanEmail,
          role,
          created_at: new Date().toISOString()
        });

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
          alert("Error removing admin: " + e.message);
        }
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.68rem 1rem" }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "+ Add Administrator"}
                </button>
              </div>
            </form>
          </div>

          {/* Table: Admin list */}
          <div className="glass-card" style={{ padding: "0", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>Authorized Console Accounts</strong>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total: {admins.length + 1}</span>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--bg-subtle)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.05em", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.75rem 1.25rem" }}>Administrator</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Role</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Security</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Created</th>
                  <th style={{ padding: "0.75rem 1.25rem", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Current Logged-in Master Admin Row */}
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
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
                          {s.telemetry?.public_ip || "—"}
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

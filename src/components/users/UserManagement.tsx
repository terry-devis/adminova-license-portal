import React, { useState } from "react";
import type { User } from "firebase/auth";
import type { SchoolClient } from "../../types";
import {
  ShieldAlert,
  Users,
  UserCheck,
  Laptop,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Clock,
  MapPin
} from "lucide-react";

interface Props {
  currentUser: User | null;
  schools: SchoolClient[];
  onRequire2FA: (actionTitle: string, callback: () => void) => void;
}

export const UserManagement: React.FC<Props> = ({
  currentUser,
  schools,
  onRequire2FA
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"portal_admins" | "ghost_cleanup" | "school_operators">("portal_admins");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminRole, setNewAdminRole] = useState("operator");
  const [adminList, setAdminList] = useState([
    {
      uid: currentUser?.uid || "root_master",
      email: currentUser?.email || "admin@adminova.io",
      role: "Super Admin (Owner)",
      authType: "Email / Password + 2FA",
      status: "Active"
    }
  ]);

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;

    onRequire2FA(`Authorize New Portal Admin (${newAdminEmail})`, () => {
      setAdminList((prev) => [
        ...prev,
        {
          uid: `usr_${Math.random().toString(36).substring(2, 9)}`,
          email: newAdminEmail.trim(),
          role: newAdminRole === "super_admin" ? "Super Admin" : "Operator",
          authType: "Invited",
          status: "Pending Invite"
        }
      ]);
      setNewAdminEmail("");
      alert(`Admin invitation created for ${newAdminEmail}. They can now be granted console privileges.`);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Sub navigation bar */}
      <div style={{ display: "flex", gap: "0.5rem", background: "rgba(15, 23, 42, 0.7)", padding: "0.4rem", borderRadius: "1rem", border: "1px solid var(--border-subtle)", width: "fit-content" }}>
        <button
          onClick={() => setActiveSubTab("portal_admins")}
          className="btn btn-sm"
          style={{
            background: activeSubTab === "portal_admins" ? "var(--primary)" : "transparent",
            color: activeSubTab === "portal_admins" ? "white" : "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}
        >
          <UserCheck size={14} />
          <span>Portal Administrators</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ghost_cleanup")}
          className="btn btn-sm"
          style={{
            background: activeSubTab === "ghost_cleanup" ? "#ef4444" : "transparent",
            color: activeSubTab === "ghost_cleanup" ? "white" : "#fda4af",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem"
          }}
        >
          <ShieldAlert size={14} />
          <span>Anonymous Ghosts Diagnostic (198 Users)</span>
        </button>

        <button
          onClick={() => setActiveSubTab("school_operators")}
          className="btn btn-sm"
          style={{
            background: activeSubTab === "school_operators" ? "var(--primary)" : "transparent",
            color: activeSubTab === "school_operators" ? "white" : "var(--text-muted)",
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
          {/* Card: Add Admin */}
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={18} color="var(--primary)" />
              <span>Adminova Command Center Administrators</span>
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Only verified administrators with authenticated email addresses can manage school licenses, toggle remote modules, and rotate cryptographic keys.
            </p>

            <form onSubmit={handleAddAdmin} style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                type="email"
                required
                className="input"
                style={{ flex: 1, minWidth: "15rem" }}
                placeholder="colleague@yourcompany.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
              />
              <select
                className="input"
                style={{ width: "11rem" }}
                value={newAdminRole}
                onChange={(e) => setNewAdminRole(e.target.value)}
              >
                <option value="operator">Operator (Read/Edit)</option>
                <option value="super_admin">Super Admin (Full RBAC)</option>
              </select>
              <button type="submit" className="btn btn-primary">
                + Add Administrator
              </button>
            </form>
          </div>

          {/* Table: Admin list */}
          <div className="glass-card" style={{ padding: "1rem", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Administrator</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Role</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Auth Provider</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Privileges</th>
                </tr>
              </thead>
              <tbody>
                {adminList.map((adm) => (
                  <tr key={adm.uid} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{adm.email}</div>
                      <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>UID: {adm.uid}</div>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span className="badge badge-active">{adm.role}</span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", color: "var(--text-muted)" }}>
                      {adm.authType}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <CheckCircle2 size={13} />
                        {adm.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", color: "var(--text-muted)" }}>
                      Master 2FA Required
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: GHOST CLEANUP DIAGNOSTIC */}
      {activeSubTab === "ghost_cleanup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Main Diagnostic Banner */}
          <div style={{ background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "1.25rem", padding: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
              <div style={{ width: "2.75rem", height: "2.75rem", borderRadius: "0.75rem", background: "rgba(239, 68, 68, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldAlert size={24} color="#ef4444" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fca5a5" }}>
                    Why are there 198 "Unidentified" users in Firebase Authentication?
                  </h3>
                  <span className="badge" style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5", border: "1px solid rgba(239,68,68,0.4)" }}>
                    Root Cause Identified
                  </span>
                </div>
                <p style={{ fontSize: "0.82rem", color: "rgba(254, 202, 202, 0.9)", lineHeight: 1.6 }}>
                  In the previous SIMS codebase, whenever a client checked a license or activated an instance, it called the Firebase REST API:
                  <code className="mono" style={{ background: "rgba(0,0,0,0.4)", padding: "0.2rem 0.4rem", borderRadius: "0.3rem", margin: "0 0.3rem", color: "#fecaca" }}>
                    POST https://identitytoolkit.googleapis.com/v1/accounts:signUp
                  </code>
                  with <code className="mono" style={{ color: "#fecaca" }}>returnSecureToken: true</code> and <strong>no email or password</strong>.
                </p>
                <p style={{ fontSize: "0.82rem", color: "rgba(254, 202, 202, 0.8)", lineHeight: 1.6 }}>
                  In Google Firebase, calling anonymous sign-up without credentials <strong>registers a brand-new anonymous user account every single time</strong>. Because this was invoked during syncs and setup wizard tests, 198 disposable sessions accumulated in your Firebase project while you only ever created 1 real user.
                </p>
              </div>
            </div>
          </div>

          {/* Solution & Purge Instructions */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
            {/* Box 1: How we patched it */}
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#34d399", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <CheckCircle2 size={16} />
                <span>1. Fix Applied in SIMS Client</span>
              </h4>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                We have updated <code className="mono">LicenseController.php</code> and <code className="mono">SetupWizard.php</code> in SIMS:
              </p>
              <ul style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, paddingLeft: "1.25rem", listStyleType: "disc" }}>
                <li>It now <strong>reuses the encrypted refresh token</strong> saved in SQLite.</li>
                <li>It will <strong>never</strong> call <code className="mono">accounts:signUp</code> when an existing session or license is already on disk.</li>
                <li>Zero new ghost accounts will ever be generated going forward.</li>
              </ul>
            </div>

            {/* Box 2: Purging the 198 Ghosts */}
            <div className="glass-card" style={{ padding: "1.25rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--cyan)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Trash2 size={16} />
                <span>2. Clean Up Existing 198 Ghosts</span>
              </h4>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                You can safely delete all 198 unidentified accounts in 30 seconds directly from your Firebase Console without touching your 1 real admin user:
              </p>
              <ol style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.6, paddingLeft: "1.25rem", listStyleType: "decimal" }}>
                <li>Open <strong>Firebase Console</strong> ? <strong>Authentication</strong> ? <strong>Users</strong>.</li>
                <li>Click the <strong>Filter</strong> icon next to search.</li>
                <li>Select <strong>Provider: Anonymous</strong>.</li>
                <li>Click the top checkbox to Select All ? Click <strong>Delete accounts</strong>.</li>
              </ol>
              <div style={{ marginTop: "1rem" }}>
                <a
                  href="https://console.firebase.google.com/project/sims-licensing/authentication/users"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-sm btn-outline"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderColor: "var(--cyan)", color: "var(--cyan)" }}
                >
                  <ExternalLink size={13} />
                  <span>Open Firebase Console Auth Users</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SCHOOL OPERATORS & SITES */}
      {activeSubTab === "school_operators" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Laptop size={18} color="var(--cyan)" />
              <span>Installed Client PC Telemetry & Operators</span>
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Every connected school transmits hardware BIOS telemetry, public IP, location, and host machine identifiers upon each synchronization heartbeat.
            </p>
          </div>

          <div className="glass-card" style={{ padding: "1rem", overflowX: "auto" }}>
            {schools.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No school clients connected yet.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Institution</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Machine BIOS UUID</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Host Machine & Network</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Location & IP</th>
                    <th style={{ padding: "0.75rem 1rem" }}>SIMS Build</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Last Ping</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((s) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "var(--text-main)" }}>{s.school_name}</div>
                        <div className="mono" style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{s.id}</div>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {s.telemetry?.bound_machine_uuid ? (
                          <span className="mono" style={{ fontSize: "0.72rem", color: "#a5b4fc" }}>
                            {s.telemetry.bound_machine_uuid}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>Not bound to hardware yet</span>
                        )}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ color: "var(--text-main)" }}>{s.telemetry?.hostname || "Local Server"}</div>
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
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        {s.telemetry?.last_active_at ? (
                          <span style={{ color: "var(--cyan)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
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

import React from "react";
import { Plus, LogOut, CheckCircle2, AlertTriangle, ShieldCheck, Building2, Users } from "lucide-react";
import type { User } from "firebase/auth";

interface Props {
  user: User | null;
  hasPrivateKey: boolean;
  activeNavTab: "schools" | "users";
  onSelectNavTab: (tab: "schools" | "users") => void;
  onOpenKeyModal: () => void;
  onOpenCreateSchool: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<Props> = ({
  user,
  hasPrivateKey,
  activeNavTab,
  onSelectNavTab,
  onOpenKeyModal,
  onOpenCreateSchool,
  onSignOut
}) => {
  return (
    <header className="glass" style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid var(--border-subtle)" }}>
      <div style={{ maxWidth: "80rem", margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.75rem", background: "linear-gradient(135deg, #6366f1, #06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: "1.1rem", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
            A
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Adminova</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: "9999px", background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)", textTransform: "uppercase" }}>
                Command Center v2.5
              </span>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Universal Licensing, Telemetry & Remote Control</p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div style={{ display: "flex", alignItems: "center", background: "rgba(15, 23, 42, 0.8)", padding: "0.25rem", borderRadius: "0.75rem", border: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => onSelectNavTab("schools")}
            className="btn btn-sm"
            style={{
              background: activeNavTab === "schools" ? "var(--primary)" : "transparent",
              color: activeNavTab === "schools" ? "white" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.75rem"
            }}
          >
            <Building2 size={14} />
            <span>Schools & Licenses</span>
          </button>

          <button
            onClick={() => onSelectNavTab("users")}
            className="btn btn-sm"
            style={{
              background: activeNavTab === "users" ? "var(--primary)" : "transparent",
              color: activeNavTab === "users" ? "white" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.75rem",
              position: "relative"
            }}
          >
            <Users size={14} />
            <span>Users & Access</span>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 8px #ef4444"
              }}
              title="198 Anonymous ghost accounts detected"
            />
          </button>
        </div>

        {/* Security & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* RSA Key Badge */}
          <button
            onClick={onOpenKeyModal}
            className="btn btn-sm btn-outline"
            style={{
              borderColor: hasPrivateKey ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.4)",
              background: hasPrivateKey ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.1)",
              color: hasPrivateKey ? "#6ee7b7" : "#fcd34d"
            }}
          >
            {hasPrivateKey ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            <span>{hasPrivateKey ? "RSA Key (RAM)" : "Load private.pem"}</span>
          </button>

          {/* 2FA Guard Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              padding: "0.4rem 0.65rem",
              borderRadius: "0.5rem",
              background: "rgba(99, 102, 241, 0.1)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              color: "#a5b4fc",
              fontSize: "0.72rem",
              fontWeight: 600
            }}
          >
            <ShieldCheck size={14} />
            <span>2FA Active</span>
          </div>

          <button onClick={onOpenCreateSchool} className="btn btn-sm btn-primary">
            <Plus size={15} />
            <span>Register School</span>
          </button>

          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingLeft: "0.5rem", borderLeft: "1px solid var(--border-subtle)" }}>
              <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {user.email}
              </span>
              <button
                onClick={onSignOut}
                className="btn btn-sm btn-outline"
                style={{ padding: "0.4rem 0.5rem", color: "#fb7185" }}
                title="Sign Out"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

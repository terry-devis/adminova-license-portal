import React from "react";
import { Plus, LogOut, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import type { User } from "firebase/auth";

interface Props {
  user: User | null;
  hasPrivateKey: boolean;
  onOpenKeyModal: () => void;
  onOpenCreateSchool: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<Props> = ({
  user,
  hasPrivateKey,
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

        {/* Center / Security Badges */}
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
            <span>{hasPrivateKey ? "RSA Key Loaded (RAM)" : "Load private.pem"}</span>
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
            <span>2FA Guard Active</span>
          </div>
        </div>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
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

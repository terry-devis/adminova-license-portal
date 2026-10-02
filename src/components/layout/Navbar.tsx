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
      <div style={{ maxWidth: "82rem", margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "2.25rem", height: "2.25rem", borderRadius: "0.65rem", background: "linear-gradient(135deg, #4f46e5, #0284c7)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white", fontSize: "1.1rem", boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)" }}>
            A
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>Adminova</span>
              <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.45rem", borderRadius: "9999px", background: "var(--primary-light)", color: "var(--primary)", border: "1px solid #c7d2fe", textTransform: "uppercase" }}>
                Portal v2.5
              </span>
            </div>
            <p style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Central School Licensing & Telemetry</p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <div style={{ display: "flex", alignItems: "center", background: "var(--bg-subtle)", padding: "0.25rem", borderRadius: "0.65rem", border: "1px solid var(--border-subtle)" }}>
          <button
            onClick={() => onSelectNavTab("schools")}
            className="btn btn-sm"
            style={{
              background: activeNavTab === "schools" ? "#ffffff" : "transparent",
              color: activeNavTab === "schools" ? "var(--primary)" : "var(--text-muted)",
              boxShadow: activeNavTab === "schools" ? "var(--shadow-sm)" : "none",
              border: activeNavTab === "schools" ? "1px solid var(--border-subtle)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.85rem"
            }}
          >
            <Building2 size={14} />
            <span>Schools & Licenses</span>
          </button>

          <button
            onClick={() => onSelectNavTab("users")}
            className="btn btn-sm"
            style={{
              background: activeNavTab === "users" ? "#ffffff" : "transparent",
              color: activeNavTab === "users" ? "var(--primary)" : "var(--text-muted)",
              boxShadow: activeNavTab === "users" ? "var(--shadow-sm)" : "none",
              border: activeNavTab === "users" ? "1px solid var(--border-subtle)" : "1px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.35rem 0.85rem"
            }}
          >
            <Users size={14} />
            <span>User Management</span>
          </button>
        </div>

        {/* Security & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {/* RSA Key Badge */}
          <button
            onClick={onOpenKeyModal}
            className="btn btn-sm btn-outline"
            style={{
              borderColor: hasPrivateKey ? "#a7f3d0" : "#fde68a",
              background: hasPrivateKey ? "var(--emerald-light)" : "var(--amber-light)",
              color: hasPrivateKey ? "var(--emerald)" : "var(--amber)"
            }}
          >
            {hasPrivateKey ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
            <span>{hasPrivateKey ? "RSA Key (RAM)" : "Load private.pem"}</span>
          </button>

          {/* 2FA Guard Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.35rem 0.6rem",
              borderRadius: "0.5rem",
              background: "var(--primary-light)",
              border: "1px solid #c7d2fe",
              color: "var(--primary)",
              fontSize: "0.72rem",
              fontWeight: 600
            }}
          >
            <ShieldCheck size={13} />
            <span>2FA Active</span>
          </div>

          <button onClick={onOpenCreateSchool} className="btn btn-sm btn-primary">
            <Plus size={14} />
            <span>Register School</span>
          </button>

          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", paddingLeft: "0.5rem", borderLeft: "1px solid var(--border-subtle)" }}>
              <span className="mono" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {user.email}
              </span>
              <button
                onClick={onSignOut}
                className="btn btn-sm btn-outline"
                style={{ padding: "0.35rem 0.45rem", color: "var(--rose)" }}
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

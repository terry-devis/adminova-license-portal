import React, { useState } from "react";
import {
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Calendar,
  Trash2,
  MapPin,
  Globe,
  Cpu
} from "lucide-react";
import type { SchoolClient } from "../../types";
import { resetMachineLock, renewLicense, deleteSchool } from "../../services/schoolService";

interface Props {
  school: SchoolClient;
  onOpenRemote: (school: SchoolClient) => void;
  onRequireKey: () => void;
  onRequire2FA: (actionTitle: string, callback: () => void) => void;
  onActionComplete: () => void;
}

export const SchoolCard: React.FC<Props> = ({
  school,
  onOpenRemote,
  onRequireKey,
  onRequire2FA,
  onActionComplete
}) => {
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const isExpired = new Date(school.expires_at).getTime() < Date.now();
  const daysLeft = Math.ceil((new Date(school.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const copyToClipboard = (text: string, isToken: boolean) => {
    navigator.clipboard.writeText(text);
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleResetLock = () => {
    onRequire2FA(`Reset Hardware Lock for ${school.school_name}`, async () => {
      try {
        await resetMachineLock(school);
        onActionComplete();
      } catch (e: any) {
        alert("Failed to reset hardware lock: " + e.message);
      }
    });
  };

  const handleRenew = () => {
    onRequire2FA(`Extend License for ${school.school_name} by 1 Year`, async () => {
      try {
        await renewLicense(school, 365);
        onActionComplete();
      } catch (e: any) {
        if (e.message.includes("Private Key")) {
          onRequireKey();
        } else {
          alert("Failed to extend license: " + e.message);
        }
      }
    });
  };

  const handleDelete = () => {
    onRequire2FA(`Permanently DELETE ${school.school_name}`, async () => {
      if (confirm(`Are you completely sure you want to permanently delete "${school.school_name}"?`)) {
        try {
          await deleteSchool(school);
          onActionComplete();
        } catch (e: any) {
          alert("Delete error: " + e.message);
        }
      }
    });
  };

  const getStatusBadge = () => {
    if (school.status === "revoked") {
      return <span className="badge badge-revoked">⛔ Killswitch Active</span>;
    }
    if (school.status === "locked_readonly") {
      return <span className="badge badge-locked">🔒 Read-Only Mode</span>;
    }
    if (isExpired) {
      return <span className="badge badge-locked">⚠️ Expired ({Math.abs(daysLeft)}d ago)</span>;
    }
    return <span className="badge badge-active">● Active ({daysLeft}d left)</span>;
  };

  return (
    <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
              {school.school_name}
            </span>
            <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-dim)", background: "rgba(255,255,255,0.06)", padding: "0.15rem 0.4rem", borderRadius: "0.4rem" }}>
              {school.id}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
            <span className="badge badge-unused">{school.plan}</span>
            {getStatusBadge()}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => onOpenRemote(school)}
            className="btn btn-sm btn-primary"
            title="Open Remote Control & Module Toggles"
          >
            <Sliders size={14} />
            <span>Remote Control</span>
          </button>
        </div>
      </div>

      {/* Broadcast alert if present */}
      {school.broadcast_announcement && (
        <div style={{ background: "rgba(6, 182, 212, 0.1)", border: "1px solid rgba(6, 182, 212, 0.25)", borderRadius: "0.6rem", padding: "0.5rem 0.75rem", fontSize: "0.75rem", color: "#67e8f9" }}>
          <strong>📢 Active Announcement:</strong> {school.broadcast_announcement}
        </div>
      )}

      {/* Unified Credential Box: Token + License */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {/* Token Section */}
        <div style={{ background: "rgba(9, 13, 22, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "0.75rem", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              1-Time Install Token
            </span>
            <span
              className={`badge ${school.token?.status === "burned" ? "badge-active" : "badge-unused"}`}
              style={{ fontSize: "0.6rem", padding: "0.1rem 0.4rem" }}
            >
              {school.token?.status === "burned" ? "Burned / Bound" : "Unused (Fresh)"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--cyan)" }}>
              {school.token?.token_string}
            </span>
            <button
              onClick={() => copyToClipboard(school.token?.token_string || "", true)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Copy Token"
            >
              {copiedToken ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* License Key Section */}
        <div style={{ background: "rgba(9, 13, 22, 0.7)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "0.75rem", padding: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Cryptographic License Key
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--text-dim)" }}>
              Exp: {new Date(school.expires_at).toLocaleDateString("en-GB")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: "0.78rem", fontWeight: 700, color: "#a5b4fc" }}>
              {school.license?.key ? `${school.license.key.substring(0, 18)}...` : "—"}
            </span>
            <button
              onClick={() => copyToClipboard(school.license?.key || "", false)}
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}
              title="Copy License Key"
            >
              {copiedKey ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry & Device Intelligence Strip */}
      <div style={{ background: "rgba(30, 41, 59, 0.25)", border: "1px solid rgba(255, 255, 255, 0.04)", borderRadius: "0.75rem", padding: "0.65rem 0.85rem", fontSize: "0.72rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
            <MapPin size={13} color="var(--primary)" />
            <span>
              {school.telemetry?.location ? (
                <strong style={{ color: "var(--text-main)" }}>{school.telemetry.location}</strong>
              ) : (
                <span style={{ color: "var(--text-dim)" }}>Location Pending</span>
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
            <Globe size={13} color="var(--cyan)" />
            <span>
              IP: {school.telemetry?.public_ip ? (
                <span className="mono" style={{ color: "var(--text-main)" }}>{school.telemetry.public_ip}</span>
              ) : (
                <span style={{ color: "var(--text-dim)" }}>—</span>
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)" }}>
            <Cpu size={13} color="#10b981" />
            <span>
              UUID: {school.telemetry?.bound_machine_uuid ? (
                <span className="mono" style={{ color: "var(--text-main)" }} title={school.telemetry.bound_machine_uuid}>
                  {school.telemetry.bound_machine_uuid.substring(0, 10)}...
                </span>
              ) : (
                <span style={{ color: "var(--text-dim)" }}>Unbound</span>
              )}
            </span>
          </div>
        </div>

        {school.telemetry?.isp && (
          <div style={{ marginTop: "0.35rem", paddingTop: "0.35rem", borderTop: "1px solid rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between", color: "var(--text-dim)" }}>
            <span>Network: {school.telemetry.isp} {school.telemetry.hostname ? `(${school.telemetry.hostname})` : ""}</span>
            <span>Last Ping: {school.telemetry.last_active_at ? new Date(school.telemetry.last_active_at).toLocaleTimeString() : "Never"}</span>
          </div>
        )}
      </div>

      {/* Enabled Modules Badges */}
      <div>
        <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginRight: "0.5rem" }}>
          Active Modules:
        </span>
        <div style={{ display: "inline-flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {["fees", "exams", "attendance", "whatsapp", "reports"].map((m) => {
            const has = (school.enabled_modules || []).includes(m);
            return (
              <span
                key={m}
                style={{
                  fontSize: "0.65rem",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "0.35rem",
                  background: has ? "rgba(99, 102, 241, 0.15)" : "rgba(255, 255, 255, 0.03)",
                  color: has ? "#c7d2fe" : "var(--text-dim)",
                  border: `1px solid ${has ? "rgba(99, 102, 241, 0.25)" : "transparent"}`,
                  textDecoration: has ? "none" : "line-through"
                }}
              >
                {m}
              </span>
            );
          })}
        </div>
      </div>

      {/* Card Action Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleResetLock}
            className="btn btn-sm btn-outline"
            title="Allows the school to reinstall SIMS if their PC crashed or was formatted"
          >
            <RotateCcw size={12} />
            <span>Reset Hardware Lock</span>
          </button>

          <button
            onClick={handleRenew}
            className="btn btn-sm btn-outline"
            title="Extend license by 1 year"
          >
            <Calendar size={12} />
            <span>+1 Year</span>
          </button>
        </div>

        <button
          onClick={handleDelete}
          className="btn btn-sm btn-danger"
          title="Delete school record"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

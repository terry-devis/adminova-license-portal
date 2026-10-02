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
  Cpu,
  Sparkles,
  Ticket
} from "lucide-react";
import type { SchoolClient } from "../../types";
import { resetMachineLock, renewLicense, deleteSchool, migrateLegacySchool } from "../../services/schoolService";

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
  const [migrating, setMigrating] = useState(false);

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

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      await migrateLegacySchool(school);
      onActionComplete();
    } catch (e: any) {
      alert("Failed to migrate record: " + e.message);
    } finally {
      setMigrating(false);
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
    if (school.is_legacy_token) {
      return (
        <span className="badge" style={{ background: "var(--cyan-light)", color: "var(--cyan)", borderColor: "#bae6fd" }}>
          <Ticket size={11} style={{ marginRight: "0.2rem" }} />
          Standalone Token
        </span>
      );
    }
    if (school.status === "revoked") {
      return <span className="badge badge-revoked">Killswitch Active</span>;
    }
    if (school.status === "locked_readonly") {
      return <span className="badge badge-locked">Read-Only</span>;
    }
    if (isExpired) {
      return <span className="badge badge-locked">Expired ({Math.abs(daysLeft)}d ago)</span>;
    }
    return <span className="badge badge-active">Active ({daysLeft}d left)</span>;
  };

  return (
    <div className="glass-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>
              {school.school_name}
            </span>
            <span className="mono" style={{ fontSize: "0.68rem", color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "0.15rem 0.4rem", borderRadius: "0.35rem", border: "1px solid var(--border-subtle)" }}>
              {school.id}
            </span>
            {school.is_legacy && (
              <span className="badge" style={{ background: "var(--amber-light)", color: "var(--amber)", borderColor: "#fde68a", fontSize: "0.62rem" }}>
                ⚡ Existing License
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.3rem" }}>
            <span className="badge badge-unused">{school.plan}</span>
            {getStatusBadge()}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
          {(school.is_legacy || school.is_legacy_token) && (
            <button
              onClick={handleMigrate}
              disabled={migrating}
              className="btn btn-sm"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "white", padding: "0.3rem 0.55rem" }}
              title="Upgrade this record into the unified Adminova v3 collection"
            >
              <Sparkles size={12} />
              <span>{migrating ? "Upgrading..." : "Unify to v3"}</span>
            </button>
          )}

          <button
            onClick={() => onOpenRemote(school)}
            className="btn btn-sm btn-primary"
            style={{ padding: "0.35rem 0.65rem" }}
            title="Configure remote feature toggles and announcements"
          >
            <Sliders size={13} />
            <span>Remote Control</span>
          </button>
        </div>
      </div>

      {/* Broadcast alert if present */}
      {school.broadcast_announcement && (
        <div style={{ background: "var(--cyan-light)", border: "1px solid #bae6fd", borderRadius: "0.5rem", padding: "0.45rem 0.7rem", fontSize: "0.74rem", color: "#0369a1" }}>
          <strong>Notice:</strong> {school.broadcast_announcement}
        </div>
      )}

      {/* Unified Credential Box: Token + License */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
        {/* Token Section */}
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.65rem", padding: "0.65rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Install Token
            </span>
            <span
              className={`badge ${school.token?.status === "burned" ? "badge-active" : "badge-unused"}`}
              style={{ fontSize: "0.58rem", padding: "0.08rem 0.35rem" }}
            >
              {school.token?.status === "burned" ? "Bound" : "Unused"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
            <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--cyan)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {school.token?.token_string}
            </span>
            {school.token?.token_string && school.token.token_string !== "LEGACY-DIRECT-KEY" && (
              <button
                onClick={() => copyToClipboard(school.token?.token_string || "", true)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}
                title="Copy Token"
              >
                {copiedToken ? <Check size={13} color="#059669" /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* License Key Section */}
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.65rem", padding: "0.65rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              License Key
            </span>
            <span style={{ fontSize: "0.62rem", color: "var(--text-dim)" }}>
              {new Date(school.expires_at).toLocaleDateString("en-GB")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.25rem" }}>
            <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {school.license?.key ? `${school.license.key.substring(0, 16)}...` : "-"}
            </span>
            {school.license?.key && school.license.key !== "PENDING-FIRST-INSTALL" && (
              <button
                onClick={() => copyToClipboard(school.license?.key || "", false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}
                title="Copy License Key"
              >
                {copiedKey ? <Check size={13} color="#059669" /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div style={{ background: "#ffffff", border: "1px solid var(--border-subtle)", borderRadius: "0.65rem", padding: "0.55rem 0.75rem", fontSize: "0.72rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
            <MapPin size={12} color="var(--primary)" />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {school.telemetry?.location ? (
                <strong style={{ color: "var(--text-main)" }}>{school.telemetry.location}</strong>
              ) : (
                <span style={{ color: "var(--text-dim)" }}>Location Pending</span>
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
            <Globe size={12} color="var(--cyan)" />
            <span className="mono" style={{ color: school.telemetry?.public_ip ? "var(--text-main)" : "var(--text-dim)" }}>
              {school.telemetry?.public_ip || "IP: —"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--text-muted)" }}>
            <Cpu size={12} color="var(--emerald)" />
            <span className="mono" style={{ color: school.telemetry?.bound_machine_uuid ? "var(--text-main)" : "var(--text-dim)" }} title={school.telemetry?.bound_machine_uuid || ""}>
              {school.telemetry?.bound_machine_uuid ? `${school.telemetry.bound_machine_uuid.substring(0, 8)}...` : "Unbound"}
            </span>
          </div>
        </div>
      </div>

      {/* Enabled Modules Badges */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.64rem", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginRight: "0.25rem" }}>
            Modules:
          </span>
          {["fees", "exams", "attendance", "whatsapp", "reports"].map((m) => {
            const has = (school.enabled_modules || []).includes(m);
            return (
              <span
                key={m}
                style={{
                  fontSize: "0.62rem",
                  padding: "0.12rem 0.38rem",
                  borderRadius: "0.3rem",
                  background: has ? "var(--primary-light)" : "var(--bg-subtle)",
                  color: has ? "var(--primary)" : "var(--text-dim)",
                  border: `1px solid ${has ? "#c7d2fe" : "var(--border-subtle)"}`,
                  textDecoration: has ? "none" : "line-through",
                  fontWeight: has ? 600 : 400
                }}
              >
                {m}
              </span>
            );
          })}
        </div>

        {/* Card Action Footer */}
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
          <button
            onClick={handleResetLock}
            className="btn btn-sm btn-outline"
            style={{ padding: "0.25rem 0.45rem", fontSize: "0.7rem" }}
            title="Allows the school to reinstall SIMS if their PC crashed or was formatted"
          >
            <RotateCcw size={11} />
            <span>Reset Lock</span>
          </button>

          <button
            onClick={handleRenew}
            className="btn btn-sm btn-outline"
            style={{ padding: "0.25rem 0.45rem", fontSize: "0.7rem" }}
            title="Extend license by 1 year"
          >
            <Calendar size={11} />
            <span>+1 Yr</span>
          </button>

          <button
            onClick={handleDelete}
            className="btn btn-sm btn-danger"
            style={{ padding: "0.25rem 0.45rem" }}
            title="Delete school record"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
};

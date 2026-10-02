import React, { useState } from "react";
import { Sliders, ShieldAlert, X, CheckSquare, Square, Save } from "lucide-react";
import type { SchoolClient, LicenseStatus } from "../../types";
import { updateRemotePolicy } from "../../services/schoolService";

interface Props {
  school: SchoolClient | null;
  isOpen: boolean;
  onClose: () => void;
  onRequire2FA: (actionTitle: string, callback: () => void) => void;
  onUpdated: () => void;
}

const AVAILABLE_MODULES = [
  { id: "fees", label: "Fee Management", desc: "Completely hides invoices, fee receipts, vouchers & balances" },
  { id: "exams", label: "Exams & Datesheets", desc: "Completely hides exam setups, mark entries & report cards" },
  { id: "attendance", label: "Attendance & Biometrics", desc: "Hides student & staff daily attendance logs" },
  { id: "whatsapp", label: "WhatsApp Alerts", desc: "Disables automated message dispatching engines" },
  { id: "reports", label: "Reports & Analytics", desc: "Hides advanced gazettes and analytical exports" }
];

export const RemoteControlModal: React.FC<Props> = ({
  school,
  isOpen,
  onClose,
  onRequire2FA,
  onUpdated
}) => {
  if (!isOpen || !school) return null;

  const [status, setStatus] = useState<LicenseStatus>(school.status);
  const [modules, setModules] = useState<string[]>(school.enabled_modules || []);
  const [broadcast, setBroadcast] = useState(school.broadcast_announcement || "");
  const [saving, setSaving] = useState(false);

  const toggleModule = (modId: string) => {
    setModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleSave = () => {
    const isKillswitchTrigger = status === "revoked" && school.status !== "revoked";
    const promptMsg = isKillswitchTrigger
      ? `ACTIVATE EMERGENCY KILLSWITCH for ${school.school_name}`
      : `Update Remote Policies for ${school.school_name}`;

    onRequire2FA(promptMsg, async () => {
      setSaving(true);
      try {
        await updateRemotePolicy(school, {
          status,
          enabled_modules: modules,
          broadcast_announcement: broadcast
        });
        onUpdated();
        onClose();
      } catch (err: any) {
        alert("Failed to update remote policies: " + err.message);
      } finally {
        setSaving(false);
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "36rem", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "0.75rem", background: "rgba(6, 182, 212, 0.15)", color: "var(--cyan)" }}>
              <Sliders size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>Remote App Control & Feature Toggles</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target: <strong style={{ color: "var(--text-main)" }}>{school.school_name}</strong> ({school.id})</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Section 1: System Status & Killswitch */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-subtle)", borderRadius: "1rem", padding: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.6rem" }}>
              App Execution Mode (Instant Enforcement)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`btn btn-sm ${status === "active" ? "btn-success" : "btn-outline"}`}
                style={{ justifyContent: "center" }}
              >
                ● Normal Active
              </button>
              <button
                type="button"
                onClick={() => setStatus("locked_readonly")}
                className="btn btn-sm btn-outline"
                style={{
                  justifyContent: "center",
                  background: status === "locked_readonly" ? "rgba(245, 158, 11, 0.2)" : undefined,
                  borderColor: status === "locked_readonly" ? "rgba(245, 158, 11, 0.4)" : undefined,
                  color: status === "locked_readonly" ? "#fcd34d" : undefined
                }}
              >
                🔒 Read-Only
              </button>
              <button
                type="button"
                onClick={() => setStatus("revoked")}
                className={`btn btn-sm ${status === "revoked" ? "btn-danger" : "btn-outline"}`}
                style={{ justifyContent: "center" }}
              >
                ⛔ Kill Switch
              </button>
            </div>

            {status === "revoked" && (
              <div style={{ marginTop: "0.75rem", background: "rgba(244, 63, 94, 0.12)", border: "1px solid rgba(244, 63, 94, 0.3)", borderRadius: "0.5rem", padding: "0.6rem", fontSize: "0.75rem", color: "#fda4af", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <ShieldAlert size={16} />
                <span>
                  <strong>Kill Switch Activated:</strong> The client instance will be immediately locked out within seconds. Staff cannot login until unblocked.
                </span>
              </div>
            )}
            {status === "locked_readonly" && (
              <div style={{ marginTop: "0.75rem", background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "0.5rem", padding: "0.6rem", fontSize: "0.75rem", color: "#fcd34d" }}>
                <strong>Read-Only Mode:</strong> Database modifications are blocked. Teachers can view records and generate reports, but cannot insert/update data.
              </div>
            )}
          </div>

          {/* Section 2: Module Feature Flags */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-subtle)", borderRadius: "1rem", padding: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
              Active Module Visibility (Completely Hides from App)
            </label>
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.75rem" }}>
              Unchecking a module immediately removes its navigation links, routes, widgets, and search indices from the school's UI.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {AVAILABLE_MODULES.map((mod) => {
                const active = modules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "0.75rem",
                      background: active ? "rgba(99, 102, 241, 0.08)" : "rgba(30, 41, 59, 0.3)",
                      border: `1px solid ${active ? "rgba(99, 102, 241, 0.3)" : "rgba(255, 255, 255, 0.05)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ color: active ? "var(--primary)" : "var(--text-dim)" }}>
                        {active ? <CheckSquare size={18} /> : <Square size={18} />}
                      </div>
                      <div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: active ? "var(--text-main)" : "var(--text-muted)" }}>
                          {mod.label}
                        </span>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{mod.desc}</p>
                      </div>
                    </div>
                    <span className={`badge ${active ? "badge-active" : "badge-revoked"}`}>
                      {active ? "Visible" : "Hidden"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Broadcast Announcement */}
          <div style={{ background: "rgba(15, 23, 42, 0.5)", border: "1px solid var(--border-subtle)", borderRadius: "1rem", padding: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
              Vendor Broadcast Announcement (Real-Time Banner)
            </label>
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginBottom: "0.5rem" }}>
              Displays a prominent banner across the school's admin header upon instant push. Leave blank to remove.
            </p>
            <input
              type="text"
              className="input"
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
              placeholder="e.g. Please submit your annual renewal invoice before Oct 15th to avoid disruption."
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            {saving ? "Broadcasting..." : "Push Changes Instantly (< 1s)"}
          </button>
        </div>
      </div>
    </div>
  );
};

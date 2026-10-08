import React, { useState, useEffect } from "react";
import { Sliders, ShieldAlert, X, CheckSquare, Square, Save } from "lucide-react";
import type { SchoolClient, LicenseStatus, ScheduleTypePolicy } from "../../types";
import { updateRemotePolicy, resolveSchoolModules } from "../../services/schoolService";

interface Props {
  school: SchoolClient | null;
  isOpen: boolean;
  onClose: () => void;
  onRequire2FA: (actionTitle: string, callback: () => void) => void;
  onUpdated: () => void;
}

const AVAILABLE_MODULES = [
  { id: "students", label: "Student Management", desc: "Hides student admissions, profiles, rosters & ID cards" },
  { id: "gradebook", label: "Gradebook", desc: "Hides admin and teacher gradebook assessments" },
  { id: "fees", label: "Fee Management", desc: "Completely hides invoices, receipts, vouchers & student ledger" },
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
  const [status, setStatus] = useState<LicenseStatus>(school?.status || "active");
  const [schedulePolicy, setSchedulePolicy] = useState<ScheduleTypePolicy>(school?.schedule_type_policy || "configurable");
  const [modules, setModules] = useState<string[]>(school ? resolveSchoolModules(school) : []);
  const [broadcast, setBroadcast] = useState(school?.broadcast_announcement || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (school) {
      setStatus(school.status || "active");
      setSchedulePolicy(school.schedule_type_policy || "configurable");
      setModules(resolveSchoolModules(school));
      setBroadcast(school.broadcast_announcement || "");
    }
  }, [school, isOpen]);

  if (!isOpen || !school) return null;

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onRequire2FA(`Apply Remote Policy to ${school.school_name}`, async () => {
      setSaving(true);
      try {
        await updateRemotePolicy(school, {
          status,
          schedule_type_policy: schedulePolicy,
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
      <div className="modal-content" style={{ maxWidth: "34rem", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ padding: "0.45rem", borderRadius: "0.65rem", background: "var(--cyan-light)", color: "var(--cyan)" }}>
              <Sliders size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>Remote Control & Modules</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Target: <strong style={{ color: "var(--text-main)" }}>{school.school_name}</strong> ({school.id})</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Section 1: System Status & Killswitch */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.85rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.45rem" }}>
              App Execution Mode
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.45rem" }}>
              <button
                type="button"
                onClick={() => setStatus("active")}
                className={`btn btn-sm ${status === "active" ? "btn-success" : "btn-outline"}`}
                style={{ justifyContent: "center" }}
              >
                Normal Active
              </button>
              <button
                type="button"
                onClick={() => setStatus("locked_readonly")}
                className="btn btn-sm btn-outline"
                style={{
                  justifyContent: "center",
                  background: status === "locked_readonly" ? "var(--amber-light)" : undefined,
                  borderColor: status === "locked_readonly" ? "#fde68a" : undefined,
                  color: status === "locked_readonly" ? "var(--amber)" : undefined,
                  fontWeight: status === "locked_readonly" ? 700 : 500
                }}
              >
                Read-Only
              </button>
              <button
                type="button"
                onClick={() => setStatus("revoked")}
                className={`btn btn-sm ${status === "revoked" ? "btn-danger" : "btn-outline"}`}
                style={{ justifyContent: "center" }}
              >
                Kill Switch
              </button>
            </div>

            {status === "revoked" && (
              <div style={{ marginTop: "0.6rem", background: "var(--rose-light)", border: "1px solid #fecaca", borderRadius: "0.5rem", padding: "0.55rem", fontSize: "0.75rem", color: "var(--rose)", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <ShieldAlert size={15} />
                <span>
                  <strong>Killswitch Active:</strong> Client is locked out immediately. Staff cannot login until unblocked.
                </span>
              </div>
            )}
          </div>

          {/* Section 1.5: Schedule Type Policy */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Schedule Configuration Policy
              </label>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--primary)" }}>
                {schedulePolicy}
              </span>
            </div>
            <select
              className="input"
              value={schedulePolicy}
              onChange={(e) => setSchedulePolicy(e.target.value as ScheduleTypePolicy)}
            >
              <option value="configurable">Configurable by School Admin (Toggle in SIMS Settings)</option>
              <option value="day_wise">Enforce Day-Wise (Separate Schedule for Mon-Sat, Everyday tab removed)</option>
              <option value="single_schedule">Enforce Single Schedule (Universal for All Days, day tabs hidden)</option>
            </select>
            <p style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
              {schedulePolicy === "configurable" && "The school can toggle between Day-Wise and Single Universal schedule."}
              {schedulePolicy === "day_wise" && "Locks SIMS to Day-Wise timetable mode. Settings toggle is disabled."}
              {schedulePolicy === "single_schedule" && "Locks SIMS to Single Universal schedule. Day tabs are completely hidden."}
            </p>
          </div>

          {/* Section 2: Module Gating */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Feature Modules Gating
              </label>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Checked = Visible & Enabled</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {AVAILABLE_MODULES.map((mod) => {
                const isEnabled = modules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.6rem 0.85rem",
                      borderRadius: "0.65rem",
                      background: isEnabled ? "var(--primary-light)" : "var(--bg-subtle)",
                      border: `1px solid ${isEnabled ? "#c7d2fe" : "var(--border-subtle)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ color: isEnabled ? "var(--primary)" : "var(--text-dim)" }}>
                        {isEnabled ? <CheckSquare size={16} /> : <Square size={16} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.82rem", color: isEnabled ? "var(--text-main)" : "var(--text-muted)" }}>
                          {mod.label}
                        </strong>
                        <p style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>{mod.desc}</p>
                      </div>
                    </div>
                    <span className={`badge ${isEnabled ? "badge-active" : "badge-revoked"}`} style={{ fontSize: "0.6rem" }}>
                      {isEnabled ? "Enabled" : "Hidden"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Remote Broadcast */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Broadcast Alert to School Dashboard
            </label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Annual renewal due in 7 days. Please contact support."
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="button" onClick={handleSave} className="btn btn-primary" disabled={saving}>
              <Save size={13} />
              <span>{saving ? "Pushing Changes..." : "Push Instant Policy"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  Edit3,
  X,
  Save,
  CheckSquare,
  Square,
  Cpu,
  AlertCircle,
  ShieldAlert,
  Unlock
} from "lucide-react";
import type { SchoolClient, PlanType, LicenseStatus, ScheduleTypePolicy } from "../../types";
import { updateSchoolAndLicense } from "../../services/schoolService";
import { getSessionPrivateKey } from "../../services/cryptoService";

interface Props {
  school: SchoolClient | null;
  isOpen: boolean;
  onClose: () => void;
  onRequireKey: () => void;
  onSaved: () => void;
}

const AVAILABLE_MODULES = [
  { id: "fees", label: "Fee Management", desc: "Vouchers, Challans & Defaulters" },
  { id: "exams", label: "Exams & Datesheets", desc: "Marks Entry & Report Cards" },
  { id: "attendance", label: "Attendance & Biometrics", desc: "Student & Staff Attendance" },
  { id: "whatsapp", label: "WhatsApp Alerts", desc: "Automated SMS/WhatsApp Notices" },
  { id: "reports", label: "Reports & Gazettes", desc: "Advanced Analytics & Printing" }
];

export const EditSchoolModal: React.FC<Props> = ({
  school,
  isOpen,
  onClose,
  onRequireKey,
  onSaved
}) => {
  if (!isOpen || !school) return null;

  const [schoolName, setSchoolName] = useState(school.school_name || "");
  const [contactEmail, setContactEmail] = useState(school.contact_email || "");
  const [contactPhone, setContactPhone] = useState(school.contact_phone || "");
  const [plan, setPlan] = useState<PlanType>(school.plan || "standard");
  const [status, setStatus] = useState<LicenseStatus>(school.status || "active");
  const [schedulePolicy, setSchedulePolicy] = useState<ScheduleTypePolicy>(school.schedule_type_policy || "configurable");
  const [expiresDate, setExpiresDate] = useState(() => {
    try {
      return new Date(school.expires_at).toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  });
  const [modules, setModules] = useState<string[]>(school.enabled_modules || []);
  const [boundUuid, setBoundUuid] = useState<string | null>(
    school.telemetry?.bound_machine_uuid || null
  );
  const [broadcast, setBroadcast] = useState(school.broadcast_announcement || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const applyDatePreset = (daysToAdd: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    setExpiresDate(d.toISOString().split("T")[0]);
  };

  const handleClearHardwareLock = () => {
    setBoundUuid(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!schoolName.trim()) {
      setError("School name cannot be empty.");
      return;
    }

    const isCryptoChanged =
      status !== school.status ||
      new Date(expiresDate).toDateString() !== new Date(school.expires_at).toDateString();

    const privateKey = getSessionPrivateKey();
    if (isCryptoChanged && !privateKey) {
      setError("Changing license status or expiry date requires loading your RSA Private Key. Please click 'Load private.pem' at the top.");
      onRequireKey();
      return;
    }

    setSaving(true);
    try {
      const expiresIso = new Date(`${expiresDate}T23:59:59Z`).toISOString();
      await updateSchoolAndLicense(school, {
        school_name: schoolName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        plan,
        status,
        expires_at: expiresIso,
        enabled_modules: modules,
        schedule_type_policy: schedulePolicy,
        broadcast_announcement: broadcast.trim(),
        telemetry: {
          ...school.telemetry,
          bound_machine_uuid: boundUuid
        }
      });

      onSaved();
      onClose();
    } catch (err: any) {
      setError("Failed to save changes: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "42rem", maxHeight: "92vh", overflowY: "auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "0.65rem", background: "var(--primary-light)", color: "var(--primary)" }}>
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
                Edit School & License Customization
              </h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Target: <strong style={{ color: "var(--text-main)" }}>{school.school_name}</strong> ({school.id})
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", color: "var(--rose)", padding: "0.65rem 0.85rem", borderRadius: "0.6rem", fontSize: "0.78rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          {/* Section 1: Institution Details */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.9rem" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              Institution Details
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.7rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  School / Institute Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="e.g. Islamabad Model College for Boys G-6/3"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.7rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Contact Email
                  </label>
                  <input
                    type="email"
                    className="input"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="admin@school.edu.pk"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Plan & Expiry Date */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.9rem" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              Subscription Plan & Expiration
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "0.8rem", alignItems: "flex-start" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Assigned Plan
                </label>
                <select
                  className="input"
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanType)}
                >
                  <option value="trial">Trial (Evaluation)</option>
                  <option value="standard">Standard Edition</option>
                  <option value="premium">Premium Pro</option>
                  <option value="enterprise">Enterprise Unlimited</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  License Expiry Date
                </label>
                <input
                  type="date"
                  required
                  className="input mono"
                  value={expiresDate}
                  onChange={(e) => setExpiresDate(e.target.value)}
                />
                <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => applyDatePreset(30)} className="btn btn-sm btn-outline" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                    +30 Days
                  </button>
                  <button type="button" onClick={() => applyDatePreset(180)} className="btn btn-sm btn-outline" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                    +6 Mo
                  </button>
                  <button type="button" onClick={() => applyDatePreset(365)} className="btn btn-sm btn-outline" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                    +1 Year
                  </button>
                  <button type="button" onClick={() => applyDatePreset(1095)} className="btn btn-sm btn-outline" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                    +3 Years
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2.5: Schedule Type Policy */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.9rem" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              Schedule Configuration Policy
            </span>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                Enforce Timetable Mode
              </label>
              <select
                className="input"
                value={schedulePolicy}
                onChange={(e) => setSchedulePolicy(e.target.value as ScheduleTypePolicy)}
              >
                <option value="configurable">Configurable by School Admin (Allow Toggle in SIMS Settings)</option>
                <option value="day_wise">Enforce Day-Wise (Separate Schedule for Mon-Sat, Everyday tab removed)</option>
                <option value="single_schedule">Enforce Single Schedule (Universal for All Days, day tabs hidden)</option>
              </select>
              <p style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.3rem" }}>
                {schedulePolicy === "configurable" && "ℹ️ The school administrator is free to select Day-Wise or Single Universal in SIMS Settings."}
                {schedulePolicy === "day_wise" && "🔒 Locked to Day-Wise. SIMS Settings will show 'Enforced by License' badge and disable switching."}
                {schedulePolicy === "single_schedule" && "🔒 Locked to Single Universal. SIMS Settings will show 'Enforced by License' badge and disable switching."}
              </p>
            </div>
          </div>

          {/* Section 3: App Execution Status & Hardware Lock */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.75rem", padding: "0.9rem" }}>
            <span style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.6rem" }}>
              App Execution Mode & Hardware Binding
            </span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "0.8rem" }}>
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
                Killswitch
              </button>
            </div>

            {status === "revoked" && (
              <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", borderRadius: "0.5rem", padding: "0.5rem 0.7rem", fontSize: "0.72rem", color: "var(--rose)", marginBottom: "0.8rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                <ShieldAlert size={14} />
                <span>Killswitch Active: Client software on the school PC will lock immediately within 1 second.</span>
              </div>
            )}

            {/* Hardware Binding Lock Management */}
            <div style={{ background: "#ffffff", border: "1px solid var(--border-subtle)", borderRadius: "0.6rem", padding: "0.65rem 0.8rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Cpu size={14} color="var(--emerald)" />
                  <strong style={{ fontSize: "0.75rem", color: "var(--text-main)" }}>Bound Motherboard BIOS UUID:</strong>
                </div>
                {boundUuid ? (
                  <button
                    type="button"
                    onClick={handleClearHardwareLock}
                    className="btn btn-sm btn-outline"
                    style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", color: "var(--rose)", borderColor: "#fecaca" }}
                    title="Unlock machine binding so license can be activated on any PC"
                  >
                    <Unlock size={11} />
                    <span>Clear / Unlock Lock</span>
                  </button>
                ) : (
                  <span className="badge badge-active" style={{ fontSize: "0.62rem" }}>
                    Unbound (Available for any PC)
                  </span>
                )}
              </div>
              <input
                type="text"
                className="input mono"
                style={{ fontSize: "0.75rem" }}
                value={boundUuid || ""}
                onChange={(e) => setBoundUuid(e.target.value.trim() || null)}
                placeholder="Leave blank to allow any PC to bind on first sync"
              />
              <p style={{ fontSize: "0.68rem", color: "var(--text-dim)", marginTop: "0.25rem" }}>
                {boundUuid ? "🔒 Locked to this PC hardware. Click 'Clear / Unlock Lock' to allow transfer to a new PC." : "🔓 Machine lock is open. The next PC that connects will automatically claim and lock to this license."}
              </p>
            </div>
          </div>

          {/* Section 4: Feature Modules Customization */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.45rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Feature Modules Customization
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Checked = Enabled & Visible</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
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
                      padding: "0.55rem 0.75rem",
                      borderRadius: "0.6rem",
                      background: isEnabled ? "var(--primary-light)" : "var(--bg-subtle)",
                      border: `1px solid ${isEnabled ? "#c7d2fe" : "var(--border-subtle)"}`,
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ color: isEnabled ? "var(--primary)" : "var(--text-dim)" }}>
                        {isEnabled ? <CheckSquare size={15} /> : <Square size={15} />}
                      </div>
                      <div>
                        <strong style={{ fontSize: "0.78rem", color: isEnabled ? "var(--text-main)" : "var(--text-muted)" }}>
                          {mod.label}
                        </strong>
                        <p style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>{mod.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Broadcast Banner */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Broadcast Alert Banner to Client App
            </label>
            <input
              type="text"
              className="input"
              value={broadcast}
              onChange={(e) => setBroadcast(e.target.value)}
              placeholder="e.g. System maintenance scheduled this Sunday from 2 AM to 4 AM."
            />
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
            <button type="button" onClick={onClose} className="btn btn-outline" disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <Save size={13} />
              <span>{saving ? "Saving Changes..." : "Save & Sync Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

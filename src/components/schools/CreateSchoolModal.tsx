import React, { useState } from "react";
import { School, X, CheckSquare, Square } from "lucide-react";
import type { PlanType } from "../../types";
import { createUnifiedSchool } from "../../services/schoolService";
import { getSessionPrivateKey } from "../../services/cryptoService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onRequireKey: () => void;
  onRequire2FA: (actionTitle: string, callback: () => void) => void;
  onCreated: () => void;
}

const ALL_MODULES = [
  { id: "fees", label: "Fee Management", desc: "Invoices, Receipts & Defaulters" },
  { id: "exams", label: "Exams & Datesheets", desc: "Marks Entry & Report Cards" },
  { id: "attendance", label: "Attendance & Biometrics", desc: "Student & Staff Attendance" },
  { id: "whatsapp", label: "WhatsApp Alerts", desc: "Automated SMS/WhatsApp Notices" },
  { id: "reports", label: "Reports & Gazettes", desc: "Advanced Analytics & Printing" }
];

export const CreateSchoolModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onRequireKey,
  onRequire2FA,
  onCreated
}) => {
  const [schoolName, setSchoolName] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [plan, setPlan] = useState<PlanType>("standard");
  const [daysValid, setDaysValid] = useState(365);
  const [selectedModules, setSelectedModules] = useState<string[]>([
    "fees",
    "exams",
    "attendance",
    "whatsapp",
    "reports"
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const toggleModule = (modId: string) => {
    setSelectedModules((prev) =>
      prev.includes(modId) ? prev.filter((m) => m !== modId) : [...prev, modId]
    );
  };

  const handleNameChange = (name: string) => {
    setSchoolName(name);
    if (!schoolId || schoolId === generateSlug(schoolName)) {
      setSchoolId(generateSlug(name));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "_")
      .substring(0, 12);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!schoolName.trim() || !schoolId.trim()) {
      setError("Please fill in both School Name and School Code.");
      return;
    }

    if (!getSessionPrivateKey()) {
      onRequireKey();
      return;
    }

    // Require 2FA challenge before issuing new cryptographic license & token
    onRequire2FA(`Issue License & Token for ${schoolName}`, async () => {
      setLoading(true);
      try {
        await createUnifiedSchool({
          school_id: schoolId,
          school_name: schoolName,
          contact_email: contactEmail,
          plan,
          days_valid: daysValid,
          enabled_modules: selectedModules
        });
        onCreated();
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to create school license");
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "34rem", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ padding: "0.45rem", borderRadius: "0.65rem", background: "var(--primary-light)", color: "var(--primary)" }}>
              <School size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>Register School Institution</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Generates 1-Time Install Token & Signed RSA License</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", color: "var(--rose)", padding: "0.65rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              School Name
            </label>
            <input
              type="text"
              required
              className="input"
              placeholder="e.g. Islamabad Model College for Boys, G-6/2"
              value={schoolName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                School Code / Slug
              </label>
              <input
                type="text"
                required
                className="input mono"
                placeholder="IMCB_G62"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Subscription Plan
              </label>
              <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as PlanType)}>
                <option value="trial">Trial (15 Days)</option>
                <option value="standard">Standard (Core)</option>
                <option value="premium">Premium (All Features)</option>
                <option value="enterprise">Enterprise (Multi-Campus)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                License Duration
              </label>
              <select className="input" value={daysValid} onChange={(e) => setDaysValid(parseInt(e.target.value))}>
                <option value={15}>15 Days (Trial)</option>
                <option value={90}>3 Months (Quarterly)</option>
                <option value={180}>6 Months (Half-Yearly)</option>
                <option value={365}>1 Year (Annual)</option>
                <option value={730}>2 Years (Extended)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
                Contact Email (Optional)
              </label>
              <input
                type="email"
                className="input"
                placeholder="principal@school.edu.pk"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
              Licensed Features & Modules
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
              {ALL_MODULES.map((mod) => {
                const active = selectedModules.includes(mod.id);
                return (
                  <div
                    key={mod.id}
                    onClick={() => toggleModule(mod.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.45rem",
                      padding: "0.55rem 0.65rem",
                      borderRadius: "0.5rem",
                      background: active ? "var(--primary-light)" : "var(--bg-subtle)",
                      border: `1px solid ${active ? "#c7d2fe" : "var(--border-subtle)"}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <div style={{ color: active ? "var(--primary)" : "var(--text-dim)", marginTop: "0.1rem" }}>
                      {active ? <CheckSquare size={15} /> : <Square size={15} />}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: active ? "var(--text-main)" : "var(--text-muted)" }}>
                        {mod.label}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>
                        {mod.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Generating..." : "Issue Token & License"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

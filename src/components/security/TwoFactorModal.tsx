import React, { useState } from "react";
import { ShieldCheck, X, AlertCircle } from "lucide-react";
import { verifyMasterPin } from "../../services/securityService";

interface Props {
  isOpen: boolean;
  actionTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorModal: React.FC<Props> = ({
  isOpen,
  actionTitle,
  onClose,
  onSuccess
}) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifying(true);

    try {
      const isValid = await verifyMasterPin(pin);
      if (isValid) {
        setPin("");
        onSuccess();
      } else {
        setError("Incorrect Master PIN. (Default setup PIN is 123456)");
      }
    } catch {
      setError("Failed to verify PIN.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "26rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ padding: "0.45rem", borderRadius: "0.65rem", background: "var(--primary-light)", color: "var(--primary)" }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>Security Step-Up Guard</h3>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Confirm privileged action</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "0.65rem", padding: "0.65rem 0.85rem", marginBottom: "1rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700 }}>Requested Action:</span>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginTop: "0.15rem" }}>
            {actionTitle}
          </div>
        </div>

        {error && (
          <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", color: "var(--rose)", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.78rem", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              Master Security PIN
            </label>
            <input
              type="password"
              autoFocus
              required
              className="input mono"
              style={{ fontSize: "1.3rem", letterSpacing: "0.35rem", textAlign: "center" }}
              maxLength={8}
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
            <p style={{ fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.35rem", textAlign: "center" }}>
              Default setup PIN is <strong style={{ color: "var(--primary)" }}>123456</strong>
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={verifying}>
              {verifying ? "Verifying..." : "Authorize Action"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

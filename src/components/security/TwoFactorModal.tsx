import React, { useState } from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { verifyMasterPin } from "../../services/securityService";

interface Props {
  isOpen: boolean;
  actionTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TwoFactorModal: React.FC<Props> = ({ isOpen, actionTitle, onClose, onSuccess }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setVerifying(true);

    try {
      const isValid = await verifyMasterPin(pin.trim());
      if (isValid) {
        setPin("");
        onSuccess();
        onClose();
      } else {
        setError("Incorrect Master Security PIN. Action authorization denied.");
      }
    } catch (err: any) {
      setError(err.message || "Verification error");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "26rem" }}>
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "inline-flex", padding: "0.75rem", borderRadius: "1rem", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)", marginBottom: "0.75rem" }}>
            <ShieldCheck size={28} />
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700 }}>2FA Security Authorization</h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Enter Master PIN to authorize: <strong style={{ color: "var(--text-main)" }}>{actionTitle}</strong>
          </p>
        </div>

        {error && (
          <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.25)", color: "#fda4af", padding: "0.6rem 0.8rem", borderRadius: "0.75rem", fontSize: "0.75rem", marginBottom: "1rem", textAlign: "center" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ position: "relative" }}>
              <input
                type="password"
                className="input mono"
                autoFocus
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••••"
                style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.4em", padding: "0.6rem" }}
              />
              <Lock size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            </div>
            <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "0.5rem" }}>
              Default Master PIN: <strong>123456</strong> (configurable in settings)
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={verifying || pin.length < 4}>
              {verifying ? "Verifying..." : "Authorize"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

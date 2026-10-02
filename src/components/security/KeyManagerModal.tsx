import React, { useState } from "react";
import { KeyRound, CheckCircle2, X } from "lucide-react";
import { validatePrivateKey, setSessionPrivateKey } from "../../services/cryptoService";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const KeyManagerModal: React.FC<Props> = ({ isOpen, onClose, onKeySaved }) => {
  const [keyInput, setKeyInput] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
    setError("");
    const trimmed = keyInput.trim();
    if (!validatePrivateKey(trimmed)) {
      setError("Invalid Private Key format. Must contain 'BEGIN RSA PRIVATE KEY' or 'BEGIN PRIVATE KEY'.");
      return;
    }

    setSessionPrivateKey(trimmed);
    onKeySaved();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "32rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ padding: "0.45rem", borderRadius: "0.65rem", background: "var(--amber-light)", color: "var(--amber)" }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-main)" }}>Load RSA Private Key</h3>
              <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Stored exclusively in browser memory (RAM)</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
          Paste your <code className="mono" style={{ background: "var(--bg-subtle)", padding: "0.15rem 0.35rem", borderRadius: "0.3rem" }}>private.pem</code> contents below. This key is used to cryptographically sign tamper-proof licenses for schools.
        </p>

        {error && (
          <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", color: "var(--rose)", padding: "0.6rem 0.8rem", borderRadius: "0.5rem", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
            {error}
          </div>
        )}

        <textarea
          rows={7}
          className="input mono"
          style={{ fontSize: "0.72rem", resize: "vertical", color: "var(--text-main)", background: "var(--bg-subtle)" }}
          placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEowIBAAKCAQEA0t...&#10;-----END RSA PRIVATE KEY-----"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <CheckCircle2 size={14} />
            <span>Store Key in RAM</span>
          </button>
        </div>
      </div>
    </div>
  );
};

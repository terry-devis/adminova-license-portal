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
    setKeyInput("");
    onKeySaved();
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ padding: "0.5rem", borderRadius: "0.75rem", background: "rgba(99, 102, 241, 0.15)", color: "var(--primary)" }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Load RSA Cryptographic Key</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>In-memory cryptographic signing engine</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-dim)", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "0.75rem", padding: "0.75rem", marginBottom: "1rem", fontSize: "0.75rem", color: "#6ee7b7", display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
          <span>
            <strong>Zero-Knowledge Security:</strong> Your private key is stored strictly in this browser session's RAM. It is never transmitted across the network or saved in Firestore.
          </span>
        </div>

        {error && (
          <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.25)", color: "#fda4af", padding: "0.75rem", borderRadius: "0.75rem", fontSize: "0.8rem", marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
            Paste Contents of private.pem
          </label>
          <textarea
            className="input mono"
            rows={8}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEowIBAAKCAQEA0...&#10;-----END RSA PRIVATE KEY-----"
            style={{ resize: "vertical", fontSize: "0.75rem", lineHeight: 1.4 }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            Load Key into RAM
          </button>
        </div>
      </div>
    </div>
  );
};

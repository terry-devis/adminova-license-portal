import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  School,
  Search,
  KeyRound,
  Sparkles,
  Lock,
  AlertCircle
} from "lucide-react";
import { auth } from "./services/firebase";
import { subscribeToSchools } from "./services/schoolService";
import { getSessionPrivateKey } from "./services/cryptoService";
import type { SchoolClient } from "./types";
import { Navbar } from "./components/layout/Navbar";
import { SchoolCard } from "./components/schools/SchoolCard";
import { CreateSchoolModal } from "./components/schools/CreateSchoolModal";
import { RemoteControlModal } from "./components/schools/RemoteControlModal";
import { KeyManagerModal } from "./components/security/KeyManagerModal";
import { TwoFactorModal } from "./components/security/TwoFactorModal";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Data state
  const [schools, setSchools] = useState<SchoolClient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Security state
  const [hasPrivateKey, setHasPrivateKey] = useState(!!getSessionPrivateKey());

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [selectedSchoolForRemote, setSelectedSchoolForRemote] = useState<SchoolClient | null>(null);

  // 2FA Guard state
  const [twoFactorPrompt, setTwoFactorPrompt] = useState<{
    isOpen: boolean;
    actionTitle: string;
    callback: () => void;
  }>({
    isOpen: false,
    actionTitle: "",
    callback: () => {}
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToSchools((list) => {
      setSchools(list);
    });
    return () => unsub();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: any) {
      setLoginError(err.message || "Failed to sign in. Verify credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleRequire2FA = (actionTitle: string, callback: () => void) => {
    setTwoFactorPrompt({
      isOpen: true,
      actionTitle,
      callback
    });
  };

  // Filtered Schools
  const filteredSchools = schools.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.school_name.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.token?.token_string || "").toLowerCase().includes(q) ||
      (s.telemetry?.public_ip || "").toLowerCase().includes(q) ||
      (s.telemetry?.location || "").toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "active") return s.status === "active";
    if (statusFilter === "locked_readonly") return s.status === "locked_readonly";
    if (statusFilter === "revoked") return s.status === "revoked";
    if (statusFilter === "burned") return s.token?.status === "burned";
    if (statusFilter === "unused") return s.token?.status === "unused";
    return true;
  });

  // Stats calculation
  const totalSchools = schools.length;
  const activeCount = schools.filter((s) => s.status === "active").length;
  const lockedCount = schools.filter((s) => s.status === "locked_readonly" || s.status === "revoked").length;
  const onlineCount = schools.filter((s) => {
    if (!s.telemetry?.last_active_at) return false;
    const diffMin = (Date.now() - new Date(s.telemetry.last_active_at).getTime()) / (1000 * 60);
    return diffMin <= 60; // Active in last 60 minutes
  }).length;

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: "2.5rem", height: "2.5rem", borderRadius: "0.75rem", background: "var(--primary)", margin: "0 auto 1rem auto" }}></div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Initializing Secure Portal...</p>
        </div>
      </div>
    );
  }

  // Login View
  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div className="glass-card" style={{ maxWidth: "26rem", width: "100%", padding: "2rem" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <div style={{ width: "3rem", height: "3rem", borderRadius: "1rem", background: "linear-gradient(135deg, #6366f1, #06b6d4)", margin: "0 auto 1rem auto", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: "1.5rem", boxShadow: "0 6px 20px rgba(99,102,241,0.35)" }}>
              A
            </div>
            <h1 style={{ fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>Adminova Command Center</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>Universal School Licensing & Telemetry Portal</p>
          </div>

          {loginError && (
            <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid rgba(244, 63, 94, 0.25)", color: "#fda4af", padding: "0.75rem", borderRadius: "0.75rem", fontSize: "0.78rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <AlertCircle size={16} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                Admin Email
              </label>
              <input
                type="email"
                required
                className="input"
                placeholder="admin@adminova.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.35rem" }}>
                Password
              </label>
              <input
                type="password"
                required
                className="input"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem", marginTop: "0.5rem" }} disabled={loginLoading}>
              <Lock size={16} />
              {loginLoading ? "Authenticating..." : "Sign In to Command Center"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "1.5rem" }}>
            Protected by Cryptographic Tokenization & 2FA Step-Up
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Navbar */}
      <Navbar
        user={user}
        hasPrivateKey={hasPrivateKey}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenCreateSchool={() => setIsCreateModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: "80rem", width: "100%", margin: "0 auto", padding: "1.75rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* Warning if RSA key is not in memory */}
        {!hasPrivateKey && (
          <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", borderRadius: "1rem", padding: "0.85rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <KeyRound size={20} color="#f59e0b" />
              <div>
                <strong style={{ fontSize: "0.85rem", color: "#fcd34d" }}>RSA Private Key Not Loaded</strong>
                <p style={{ fontSize: "0.75rem", color: "rgba(253, 230, 138, 0.8)" }}>You must load private.pem once per browser session to generate new tokens or sign licenses.</p>
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setIsKeyModalOpen(true)} style={{ borderColor: "rgba(245, 158, 11, 0.4)", color: "#fcd34d" }}>
              Load Key into RAM
            </button>
          </div>
        )}

        {/* Top Metric Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "1rem" }}>
          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Total Schools</span>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, marginTop: "0.25rem" }}>{totalSchools}</div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Registered institutions</span>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#34d399", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Active Licenses</span>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#34d399", marginTop: "0.25rem" }}>{activeCount}</div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Fully authorized instances</span>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.7rem", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Online & Seen Today</span>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "var(--cyan)", marginTop: "0.25rem" }}>{onlineCount}</div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Active heartbeat pings</span>
          </div>

          <div className="glass-card" style={{ padding: "1rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#fda4af", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Locked / Suspended</span>
            <div style={{ fontSize: "1.65rem", fontWeight: 800, color: "#fda4af", marginTop: "0.25rem" }}>{lockedCount}</div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Read-only or revoked</span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, minWidth: "16rem" }}>
            <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
            <input
              type="text"
              className="input"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Search by school name, ID, IP address, city, or token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Status Filter Buttons */}
          <div style={{ display: "flex", gap: "0.4rem", background: "rgba(15, 23, 42, 0.7)", padding: "0.3rem", borderRadius: "0.75rem", border: "1px solid var(--border-subtle)" }}>
            {[
              { id: "all", label: "All" },
              { id: "active", label: "Active" },
              { id: "locked_readonly", label: "Read-Only" },
              { id: "revoked", label: "Revoked" },
              { id: "burned", label: "Installed" },
              { id: "unused", label: "Unused Tokens" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className="btn btn-sm"
                style={{
                  background: statusFilter === f.id ? "var(--primary)" : "transparent",
                  color: statusFilter === f.id ? "white" : "var(--text-muted)",
                  padding: "0.35rem 0.65rem"
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Schools Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(24rem, 1fr))", gap: "1.25rem" }}>
          {filteredSchools.map((s) => (
            <SchoolCard
              key={s.id}
              school={s}
              onOpenRemote={(target) => setSelectedSchoolForRemote(target)}
              onRequireKey={() => setIsKeyModalOpen(true)}
              onRequire2FA={handleRequire2FA}
              onActionComplete={() => {}}
            />
          ))}
        </div>

        {filteredSchools.length === 0 && (
          <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--text-dim)" }}>
            <School size={36} style={{ margin: "0 auto 1rem auto", opacity: 0.4 }} />
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>No Schools Found</h3>
            <p style={{ fontSize: "0.8rem", maxWidth: "24rem", margin: "0.5rem auto 1.5rem auto" }}>
              {searchQuery ? "No schools match your search query." : "No schools have been registered yet. Click 'Register School' above to issue your first unified token and license."}
            </p>
            <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
              <Sparkles size={16} />
              <span>Register First School</span>
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRequireKey={() => setIsKeyModalOpen(true)}
        onRequire2FA={handleRequire2FA}
        onCreated={() => {}}
      />

      <RemoteControlModal
        school={selectedSchoolForRemote}
        isOpen={!!selectedSchoolForRemote}
        onClose={() => setSelectedSchoolForRemote(null)}
        onRequire2FA={handleRequire2FA}
        onUpdated={() => {}}
      />

      <KeyManagerModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeySaved={() => setHasPrivateKey(true)}
      />

      <TwoFactorModal
        isOpen={twoFactorPrompt.isOpen}
        actionTitle={twoFactorPrompt.actionTitle}
        onClose={() => setTwoFactorPrompt((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={() => twoFactorPrompt.callback()}
      />
    </div>
  );
}

export default App;

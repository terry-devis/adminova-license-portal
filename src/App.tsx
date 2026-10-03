import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import type { User } from "firebase/auth";
import {
  Search,
  KeyRound,
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
import { EditSchoolModal } from "./components/schools/EditSchoolModal";
import { RemoteControlModal } from "./components/schools/RemoteControlModal";
import { KeyManagerModal } from "./components/security/KeyManagerModal";
import { TwoFactorModal } from "./components/security/TwoFactorModal";
import { UserManagement } from "./components/users/UserManagement";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Nav state
  const [activeNavTab, setActiveNavTab] = useState<"schools" | "users">("schools");

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
  const [selectedSchoolForEdit, setSelectedSchoolForEdit] = useState<SchoolClient | null>(null);

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

  // Filter & Search Logic
  const filteredSchools = schools.filter((school) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      school.school_name.toLowerCase().includes(q) ||
      school.id.toLowerCase().includes(q) ||
      (school.license?.key && school.license.key.toLowerCase().includes(q)) ||
      (school.token?.token_string && school.token.token_string.toLowerCase().includes(q)) ||
      (school.telemetry?.public_ip && school.telemetry.public_ip.toLowerCase().includes(q)) ||
      (school.telemetry?.hostname && school.telemetry.hostname.toLowerCase().includes(q)) ||
      (school.telemetry?.location && school.telemetry.location.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "legacy") return school.is_legacy || school.is_legacy_token;
    if (statusFilter === "burned") return school.token?.status === "burned";
    if (statusFilter === "unused") return school.token?.status === "unused";
    return school.status === statusFilter;
  });

  // Calculate Metrics
  const totalSchools = schools.length;
  const activeCount = schools.filter((s) => s.status === "active").length;
  const lockedCount = schools.filter((s) => s.status === "locked_readonly" || s.status === "revoked").length;
  const onlineCount = schools.filter((s) => {
    if (!s.telemetry?.last_active_at) return false;
    const diffMs = Date.now() - new Date(s.telemetry.last_active_at).getTime();
    return diffMs < 60 * 60 * 1000;
  }).length;

  if (authLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-base)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
          <div className="spin" style={{ width: "2rem", height: "2rem", borderRadius: "50%", border: "3px solid var(--border-subtle)", borderTopColor: "var(--primary)" }} />
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Loading licensing portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", background: "var(--bg-base)" }}>
        <div className="glass-card" style={{ maxWidth: "24rem", width: "100%", padding: "2rem", background: "#ffffff", boxShadow: "var(--shadow-xl)" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ width: "3rem", height: "3rem", borderRadius: "0.75rem", background: "linear-gradient(135deg, #4f46e5, #0284c7)", margin: "0 auto 0.75rem auto", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "white", fontSize: "1.5rem", boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)" }}>
              A
            </div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-main)", letterSpacing: "-0.02em" }}>Adminova Portal</h1>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Central School Licensing & Telemetry</p>
          </div>

          {loginError && (
            <div style={{ background: "var(--rose-light)", border: "1px solid #fecaca", color: "var(--rose)", padding: "0.65rem 0.85rem", borderRadius: "0.5rem", fontSize: "0.78rem", marginBottom: "1.25rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <AlertCircle size={15} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
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
              <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.3rem" }}>
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

            <button type="submit" className="btn btn-primary" style={{ padding: "0.7rem", marginTop: "0.35rem" }} disabled={loginLoading}>
              <Lock size={15} />
              {loginLoading ? "Authenticating..." : "Sign In to Portal"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "var(--text-dim)", marginTop: "1.25rem" }}>
            Protected by Cryptographic Tokenization & 2FA Guard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-base)" }}>
      {/* Navbar */}
      <Navbar
        user={user}
        hasPrivateKey={hasPrivateKey}
        activeNavTab={activeNavTab}
        onSelectNavTab={setActiveNavTab}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenCreateSchool={() => setIsCreateModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <main style={{ maxWidth: "82rem", width: "100%", margin: "0 auto", padding: "1.5rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        
        {/* Warning if RSA key is not in memory */}
        {!hasPrivateKey && (
          <div style={{ background: "var(--amber-light)", border: "1px solid #fde68a", borderRadius: "0.75rem", padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <KeyRound size={18} color="var(--amber)" />
              <div>
                <strong style={{ fontSize: "0.82rem", color: "var(--amber)" }}>RSA Private Key Not Loaded</strong>
                <p style={{ fontSize: "0.75rem", color: "#92400e" }}>You must load private.pem once per browser session to generate new tokens or sign licenses.</p>
              </div>
            </div>
            <button className="btn btn-sm btn-outline" onClick={() => setIsKeyModalOpen(true)} style={{ borderColor: "#fde68a", color: "var(--amber)" }}>
              Load Key into RAM
            </button>
          </div>
        )}

        {/* TAB 1: SCHOOLS & LICENSES */}
        {activeNavTab === "schools" && (
          <>
            {/* Top Metric Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(13rem, 1fr))", gap: "0.85rem" }}>
              <div className="glass-card" style={{ padding: "0.9rem 1.1rem" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Total Records</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)", marginTop: "0.2rem" }}>{totalSchools}</div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Merged Firestore records</span>
              </div>

              <div className="glass-card" style={{ padding: "0.9rem 1.1rem" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--emerald)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Active Licenses</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--emerald)", marginTop: "0.2rem" }}>{activeCount}</div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Authorized school sites</span>
              </div>

              <div className="glass-card" style={{ padding: "0.9rem 1.1rem" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--cyan)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Online Heartbeat</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--cyan)", marginTop: "0.2rem" }}>{onlineCount}</div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Active in last hour</span>
              </div>

              <div className="glass-card" style={{ padding: "0.9rem 1.1rem" }}>
                <span style={{ fontSize: "0.68rem", color: "var(--rose)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Locked / Suspended</span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--rose)", marginTop: "0.2rem" }}>{lockedCount}</div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-dim)" }}>Read-only or revoked</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              {/* Search Input */}
              <div style={{ position: "relative", flex: 1, minWidth: "16rem" }}>
                <Search size={15} style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: "2.3rem" }}
                  placeholder="Search by school name, ID, license key, IP, or token..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: "flex", gap: "0.3rem", background: "var(--bg-subtle)", padding: "0.25rem", borderRadius: "0.65rem", border: "1px solid var(--border-subtle)", flexWrap: "wrap" }}>
                {[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "legacy", label: "Existing Firebase" },
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
                      background: statusFilter === f.id ? "#ffffff" : "transparent",
                      color: statusFilter === f.id ? "var(--primary)" : "var(--text-muted)",
                      boxShadow: statusFilter === f.id ? "var(--shadow-sm)" : "none",
                      border: statusFilter === f.id ? "1px solid var(--border-subtle)" : "1px solid transparent",
                      padding: "0.3rem 0.6rem"
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* School Client Cards Grid */}
            {filteredSchools.length === 0 ? (
              <div className="glass-card" style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  {searchQuery ? "No schools matched your search criteria." : "No school licenses or tokens found. Register your first school to begin."}
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(23rem, 1fr))", gap: "1rem" }}>
                {filteredSchools.map((school) => (
                  <SchoolCard
                    key={school.id}
                    school={school}
                    onOpenRemote={(s) => setSelectedSchoolForRemote(s)}
                    onEdit={(s) => setSelectedSchoolForEdit(s)}
                    onRequireKey={() => setIsKeyModalOpen(true)}
                    onRequire2FA={handleRequire2FA}
                    onActionComplete={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB 2: USER & ACCESS MANAGEMENT */}
        {activeNavTab === "users" && (
          <UserManagement
            currentUser={user}
            schools={schools}
            onRequire2FA={handleRequire2FA}
          />
        )}

      </main>

      {/* MODALS */}
      <CreateSchoolModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => setIsCreateModalOpen(false)}
        onRequireKey={() => setIsKeyModalOpen(true)}
        onRequire2FA={handleRequire2FA}
      />

      <EditSchoolModal
        school={selectedSchoolForEdit}
        isOpen={!!selectedSchoolForEdit}
        onClose={() => setSelectedSchoolForEdit(null)}
        onRequireKey={() => setIsKeyModalOpen(true)}
        onSaved={() => setSelectedSchoolForEdit(null)}
      />

      <RemoteControlModal
        school={selectedSchoolForRemote}
        isOpen={!!selectedSchoolForRemote}
        onClose={() => setSelectedSchoolForRemote(null)}
        onRequire2FA={handleRequire2FA}
        onUpdated={() => setSelectedSchoolForRemote(null)}
      />

      <KeyManagerModal
        isOpen={isKeyModalOpen}
        onClose={() => {
          setIsKeyModalOpen(false);
          setHasPrivateKey(!!getSessionPrivateKey());
        }}
        onKeySaved={() => {
          setIsKeyModalOpen(false);
          setHasPrivateKey(true);
        }}
      />

      <TwoFactorModal
        isOpen={twoFactorPrompt.isOpen}
        actionTitle={twoFactorPrompt.actionTitle}
        onClose={() => setTwoFactorPrompt((p) => ({ ...p, isOpen: false }))}
        onSuccess={() => {
          setTwoFactorPrompt((p) => ({ ...p, isOpen: false }));
          twoFactorPrompt.callback();
        }}
      />
    </div>
  );
}

export default App;

// Type definitions for SIMS Central Licensing & Telemetry Portal

export type LicenseStatus = 'active' | 'locked_readonly' | 'revoked' | 'expired';

export type PlanType = 'trial' | 'standard' | 'premium' | 'enterprise';

export interface SchoolClient {
  id: string; // School Slug/Code (e.g. 'APS-ISB')
  school_name: string;
  contact_email?: string;
  contact_phone?: string;
  plan: PlanType;
  expires_at: string; // ISO string
  status: LicenseStatus;
  enabled_modules: string[]; // e.g. ['fees', 'exams', 'attendance', 'whatsapp', 'reports']
  broadcast_announcement?: string;
  config_version: number; // Increments to trigger instant real-time sync on client
  is_legacy?: boolean; // True if loaded from legacy 'licenses' collection
  is_legacy_token?: boolean; // True if loaded from legacy 'install_tokens' collection
  token: {
    token_string: string; // e.g. 'SIMS-TOK-APS-ISB-8F2K'
    status: 'unused' | 'burned' | 'used';
    burned_at: string | null;
  };
  license: {
    key: string; // e.g. 'LIC-SIMS-APS-ISB-48F1-A892'
    rsa_signature: string;
    last_synced_at: string | null;
    installed_version?: string;
  };
  telemetry: {
    bound_machine_uuid: string | null;
    public_ip: string | null;
    location: string | null;
    isp: string | null;
    hostname: string | null;
    last_active_at: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface PortalAdminUser {
  uid: string;
  email: string;
  role: 'super_admin' | 'operator' | 'viewer';
  created_at?: string;
  last_login?: string;
  is_current_user?: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  user_email: string;
  target_school?: string;
  timestamp: string;
  details?: string;
}

export interface SecurityConfig {
  hasMasterPin: boolean;
  isUnlockedForSession: boolean;
  rsaKeyLoaded: boolean;
}

/**
 * VectorNet Frontend Shared Type Definitions
 * ===========================================
 * Core TypeScript interfaces for UI state, user roles, findings, and navigation.
 */

export type Role = 'SUPER_ADMIN' | 'SECURITY_AUDITOR' | 'NETWORK_OPERATOR' | 'VIEWER';

export interface UserProfile {
  uid: string;
  email: string;
  display_name: string;
  role: Role;
  team_id: string;
}

export type NavTab = 
  | 'ingestion' 
  | 'overview' 
  | 'auditor' 
  | 'workbench' 
  | 'remediation' 
  | 'reports' 
  | 'tasks' 
  | 'skills'
  | 'settings';

export type ComplianceStatus = 'PASS' | 'FAIL' | 'WARNING' | 'UNKNOWN' | 'NOT_APPLICABLE' | 'ERROR';
export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface AuditFinding {
  rule_id: string;
  framework: string;
  control_ref: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: ComplianceStatus;
  observed_value: string;
  required_value: string;
  line_start?: number;
  line_end?: number;
  parser_confidence?: string;
  rule_pack_version?: string;
  remediation_cli?: {
    script?: string;
    rollback?: string;
    verification_cmd?: string;
    prerequisites?: string;
    warning?: string;
  };
  rollback_cli?: string;
}

export interface SecurityBaselineModel {
  device_metadata: {
    hostname: string;
    vendor: string;
    os_version: string;
    device_type: string;
  };
  authentication_security: {
    ssh_version: number;
    telnet_enabled: boolean;
    exec_timeout_seconds: number;
    password_encryption_types: string[];
  };
  access_control: {
    management_acl_applied: boolean;
    login_block_failed_attempts: boolean;
  };
  evidence_spans?: Record<string, any>;
  source_hash?: string;
  unmapped_cli_commands?: string[];
}

export interface BlockchainAuditRecord {
  tx_hash: string;
  block_number: number;
  contract_address: string;
  config_hash: string;
  findings_merkle_root: string;
  compliance_score: number;
  hostname: string;
  vendor: string;
  auditor_address: string;
  timestamp: string;
  status: string;
  network: string;
  explorer_url: string;
}

export interface ComplianceSummary {
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warning_checks: number;
  unknown_checks: number;
  not_applicable_checks: number;
  compliance_score: number;
  findings: AuditFinding[];
  sbm: SecurityBaselineModel;
  telemetry_logs_evaluated: number;
  rule_pack_version: string;
  blockchain_record?: BlockchainAuditRecord;
}

export interface DeviceAsset {
  device_id: string;
  hostname: string;
  vendor: string;
  model_number: string;
  os_version: string;
  serial_number: string;
  ip_address: string;
  device_type: string;
  interfaces_status: Array<{ name: string; status: string; ip: string }>;
  management_protocols: string[];
  compliance_score: number;
  last_audited: string;
}

export interface UnifiedJsonLog {
  timestamp: string;
  device_id: string;
  hostname: string;
  vendor: string;
  log_level: string;
  category: string;
  raw_message: string;
  parsed_data: Record<string, any>;
}

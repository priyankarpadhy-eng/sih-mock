from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class DeviceType(str, Enum):
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    VOIP_GATEWAY = "voip_gateway"
    SASE = "sase"
    CLOUD_SG = "cloud_sg"
    WHITEBOX = "whitebox"

class PasswordHashing(str, Enum):
    SHA256 = "sha256"
    MD5 = "md5"
    TYPE_7 = "type_7"
    PLAINTEXT = "plaintext"
    UNKNOWN = "unknown"

class SnmpVersion(str, Enum):
    V1 = "v1"
    V2C = "v2c"
    V3 = "v3"
    DISABLED = "disabled"

class DeviceMetadata(BaseModel):
    hostname: str = "unknown-device"
    vendor: str = "Generic / Unrecognized"
    os_version: str = "Unknown"
    device_type: str = "router"

class AuthenticationSecurity(BaseModel):
    ssh_version: int = 1
    telnet_enabled: bool = True
    exec_timeout_seconds: int = 0
    password_encryption_types: List[str] = Field(default_factory=list)

class AccessControl(BaseModel):
    management_acl_applied: bool = False
    login_block_failed_attempts: bool = False

# Backward compatibility models for legacy API views
class AuthenticationAndAccess(BaseModel):
    ssh_enabled: bool = False
    ssh_version: int = 1
    telnet_enabled: bool = True
    http_management_enabled: bool = True
    https_management_enabled: bool = False
    exec_timeout_seconds: int = 0
    login_banner_configured: bool = False

class AccountSecurity(BaseModel):
    default_accounts_disabled: bool = False
    password_min_length: int = 0
    password_hashing_algorithm: PasswordHashing = PasswordHashing.PLAINTEXT
    mfa_configured: bool = False

class NetworkAndServices(BaseModel):
    snmp_version: SnmpVersion = SnmpVersion.V1
    snmp_read_community_default: bool = True
    logging_syslog_enabled: bool = False
    ntp_servers_configured: bool = False

class SecurityBaselineModel(BaseModel):
    device_metadata: DeviceMetadata
    authentication_security: AuthenticationSecurity
    access_control: AccessControl
    unmapped_cli_commands: List[str] = Field(default_factory=list)
    evidence_spans: Dict[str, Any] = Field(default_factory=dict)
    source_hash: Optional[str] = None
    
    # Backward compatibility optional sections
    authentication_and_access: Optional[AuthenticationAndAccess] = None
    account_security: Optional[AccountSecurity] = None
    network_and_services: Optional[NetworkAndServices] = None

class DeviceAsset(BaseModel):
    device_id: str
    hostname: str
    vendor: str
    model_number: str
    os_version: str
    serial_number: str
    ip_address: str
    device_type: str
    interfaces_status: List[Dict[str, str]]
    management_protocols: List[str]
    compliance_score: float
    last_audited: str

class UnifiedJsonLog(BaseModel):
    timestamp: str
    device_id: str
    hostname: str
    vendor: str
    log_level: str
    category: str
    raw_message: str
    parsed_data: Dict[str, Any]

class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"

class ComplianceStatus(str, Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    WARNING = "WARNING"
    UNKNOWN = "UNKNOWN"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    ERROR = "ERROR"

class AuditFinding(BaseModel):
    rule_id: str
    framework: str
    control_ref: str
    title: str
    description: str
    severity: SeverityLevel
    status: ComplianceStatus
    observed_value: str
    required_value: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    parser_confidence: Optional[str] = "HIGH"
    rule_pack_version: Optional[str] = "2026.1-OSCAL"
    remediation_cli: Optional[Dict[str, Any]] = None
    rollback_cli: Optional[str] = None

class ComplianceSummary(BaseModel):
    total_checks: int
    passed_checks: int
    failed_checks: int
    warning_checks: int
    unknown_checks: int = 0
    not_applicable_checks: int = 0
    compliance_score: float
    findings: List[AuditFinding]
    sbm: SecurityBaselineModel
    telemetry_logs_evaluated: int = 0
    rule_pack_version: str = "2026.1-OSCAL"

class VectorMappingRequest(BaseModel):
    raw_command: str
    mapped_category: str
    parsed_value: Any = 0
    vendor_context: str = "generic"

class VectorMappingResponse(BaseModel):
    status: str
    vector_id: str
    raw_command: str
    mapped_category: str
    parsed_value: Any
    confidence_score: float

class AuditLogEntry(BaseModel):
    id: str
    user_id: str
    user_role: str
    action: str
    timestamp: str
    ip_address: str
    details: Dict[str, Any]

class TrainRuleRequest(BaseModel):
    vendor: str
    cli_snippet: str
    target_sbm_key: str
    description: Optional[str] = ""
    user_uid: Optional[str] = "FIREBASE_UID_SUPERADMIN_01"


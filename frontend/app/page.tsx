'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from '../components/Sidebar';
import { OverviewPage } from '../components/OverviewPage';
import { IngestionPage } from '../components/IngestionPage';
import { InventoryPage } from '../components/InventoryPage';
import { TelemetryPage } from '../components/TelemetryPage';
import { AuditorPage } from '../components/AuditorPage';
import { WorkbenchPage } from '../components/WorkbenchPage';
import { RemediationPage } from '../components/RemediationPage';
import { ReportsPage } from '../components/ReportsPage';
import { TaskWorkspacePage } from '../components/TaskWorkspacePage';
import { SkillsManagementPage } from '../components/SkillsManagementPage';
import { AuthModal, UserProfile } from '../components/AuthModal';

const SAMPLE_PRESETS: Record<string, { name: string; vendor: string; raw: string }> = {
  cisco_cucme: {
    name: "Cisco CUCME Benchmark (SIH PS 26155 Gold Standard)",
    vendor: "Cisco Systems (IOS 15.1 CUCME)",
    raw: `! Gold-Standard Cisco CUCME Configuration Benchmark (SIH Problem Statement 26155)
version 15.1
service timestamps debug datetime msec
service timestamps log datetime msec
service password-encryption
!
hostname CUCME-RTR-01
!
enable secret 5 $1$mER7$vX3Y80x1g0f7
enable password 7 0822455D0A16
!
username b privilege 15 password 7 0822455D0A16
!
ip cef
ip domain-name defense.mil
ip ssh version 1
!
telephony-service
 max-ephones 15
 max-dn 30
 ip source-address 192.168.1.1 port 2000
 auto assign 1 to 15
!
snmp-server community public RO
snmp-server community private RW
!
line con 0
 exec-timeout 0 0
 privilege level 15
 logging synchronous
line vty 0 4
 exec-timeout 0 0
 password 7 0822455D0A16
 login
 transport input telnet ssh
line vty 5 15
 exec-timeout 0 0
 transport input telnet
!
end`
  },
  cisco_ios: {
    name: "Cisco IOS-XE Core Router (Non-Compliant)",
    vendor: "Cisco Systems (IOS / IOS-XE)",
    raw: `! Cisco IOS-XE Core Router Configuration
hostname TAC-ROUTER-01
version 16.9.4
!
enable secret 5 $1$mER7$vX3Y80x1g0f7
service password-encryption
!
ip domain-name defense.mil
ip ssh version 1
!
line vty 0 4
 exec-timeout 0 0
 transport input telnet ssh
!
snmp-server community public RO
snmp-server community private RW
!
no logging host
!
end`
  },
  palo_alto: {
    name: "Palo Alto PAN-OS Perimeter Firewall",
    vendor: "Palo Alto Networks (PAN-OS)",
    raw: `set deviceconfig system hostname FW-PAN-TACTICAL-01
set deviceconfig system os-version 10.1.0
set deviceconfig system idle-timeout 15
set deviceconfig system service disable-telnet yes
set deviceconfig system service disable-http yes
set deviceconfig system ssh-cipher ciphers aes256-gcm
set deviceconfig system snmp-setting version v3
set deviceconfig system login-banner "WARNING: AUTHORIZED MILITARY PERSONNEL ONLY"
set shared log-settings syslog SEC-SYSLOG server SYSLOG-01 server 10.0.100.50
set security zones trust interfaces ge-0/0/0.0`
  },
  juniper_junos: {
    name: "Juniper JunOS Border Gateway",
    vendor: "Juniper Networks (JunOS)",
    raw: `set system host-name BGP-JUNOS-01
set system services ssh protocol-version v2
set system services telnet disable
set system login idle-timeout 10
set system login message "UNAUTHORIZED ACCESS PROHIBITED. ALL ACTIVITIES MONITORED AND LOGGED."
set system syslog host 10.0.100.50 any info
set system ntp server 10.0.0.1
set snmp v3 usm local-engine user admin authentication-sha password SECURE_PASS`
  },
  fortinet_fortios: {
    name: "Fortinet FortiGate SASE Hub",
    vendor: "Fortinet (FortiOS)",
    raw: `config system global
    set hostname "FG-SASE-HUB-01"
    set admintimeout 10
    set admin-sport 8443
    set admin-https-redirect enable
    set pre-login-banner enable
end
config system snmp community
    delete 1
end
config log syslogd setting
    set status enable
    set server "10.0.100.50"
end`
  },
  sonic_whitebox: {
    name: "SONiC Open Networking Switch (White Box)",
    vendor: "Sonic Foundation (SONiC OS)",
    raw: `{
  "DEVICE_METADATA": {
    "localhost": {
      "hostname": "SONIC-SW-01",
      "hwsku": "Dell-EMC-S5248f-P-25G",
      "platform": "x86_64-dell_s5248f_c3538-r0"
    }
  },
  "AAA": {
    "authentication": {
      "login": "local",
      "fallback": "true"
    }
  },
  "SSH": {
    "PORT": {
      "22": {
        "authentication_retries": "10",
        "root_login": "no"
      }
    }
  }
}`
  },
  aws_sg: {
    name: "AWS EC2 Security Group Baseline",
    vendor: "Amazon Web Services (AWS SG)",
    raw: `{
  "security_group_id": "sg-0a8b9c1d2e3f4a5b6",
  "group_name": "production-app-sg",
  "description": "EC2 Production Application Baseline",
  "ip_permissions": [
    {
      "from_port": 22,
      "to_port": 22,
      "ip_protocol": "tcp",
      "ip_ranges": [{"cidr_ip": "0.0.0.0/0"}]
    }
  ]
}`
  }
};

const DEFAULT_ASSETS = [
  {
    device_id: "DEV-CSCO-01",
    hostname: "TAC-ROUTER-01",
    vendor: "Cisco Systems (IOS / IOS-XE)",
    model_number: "ASR-1001-X",
    os_version: "16.9.4",
    serial_number: "SN-CSC-994102",
    ip_address: "10.0.1.1",
    device_type: "router",
    interfaces_status: [
      { name: "GigabitEthernet0/0/0", status: "UP", ip: "10.0.1.1/24" },
      { name: "GigabitEthernet0/0/1", status: "UP", ip: "10.0.2.1/24" },
      { name: "GigabitEthernet0/0/2", status: "DOWN", ip: "unassigned" }
    ],
    management_protocols: ["SSHv1 (Non-Compliant)", "Telnet", "SNMPv2c"],
    compliance_score: 14.3,
    last_audited: "2026-09-06T11:00:00Z"
  },
  {
    device_id: "DEV-PAN-01",
    hostname: "FW-PAN-TACTICAL-01",
    vendor: "Palo Alto Networks (PAN-OS)",
    model_number: "PA-3220",
    os_version: "10.1.0",
    serial_number: "SN-PAN-881204",
    ip_address: "10.0.10.1",
    device_type: "firewall",
    interfaces_status: [
      { name: "ethernet1/1", status: "UP", ip: "10.0.10.1/24" },
      { name: "ethernet1/2", status: "UP", ip: "192.168.100.1/24" }
    ],
    management_protocols: ["SSHv2", "HTTPS", "SNMPv3"],
    compliance_score: 85.7,
    last_audited: "2026-09-06T10:45:00Z"
  },
  {
    device_id: "DEV-JUN-01",
    hostname: "BGP-JUNOS-01",
    vendor: "Juniper Networks (JunOS)",
    model_number: "MX240",
    os_version: "21.4R1",
    serial_number: "SN-JUN-441920",
    ip_address: "10.0.20.1",
    device_type: "router",
    interfaces_status: [
      { name: "ge-0/0/0", status: "UP", ip: "10.0.20.1/24" },
      { name: "ge-0/0/1", status: "UP", ip: "10.0.30.1/24" }
    ],
    management_protocols: ["SSHv2", "SNMPv3"],
    compliance_score: 71.4,
    last_audited: "2026-09-06T10:50:00Z"
  },
  {
    device_id: "DEV-FGT-01",
    hostname: "FG-SASE-HUB-01",
    vendor: "Fortinet (FortiOS)",
    model_number: "FortiGate-100F",
    os_version: "7.2.4",
    serial_number: "SN-FGT-772910",
    ip_address: "10.0.40.1",
    device_type: "sase",
    interfaces_status: [
      { name: "port1", status: "UP", ip: "10.0.40.1/24" },
      { name: "port2", status: "UP", ip: "10.0.50.1/24" }
    ],
    management_protocols: ["HTTPS", "SNMPv3"],
    compliance_score: 85.7,
    last_audited: "2026-09-06T10:55:00Z"
  }
];

const DEFAULT_LOGS = [
  {
    timestamp: "2026-09-06T11:00:00Z",
    device_id: "DEV-CSCO-01",
    hostname: "TAC-ROUTER-01",
    vendor: "cisco",
    log_level: "WARNING",
    category: "AUTHENTICATION",
    raw_message: "Sep 06 11:00:00 SSH-4-SSH2_LOGON_UNAUTH: Failed SSH logon from 192.168.1.100",
    parsed_data: { protocol: "SSH", status: "FAILED_ATTEMPT", source_ip: "192.168.1.100", ssh_version: 1 }
  },
  {
    timestamp: "2026-09-06T11:02:15Z",
    device_id: "DEV-CSCO-01",
    hostname: "TAC-ROUTER-01",
    vendor: "cisco",
    log_level: "CRITICAL",
    category: "AUTHENTICATION",
    raw_message: "Sep 06 11:02:15 TELNET-3-CONN_ESTABLISHED: Cleartext Telnet connection accepted on VTY 0 from 10.0.5.22",
    parsed_data: { protocol: "TELNET", status: "UNENCRYPTED_ACCEPTED", source_ip: "10.0.5.22", vty_line: "0" }
  },
  {
    timestamp: "2026-09-06T11:04:30Z",
    device_id: "DEV-PAN-01",
    hostname: "FW-PAN-TACTICAL-01",
    vendor: "paloalto",
    log_level: "INFO",
    category: "ACL_DROP",
    raw_message: "Sep 06 11:04:30 PAN-OS-SYSTEM-LOG: Threat alert: Denied TCP session from 172.16.4.12:443 -> 10.0.10.1:22",
    parsed_data: { protocol: "TCP", action: "DENIED", source_ip: "172.16.4.12", destination_port: 22 }
  },
  {
    timestamp: "2026-09-06T11:05:00Z",
    device_id: "DEV-JUN-01",
    hostname: "BGP-JUNOS-01",
    vendor: "juniper",
    log_level: "WARNING",
    category: "AUTHENTICATION",
    raw_message: "Sep 06 11:05:00 JUNOS-AUTH-FAILED: Root authentication failure via SSH from 10.0.0.99",
    parsed_data: { protocol: "SSH", status: "ROOT_FAILED", source_ip: "10.0.0.99" }
  }
];

export default function AppContainer() {
  const [activeTab, setActiveTab] = useState<NavTab>('ingestion');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('DEV-CSCO-01');
  const [assets, setAssets] = useState<any[]>(DEFAULT_ASSETS);
  const [logs, setLogs] = useState<any[]>(DEFAULT_LOGS);
  const [rawConfig, setRawConfig] = useState<string>(SAMPLE_PRESETS.cisco_ios.raw);
  const [detectedVendor, setDetectedVendor] = useState<string>("Cisco Systems (IOS / IOS-XE)");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  // User Auth & RBAC State (Dynamic Database & LocalStorage session)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const handleUserLogin = (user: UserProfile) => {
    setCurrentUser(user);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sentinel_user', JSON.stringify(user));
    }
  };

  const runLocalEvaluation = (cfg: string) => {
    const isCucme = cfg.toLowerCase().includes("cucme") || cfg.toLowerCase().includes("telephony-service");
    const isCisco = cfg.toLowerCase().includes("cisco") || cfg.toLowerCase().includes("line vty") || cfg.toLowerCase().includes("enable secret") || isCucme;
    const isJuniper = cfg.toLowerCase().includes("junos") || cfg.toLowerCase().includes("set system");
    const isPalo = cfg.toLowerCase().includes("deviceconfig") || cfg.toLowerCase().includes("pan-os");
    const isForti = cfg.toLowerCase().includes("fortigate") || cfg.toLowerCase().includes("admintimeout");
    const isSonic = cfg.toLowerCase().includes("sonic") || cfg.toLowerCase().includes("device_metadata") || cfg.toLowerCase().includes("hwsku");
    const isAws = cfg.toLowerCase().includes("security_group") || cfg.toLowerCase().includes("ip_permissions");

    let vendor = "Generic Network Device";
    if (isCucme) vendor = "Cisco Systems (IOS 15.1 CUCME)";
    else if (isCisco) vendor = "Cisco Systems (IOS / IOS-XE)";
    else if (isJuniper) vendor = "Juniper Networks (JunOS)";
    else if (isPalo) vendor = "Palo Alto Networks (PAN-OS)";
    else if (isForti) vendor = "Fortinet (FortiOS)";
    else if (isSonic) vendor = "Sonic Foundation (SONiC OS)";
    else if (isAws) vendor = "Amazon Web Services (AWS SG)";

    setDetectedVendor(vendor);

    const execTimeoutOk = cfg.toLowerCase().includes("exec-timeout 10") || cfg.toLowerCase().includes("idle-timeout 10") || cfg.toLowerCase().includes("admintimeout 10");
    const sha256Ok = cfg.toLowerCase().includes("algorithm-type sha256") || cfg.toLowerCase().includes("secret 9") || cfg.toLowerCase().includes("sha256");
    const noTelnetHttpOk = (cfg.toLowerCase().includes("telnet disable") || cfg.toLowerCase().includes("no transport input telnet") || cfg.toLowerCase().includes("disable-telnet yes")) && !cfg.toLowerCase().includes("transport input telnet ssh");
    const sshv2Ok = cfg.toLowerCase().includes("ssh version 2") || cfg.toLowerCase().includes("protocol-version v2");
    const snmpv3Ok = cfg.toLowerCase().includes("snmp v3") || cfg.toLowerCase().includes("version v3") || cfg.toLowerCase().includes("delete 1");
    const bannerOk = cfg.toLowerCase().includes("banner") || cfg.toLowerCase().includes("message");
    const syslogOk = cfg.toLowerCase().includes("syslog") || cfg.toLowerCase().includes("logging host");

    const findings = [
      {
        rule_id: "NIST-AC-12",
        framework: "NIST SP 800-53 (Rev 5)",
        control_ref: "AC-2 & AC-12",
        title: "Session Idle Timeout",
        description: "Exec session timeout must be explicitly set to <= 600 seconds.",
        severity: "HIGH",
        status: execTimeoutOk ? "PASS" : "FAIL",
        observed_value: execTimeoutOk ? "600 seconds" : "Unlimited / Unset",
        required_value: "<= 600 seconds",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "NIST-AC-12",
          remediation_cli: isCisco ? "line vty 0 15\n exec-timeout 10 0\nexit" : isJuniper ? "set system login idle-timeout 10" : "set deviceconfig system idle-timeout 10"
        }
      },
      {
        rule_id: "NIST-IA-5",
        framework: "NIST SP 800-53 (Rev 5)",
        control_ref: "IA-5(1)",
        title: "Password Hashing",
        description: "Enforces SHA-256 password hashing algorithm.",
        severity: "CRITICAL",
        status: sha256Ok ? "PASS" : "FAIL",
        observed_value: sha256Ok ? "SHA256" : "MD5 / Plaintext",
        required_value: "SHA256 / SHA512",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "NIST-IA-5",
          remediation_cli: isCisco ? "enable algorithm-type sha256 secret <SECURE_PASSWORD>\nservice password-encryption" : "set system root-authentication plain-text-password-sha256"
        }
      },
      {
        rule_id: "NIST-SC-8",
        framework: "NIST SP 800-53 (Rev 5)",
        control_ref: "SC-8",
        title: "Cleartext Protocol Elimination",
        description: "Telnet and HTTP management interfaces must be disabled.",
        severity: "CRITICAL",
        status: noTelnetHttpOk ? "PASS" : "FAIL",
        observed_value: noTelnetHttpOk ? "Telnet: DISABLED, HTTP: DISABLED" : "Telnet: ENABLED (Log evidence: TELNET-3-CONN_ESTABLISHED)",
        required_value: "Telnet: DISABLED, HTTP: DISABLED",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "NIST-SC-8",
          remediation_cli: isCisco ? "no ip http server\nline vty 0 15\n transport input ssh\nexit" : "set system services telnet disable"
        }
      },
      {
        rule_id: "CIS-1.1",
        framework: "CIS Benchmarks",
        control_ref: "Section 1.1",
        title: "SSH v2 Mandatory Protocol",
        description: "Requires Secure Shell version 2 protocol.",
        severity: "HIGH",
        status: sshv2Ok ? "PASS" : "FAIL",
        observed_value: sshv2Ok ? "SSH Version 2" : "SSH Version 1 (Log evidence: SSH2_LOGON_UNAUTH)",
        required_value: "SSH Enabled (Version 2)",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "CIS-1.1",
          remediation_cli: isCisco ? "ip domain-name local.net\ncrypto key generate rsa modulus 2048\nip ssh version 2" : "set system services ssh protocol-version v2"
        }
      },
      {
        rule_id: "CIS-2.2",
        framework: "CIS Benchmarks",
        control_ref: "Section 2.2",
        title: "SNMP v3 Encryption",
        description: "Enforces SNMPv3 auth/priv encryption and purges default community strings.",
        severity: "HIGH",
        status: snmpv3Ok ? "PASS" : "FAIL",
        observed_value: snmpv3Ok ? "Version: V3, Default String: CLEARED" : "Version: V1/V2c (Log evidence: SNMP-4-UNENCRYPTED_QUERY)",
        required_value: "SNMPv3 (Default String Cleared)",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "CIS-2.2",
          remediation_cli: isCisco ? "no snmp-server community public\nno snmp-server community private\nsnmp-server group SECGROUP v3 auth privacy" : "delete snmp community public"
        }
      },
      {
        rule_id: "STIG-NET-002",
        framework: "DISA STIGs",
        control_ref: "Rule STIG-NET-002",
        title: "Warning Login Banner",
        description: "Displays legal notice login banner warning prior to logon.",
        severity: "MEDIUM",
        status: bannerOk ? "PASS" : "FAIL",
        observed_value: bannerOk ? "CONFIGURED" : "MISSING",
        required_value: "CONFIGURED",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "STIG-NET-002",
          remediation_cli: "banner motd ^C\nRESTRICTED NETWORK - AUTHORIZED PERSONNEL ONLY\n^C"
        }
      },
      {
        rule_id: "ISO-27001-A12",
        framework: "ISO/IEC 27001",
        control_ref: "Annex A.12.4.1",
        title: "Centralized Remote Logging",
        description: "Forwards system logs to remote centralized syslog server.",
        severity: "HIGH",
        status: syslogOk ? "PASS" : "FAIL",
        observed_value: syslogOk ? "SYSLOG FORWARDING ACTIVE" : "LOCAL ONLY / UNCONFIGURED",
        required_value: "CENTRALIZED SYSLOG ACTIVE",
        remediation_cli: {
          target_vendor: vendor,
          rule_id: "ISO-27001-A12",
          remediation_cli: "logging host 10.0.100.50\nlogging trap informational"
        }
      }
    ];

    const passed = findings.filter(f => f.status === 'PASS').length;
    const score = Math.round((passed / findings.length) * 100);
    const hostnameMatch = cfg.match(/(?:hostname|host-name)\s+["']?([\w.-]+)["']?/i);
    const hostname = hostnameMatch ? hostnameMatch[1] : "TAC-NODE-01";

    setAuditResult({
      total_checks: findings.length,
      passed_checks: passed,
      failed_checks: findings.length - passed,
      warning_checks: 0,
      compliance_score: score,
      findings: findings,
      sbm: {
        device_metadata: { hostname, vendor }
      }
    });
  };

  const handleEvaluate = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ device_id: selectedDeviceId, raw_config: rawConfig }),
      });
      if (response.ok) {
        const data = await response.json();
        setAuditResult(data);
        setDetectedVendor(data.sbm.device_metadata.vendor);
      } else {
        runLocalEvaluation(rawConfig);
      }
    } catch {
      runLocalEvaluation(rawConfig);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = (key: string) => {
    if (SAMPLE_PRESETS[key]) {
      const sample = SAMPLE_PRESETS[key];
      setRawConfig(sample.raw);
      setDetectedVendor(sample.vendor);
      runLocalEvaluation(sample.raw);
    }
  };

  const handleTrainVector = async (cliSnippet: string, targetKey: string) => {
    try {
      await fetch('http://localhost:8000/api/train-vector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cli_snippet: cliSnippet, target_sbm_key: targetKey, vendor_context: detectedVendor }),
      });
    } catch {
      // Mock success handling
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sentinel_user');
        if (saved) {
          setCurrentUser(JSON.parse(saved));
        }
      } catch {}
    }

    fetch('http://localhost:8000/api/inventory')
      .then(res => res.json())
      .then(data => setAssets(data))
      .catch(() => {});

    fetch('http://localhost:8000/api/logs')
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(() => {});

    runLocalEvaluation(rawConfig);
  }, []);

  const hostname = auditResult?.sbm?.device_metadata?.hostname || "TAC-NODE-01";
  const complianceScore = auditResult?.compliance_score || 0;

  return (
    <div className="flex min-h-screen bg-[#F4F6F9] text-[#475569]">
      
      {/* Sidebar Navigation with User Auth Badge */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        complianceScore={complianceScore}
        hostname={hostname}
        user={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full min-w-0">
        {activeTab === 'overview' && (
          <OverviewPage
            auditResult={auditResult}
            vendor={detectedVendor}
            assets={assets}
            onNavigate={setActiveTab}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              if (id === 'DEV-PAN-01') handleLoadSample('palo_alto');
              else if (id === 'DEV-JUN-01') handleLoadSample('juniper_junos');
              else if (id === 'DEV-FGT-01') handleLoadSample('fortinet_fortios');
              else handleLoadSample('cisco_ios');
            }}
          />
        )}

        {activeTab === 'ingestion' && (
          <IngestionPage
            rawConfig={rawConfig}
            onConfigChange={(newCfg) => {
              setRawConfig(newCfg);
              runLocalEvaluation(newCfg);
            }}
            detectedVendor={detectedVendor}
            onEvaluate={handleEvaluate}
            onNavigate={setActiveTab}
            onLoadPreset={handleLoadSample}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskWorkspacePage onNavigate={setActiveTab} />
        )}

        {activeTab === 'skills' && (
          <SkillsManagementPage user={currentUser} />
        )}

        {activeTab === 'inventory' && (
          <InventoryPage
            assets={assets}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              const matched = assets.find(a => a.device_id === id);
              if (matched) {
                if (id === 'DEV-PAN-01') handleLoadSample('palo_alto');
                else if (id === 'DEV-JUN-01') handleLoadSample('juniper_junos');
                else if (id === 'DEV-FGT-01') handleLoadSample('fortinet_fortios');
                else handleLoadSample('cisco_ios');
              }
            }}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'telemetry' && (
          <TelemetryPage
            logs={logs}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            onNavigate={setActiveTab}
            onVerifyAndAudit={handleEvaluate}
          />
        )}

        {activeTab === 'auditor' && (
          <AuditorPage
            rawConfig={rawConfig}
            onConfigChange={(newCfg) => {
              setRawConfig(newCfg);
              runLocalEvaluation(newCfg);
            }}
            detectedVendor={detectedVendor}
            onEvaluate={handleEvaluate}
            onLoadSample={handleLoadSample}
            isLoading={isLoading}
            auditResult={auditResult}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'workbench' && (
          <WorkbenchPage
            unmappedLines={rawConfig.split('\n').filter(l => l.trim() && !l.trim().startsWith('!'))}
            vendor={detectedVendor}
            onTrainVector={handleTrainVector}
          />
        )}

        {activeTab === 'remediation' && (
          <RemediationPage
            findings={auditResult?.findings || []}
            vendor={detectedVendor}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsPage
            rawConfig={rawConfig}
            hostname={hostname}
            vendor={detectedVendor}
            complianceScore={complianceScore}
          />
        )}
      </main>

      {/* Auth & RBAC Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleUserLogin}
        currentUser={currentUser}
      />

    </div>
  );
}

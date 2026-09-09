'use client';

import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  OverviewPage,
  IngestionPage,
  InventoryPage,
  TelemetryPage,
  AuditorPage,
  WorkbenchPage,
  RemediationPage,
  ReportsPage,
  TaskWorkspacePage,
  SkillsManagementPage,
  AuthModal,
} from '../components';
import type { NavTab, UserProfile } from '../lib/types';

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
  const [rawConfig, setRawConfig] = useState<string>("");
  const [detectedVendor, setDetectedVendor] = useState<string>("");
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

  const detectVendorLocally = (cfg: string) => {
    if (!cfg || !cfg.trim()) {
      setDetectedVendor("");
      return;
    }
    const cfgL = cfg.toLowerCase();
    const isCucme = cfgL.includes("cucme") || cfgL.includes("telephony-service");
    const isCisco = cfgL.includes("cisco") || cfgL.includes("line vty") || cfgL.includes("enable secret") || isCucme;
    const isJuniper = cfgL.includes("junos") || cfgL.includes("set system") || cfgL.includes("set interfaces");
    const isPalo = cfgL.includes("deviceconfig") || cfgL.includes("pan-os");
    const isForti = cfgL.includes("fortigate") || cfgL.includes("admintimeout") || cfgL.includes("config system") || cfgL.includes("allowaccess") || cfgL.includes("fg-");
    const isHuawei = cfgL.includes("sysname") || cfgL.includes("vrp") || cfgL.includes("display current-configuration");
    const isSonic = cfgL.includes("sonic") || cfgL.includes("device_metadata") || cfgL.includes("hwsku");
    const isAws = cfgL.includes("security_group") || cfgL.includes("ip_permissions");

    let vendor = "Generic Network Device";
    if (isCucme) vendor = "Cisco Systems (IOS 15.1 CUCME)";
    else if (isCisco) vendor = "Cisco Systems (IOS / IOS-XE)";
    else if (isJuniper) vendor = "Juniper Networks (JunOS)";
    else if (isPalo) vendor = "Palo Alto Networks (PAN-OS)";
    else if (isForti) vendor = "Fortinet (FortiOS)";
    else if (isHuawei) vendor = "Huawei (VRP)";
    else if (isSonic) vendor = "Sonic Foundation (SONiC OS)";
    else if (isAws) vendor = "Amazon Web Services (AWS SG)";

    setDetectedVendor(vendor);
  };

  const handleEvaluate = async (cfgToEvaluate?: string) => {
    const targetConfig = cfgToEvaluate || rawConfig;
    if (!targetConfig.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ raw_config: targetConfig }),
      });
      if (response.ok) {
        const data = await response.json();
        setAuditResult(data);
        if (data.sbm?.device_metadata?.vendor) {
          setDetectedVendor(data.sbm.device_metadata.vendor);
        }
        return data;
      }
    } catch (err) {
      console.error("Evaluation error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSample = (key: string) => {
    if (SAMPLE_PRESETS[key]) {
      const sample = SAMPLE_PRESETS[key];
      setRawConfig(sample.raw);
      setDetectedVendor(sample.vendor);
      handleEvaluate(sample.raw);
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

    detectVendorLocally(rawConfig);
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

        {(activeTab === 'ingestion' || activeTab === 'auditor') && (
          <IngestionPage
            rawConfig={rawConfig}
            onConfigChange={(newCfg) => {
              setRawConfig(newCfg);
              detectVendorLocally(newCfg);
              if (newCfg.trim()) {
                handleEvaluate(newCfg);
              } else {
                setAuditResult(null);
              }
            }}
            detectedVendor={detectedVendor}
            onEvaluate={handleEvaluate}
            onNavigate={setActiveTab}
            onLoadPreset={handleLoadSample}
            isLoading={isLoading}
            auditResult={auditResult}
            complianceScore={complianceScore}
            hostname={hostname}
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

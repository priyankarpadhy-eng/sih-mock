'use client';

import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  OverviewPage,
  IngestionPage,
  AuditorPage,
  WorkbenchPage,
  RemediationPage,
  ReportsPage,
  TaskWorkspacePage,
  SkillsManagementPage,
  SettingsPage,
  AuthModal,
} from '../components';
import type { NavTab, UserProfile } from '../lib/types';

export default function AppContainer() {
  const [activeTab, setActiveTab] = useState<NavTab>('ingestion');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [assets, setAssets] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
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

  const autoDispatchTasks = async (data: any, vendorStr: string) => {
    if (typeof window === 'undefined' || !data || !data.findings) return;
    try {
      const configStr = localStorage.getItem('vectornet_auto_task_config');
      const autoConfig = configStr ? JSON.parse(configStr) : { engineEnabled: true };
      if (!autoConfig.engineEnabled) return;

      const failedFindings = data.findings.filter((f: any) => f.status === 'FAIL' || f.status === 'WARNING');
      if (failedFindings.length === 0) return;

      const vendorLower = vendorStr.toLowerCase();
      let assignedEngineerUid = 'FIREBASE_UID_OPERATOR_03';
      let vendorKey = 'cisco';
      if (vendorLower.includes('palo')) {
        vendorKey = 'palo_alto';
        assignedEngineerUid = 'FIREBASE_UID_SECOPS_04';
      } else if (vendorLower.includes('forti')) {
        vendorKey = 'fortinet';
        assignedEngineerUid = 'FIREBASE_UID_AUDITOR_02';
      } else if (vendorLower.includes('juniper')) {
        vendorKey = 'juniper';
        assignedEngineerUid = 'FIREBASE_UID_OPERATOR_03';
      }

      for (const f of failedFindings.slice(0, 3)) {
        const fixScript = f.remediation_cli?.script || f.remediation_cli?.remediation_cli || 'configure terminal\n! specific fix command applied\nend';
        await fetch('http://localhost:8000/api/v1/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `[Auto-Assigned] ${f.title}`,
            device_id: `DEV-${data.hostname || data.sbm?.device_metadata?.hostname || 'TAC-NODE-01'}`,
            device_hostname: data.hostname || data.sbm?.device_metadata?.hostname || 'TAC-NODE-01',
            vendor: vendorKey,
            priority: f.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            assignee_uid: assignedEngineerUid,
            reporter_uid: 'FIREBASE_UID_SUPERADMIN_01',
            rule_id: f.rule_id,
            raw_value: `Auto-dispatched via Policy Routing Engine: ${f.observed_value}`,
            remediation_script: fixScript,
          }),
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Auto dispatch skipped:', e);
    }
  };

  const registerAuditedAsset = (data: any, resolvedVendor: string) => {
    const devName = data?.sbm?.device_metadata?.hostname || data?.hostname || 'INGESTED-NODE-01';
    const devVendor = resolvedVendor || 'Multi-Vendor Device';
    const devScore = typeof data?.compliance_score === 'number' ? Math.round(data.compliance_score) : 75;
    const newAsset = {
      device_id: `DEV-${devName.toUpperCase().replace(/[^A-Z0-9_-]/g, '')}`,
      hostname: devName,
      vendor: devVendor,
      model_number: data?.detected_hardware || data?.sbm?.device_metadata?.model || 'Network Node',
      os_version: data?.os_platform || data?.sbm?.device_metadata?.os_version || 'Universal',
      serial_number: `SN-${Date.now().toString(16).toUpperCase()}`,
      ip_address: data?.ip_address || '10.0.1.1',
      device_type: data?.device_type || 'router',
      interfaces_status: [{ name: "GigabitEthernet0/0", status: "UP", ip: "10.0.1.1/24" }],
      management_protocols: ["SSHv2", "HTTPS"],
      compliance_score: devScore,
      last_audited: new Date().toISOString()
    };

    setAssets(prev => {
      const existingIdx = prev.findIndex(a => a.hostname.toLowerCase() === devName.toLowerCase() || a.device_id === newAsset.device_id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newAsset;
        return updated;
      }
      return [newAsset, ...prev];
    });
    setSelectedDeviceId(newAsset.device_id);

    fetch('http://localhost:8000/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAsset)
    }).catch(() => {});
  };

  const handleEvaluate = async (cfgToEvaluate?: string) => {
    const targetConfig = cfgToEvaluate || rawConfig;
    if (!targetConfig.trim()) {
      setAuditResult(null);
      return;
    }

    setIsLoading(true);
    let evaluatedData: any = null;

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: targetConfig }),
      });
      if (response.ok) {
        evaluatedData = await response.json();
      }
    } catch {
      // Offline fallback
    }

    if (!evaluatedData) {
      try {
        const { evaluateConfiguration } = await import('../lib/compliance_evaluator');
        evaluatedData = evaluateConfiguration(targetConfig);
      } catch (e) {
        console.error("Local evaluation fallback error:", e);
      }
    }

    if (evaluatedData) {
      setAuditResult(evaluatedData);
      const resolvedVendor = evaluatedData.sbm?.device_metadata?.vendor || evaluatedData.detected_vendor || detectedVendor;
      if (resolvedVendor) {
        setDetectedVendor(resolvedVendor);
      }
      autoDispatchTasks(evaluatedData, resolvedVendor);
      registerAuditedAsset(evaluatedData, resolvedVendor);
      setIsLoading(false);
      return evaluatedData;
    }
    setIsLoading(false);
  };

  const handleLoadSample = (_key: string) => {
    // Hardcoded sample loading removed: all data strictly derived from user's pasted/uploaded configuration
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
      .then(data => {
        if (Array.isArray(data)) setAssets(data);
      })
      .catch(() => {});

    fetch('http://localhost:8000/api/logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data);
      })
      .catch(() => {});

    detectVendorLocally(rawConfig);
  }, []);

  const hostname = auditResult?.sbm?.device_metadata?.hostname || auditResult?.hostname || (rawConfig.trim() ? "INGESTED-NODE-01" : "NO-DEVICE");
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
      <main className="flex-1 pt-16 md:pt-6 p-4 md:p-6 lg:p-8 overflow-y-auto w-full min-w-0">
        {activeTab === 'overview' && (
          <OverviewPage
            auditResult={auditResult}
            vendor={detectedVendor}
            assets={assets}
            onNavigate={setActiveTab}
            onSelectDevice={(id) => {
              setSelectedDeviceId(id);
              setActiveTab('auditor');
            }}
          />
        )}

        {activeTab === 'ingestion' && (
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

        {activeTab === 'auditor' && (
          <AuditorPage
            rawConfig={rawConfig}
            onConfigChange={(newCfg) => {
              setRawConfig(newCfg);
              detectVendorLocally(newCfg);
              if (newCfg.trim()) handleEvaluate(newCfg);
            }}
            detectedVendor={detectedVendor}
            onEvaluate={() => handleEvaluate(rawConfig)}
            onLoadSample={handleLoadSample}
            isLoading={isLoading}
            auditResult={auditResult}
            onNavigate={setActiveTab}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskWorkspacePage onNavigate={setActiveTab} />
        )}

        {activeTab === 'skills' && (
          <SkillsManagementPage user={currentUser} />
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
            rawConfig={rawConfig}
            onConfigChange={(newCfg) => {
              setRawConfig(newCfg);
              detectVendorLocally(newCfg);
            }}
            onEvaluate={handleEvaluate}
            onNavigate={setActiveTab}
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

        {activeTab === 'settings' && (
          <SettingsPage
            user={currentUser}
            onNavigate={setActiveTab}
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

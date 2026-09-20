import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Clock,
  Terminal,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Link2,
  Send,
  Zap,
  Building2,
  Layers,
  FileCode,
  Bell
} from 'lucide-react';
import { UserProfile } from '../modals/AuthModal';

export interface VendorRoutingRule {
  vendorId: string;
  vendorName: string;
  assignedRole: string;
  assignedEngineer: string;
  assignedEmail: string;
  defaultSla: string;
  defaultPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  autoRemediate: boolean;
}

export interface AutoTaskConfig {
  engineEnabled: boolean;
  autoAttachCliFix: boolean;
  autoAttachRollback: boolean;
  tagCertInDirectives: boolean;
  autoDryRunVerification: boolean;
  notifyJiraWebhook: boolean;
  jiraEndpoint: string;
  notifyTeamsWebhook: boolean;
  routingMatrix: VendorRoutingRule[];
}

export const DEFAULT_AUTO_TASK_CONFIG: AutoTaskConfig = {
  engineEnabled: true,
  autoAttachCliFix: true,
  autoAttachRollback: true,
  tagCertInDirectives: true,
  autoDryRunVerification: true,
  notifyJiraWebhook: true,
  jiraEndpoint: 'https://jira.internal.defense.gov/rest/api/2/issue',
  notifyTeamsWebhook: false,
  routingMatrix: [
    {
      vendorId: 'cisco',
      vendorName: 'Cisco Systems (IOS / IOS-XE / CUCME)',
      assignedRole: 'Junior NetOps Specialist',
      assignedEngineer: 'Junior NetOps Tier-2',
      assignedEmail: 'netops.junior@vectornet.local',
      defaultSla: '4 Hours',
      defaultPriority: 'HIGH',
      autoRemediate: true,
    },
    {
      vendorId: 'palo_alto',
      vendorName: 'Palo Alto Networks (PAN-OS)',
      assignedRole: 'Perimeter Security Analyst',
      assignedEngineer: 'Firewall Specialist Tier-2',
      assignedEmail: 'firewall.palo@vectornet.local',
      defaultSla: '2 Hours',
      defaultPriority: 'CRITICAL',
      autoRemediate: true,
    },
    {
      vendorId: 'fortinet',
      vendorName: 'Fortinet (FortiOS)',
      assignedRole: 'SecOps Incident Responder',
      assignedEngineer: 'SecOps Tier-2 Analyst',
      assignedEmail: 'secops.forti@vectornet.local',
      defaultSla: '4 Hours',
      defaultPriority: 'HIGH',
      autoRemediate: true,
    },
    {
      vendorId: 'juniper',
      vendorName: 'Juniper Networks (JunOS)',
      assignedRole: 'Infrastructure Routing Engineer',
      assignedEngineer: 'Routing Tier-2 Specialist',
      assignedEmail: 'routing.juniper@vectornet.local',
      defaultSla: '6 Hours',
      defaultPriority: 'MEDIUM',
      autoRemediate: true,
    },
    {
      vendorId: 'sonic',
      vendorName: 'SONiC / Linux Whitebox Datacenter',
      assignedRole: 'Systems Reliability Specialist',
      assignedEngineer: 'SRE Datacenter Tier-2',
      assignedEmail: 'sre.sonic@vectornet.local',
      defaultSla: '8 Hours',
      defaultPriority: 'MEDIUM',
      autoRemediate: false,
    },
  ],
};

interface SettingsPageProps {
  user: UserProfile | null;
  onNavigate?: (tab: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onNavigate }) => {
  const [config, setConfig] = useState<AutoTaskConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('vectornet_auto_task_config');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Error reading auto task config:', e);
      }
    }
    return DEFAULT_AUTO_TASK_CONFIG;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testDispatched, setTestDispatched] = useState<string | null>(null);

  const handleToggleEngine = () => {
    setConfig(prev => ({
      ...prev,
      engineEnabled: !prev.engineEnabled
    }));
  };

  const handleUpdateRule = (index: number, field: keyof VendorRoutingRule, value: any) => {
    setConfig(prev => {
      const updated = [...prev.routingMatrix];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, routingMatrix: updated };
    });
  };

  const handleSaveSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vectornet_auto_task_config', JSON.stringify(config));
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    setConfig(DEFAULT_AUTO_TASK_CONFIG);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vectornet_auto_task_config', JSON.stringify(DEFAULT_AUTO_TASK_CONFIG));
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestAutoDispatch = (vendorName: string, engineer: string) => {
    setTestDispatched(`Simulated auto-dispatch: Remediation task for ${vendorName} dispatched to ${engineer}.`);
    setTimeout(() => setTestDispatched(null), 3500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto w-full pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Settings className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Auto-Task Assignment & Routing Engine</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Super Administrator Policy Engine &bull; Automatically triage and dispatch vendor compliance violations to junior engineers with full remediation playbooks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Banners */}
      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Auto-task routing configuration saved successfully and active for upcoming audits.</span>
        </div>
      )}

      {testDispatched && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono rounded-xl flex items-center gap-2 shadow-2xs">
          <Zap className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{testDispatched}</span>
        </div>
      )}

      {/* Master Enable/Disable Control Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              config.engineEnabled
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Automated Violation-to-Task Dispatch</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  config.engineEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {config.engineEnabled ? 'SYSTEM ACTIVE' : 'SYSTEM DISABLED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                When enabled, any audit violation will automatically create a remediation task pre-assigned to the vendor specialist engineer with CLI fix commands and safety rollbacks.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleEngine}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none ${
              config.engineEnabled
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {config.engineEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        {/* Global Policy Automation Switches */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={config.autoAttachCliFix}
              onChange={(e) => setConfig({ ...config, autoAttachCliFix: e.target.checked })}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Attach CLI Fix Script</span>
              <span className="text-[11px] text-slate-500">Inject syntax-validated CLI playbook into ticket.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={config.autoAttachRollback}
              onChange={(e) => setConfig({ ...config, autoAttachRollback: e.target.checked })}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Attach Safety Rollback</span>
              <span className="text-[11px] text-slate-500">Include exact rollback command for safety.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={config.tagCertInDirectives}
              onChange={(e) => setConfig({ ...config, tagCertInDirectives: e.target.checked })}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Tag CERT-In 2022</span>
              <span className="text-[11px] text-slate-500">Mandate 180-day retention & NTP directives.</span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
            <input
              type="checkbox"
              checked={config.autoDryRunVerification}
              onChange={(e) => setConfig({ ...config, autoDryRunVerification: e.target.checked })}
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <span className="font-semibold text-slate-800 block">Dry-Run Simulation</span>
              <span className="text-[11px] text-slate-500">Enable in-memory proof of fix verification.</span>
            </div>
          </label>
        </div>
      </div>

      {/* Vendor Routing Matrix Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Vendor-to-Engineer Assignment Rules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specify which junior engineer or Tier-2 specialist receives violations discovered in each vendor network family.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {config.routingMatrix.length} Vendor Rules Configured
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-mono text-[11px] uppercase">
                <th className="pb-3 font-semibold">Vendor Ecosystem</th>
                <th className="pb-3 font-semibold">Assigned Specialist Position</th>
                <th className="pb-3 font-semibold">Engineer Email</th>
                <th className="pb-3 font-semibold">Default SLA</th>
                <th className="pb-3 font-semibold">Priority</th>
                <th className="pb-3 font-semibold text-right">Simulation Test</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {config.routingMatrix.map((rule, idx) => (
                <tr key={rule.vendorId} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pr-3 font-sans">
                    <div className="font-bold text-slate-900">{rule.vendorName}</div>
                    <span className="text-[10px] text-slate-400 font-mono uppercase">ID: {rule.vendorId}</span>
                  </td>

                  <td className="py-3.5 pr-3 font-sans">
                    <input
                      type="text"
                      value={rule.assignedRole}
                      onChange={(e) => handleUpdateRule(idx, 'assignedRole', e.target.value)}
                      className="w-full min-w-[150px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:border-slate-400 outline-none"
                    />
                  </td>

                  <td className="py-3.5 pr-3">
                    <input
                      type="email"
                      value={rule.assignedEmail}
                      onChange={(e) => handleUpdateRule(idx, 'assignedEmail', e.target.value)}
                      className="w-full min-w-[170px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 bg-slate-50 focus:bg-white focus:border-slate-400 outline-none font-mono"
                    />
                  </td>

                  <td className="py-3.5 pr-3">
                    <select
                      value={rule.defaultSla}
                      onChange={(e) => handleUpdateRule(idx, 'defaultSla', e.target.value)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 bg-slate-50 cursor-pointer outline-none"
                    >
                      <option value="2 Hours">2 Hours (Urgent)</option>
                      <option value="4 Hours">4 Hours (Standard)</option>
                      <option value="6 Hours">6 Hours</option>
                      <option value="8 Hours">8 Hours (Sprint)</option>
                      <option value="24 Hours">24 Hours</option>
                    </select>
                  </td>

                  <td className="py-3.5 pr-3">
                    <select
                      value={rule.defaultPriority}
                      onChange={(e) => handleUpdateRule(idx, 'defaultPriority', e.target.value as any)}
                      className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-800 bg-slate-50 cursor-pointer outline-none"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </td>

                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleTestAutoDispatch(rule.vendorName, rule.assignedRole)}
                      className="px-2.5 py-1 rounded-lg text-xs font-sans font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                      title="Test auto-dispatch workflow for this vendor"
                    >
                      Dispatch Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notification Webhooks & External Systems Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            Downstream Integration Webhooks (Jira Cloud & Teams)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Synchronize auto-created tickets with institutional defense help desks and SOC monitoring channels.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">JIRA Cloud Enterprise API</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notifyJiraWebhook}
                  onChange={(e) => setConfig({ ...config, notifyJiraWebhook: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <input
              type="text"
              value={config.jiraEndpoint}
              onChange={(e) => setConfig({ ...config, jiraEndpoint: e.target.value })}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none"
              placeholder="https://jira.internal.gov/rest/api/2/issue"
            />
            <span className="text-[10px] text-slate-400 font-sans block">Dispatches RFC-compliant remediation JSON payload upon audit completion.</span>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">MS Teams / Slack Incident Channel</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.notifyTeamsWebhook}
                  onChange={(e) => setConfig({ ...config, notifyTeamsWebhook: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <input
              type="text"
              disabled={!config.notifyTeamsWebhook}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none disabled:opacity-50"
              placeholder="https://outlook.office.com/webhook/..."
            />
            <span className="text-[10px] text-slate-400 font-sans block">Sends instant notification card to on-call junior engineer when critical violations trip.</span>
          </div>
        </div>
      </div>

    </div>
  );
};

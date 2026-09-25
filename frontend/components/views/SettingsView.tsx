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
  Bell,
  Key,
  Eye,
  EyeOff,
  Cpu,
  Loader2,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
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

export const FREE_AI_MODELS = [
  {
    id: 'openrouter/auto',
    name: 'Smart Auto-Select (Recommended)',
    desc: 'Automatically routes to the fastest, most reliable free model with instant failover',
  },
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'NVIDIA Nemotron 3 Super (120B Free)',
    desc: '1701ms fast response, high accuracy network configuration security analysis',
  },
  {
    id: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    name: 'NVIDIA Nemotron 3 Ultra (550B Free)',
    desc: '1706ms flagship high-capacity reasoning model for multi-vendor compliance',
  },
  {
    id: 'poolside/laguna-xs-2.1:free',
    name: 'Poolside Laguna XS 2.1 (Free)',
    desc: '1618ms ultra-low latency response parser for network CLI audits',
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code (Free)',
    desc: '1979ms code-specialized reasoning engine for CLI scripting and regex rules',
  },
  {
    id: 'inclusionai/ling-3.0-flash-fin:free',
    name: 'inclusionAI Ling 3.0 Flash Fin (Free)',
    desc: '1914ms high-throughput compliance analysis engine',
  },
  {
    id: 'inclusionai/ling-3.0-flash-sante:free',
    name: 'inclusionAI Ling 3.0 Flash Sante (Free)',
    desc: '1929ms fast multi-framework policy evaluator',
  },
  {
    id: 'nex-agi/nex-n2.5-mini:free',
    name: 'Nex AGI Nex-N2.5-Mini (Free)',
    desc: '3043ms lightweight multi-vendor compliance rule engine',
  },
];

interface SettingsPageProps {
  user: UserProfile | null;
  onNavigate?: (tab: any) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'routing'>('ai');

  // AI Key & Model State
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeModel, setActiveModel] = useState('openrouter/auto');
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState<string | null>(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [backendStatus, setBackendStatus] = useState<any>(null);

  // Auto Task Config State
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

  // Fetch initial AI config on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('vectornet_openrouter_key');
      const savedModel = localStorage.getItem('vectornet_ai_model');
      if (savedKey) setApiKey(savedKey);
      if (savedModel) setActiveModel(savedModel);
    }

    const fetchConfig = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/v1/ai/config', { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const data = await res.json();
          setBackendStatus(data);
          if (data.active_model) setActiveModel(data.active_model);
          if (data.api_keys && data.api_keys.length > 0 && !apiKey) {
            // keep existing unmasked key if stored
          }
        }
      } catch {
        // backend offline
      }
    };
    fetchConfig();
  }, []);

  const handleSaveAiConfig = async (overrideKey?: string) => {
    setIsSavingAi(true);
    setAiSaveSuccess(null);
    setTestFeedback(null);
    const cleanKey = (overrideKey !== undefined ? overrideKey : apiKey).trim();

    try {
      if (typeof window !== 'undefined') {
        if (cleanKey) {
          localStorage.setItem('vectornet_openrouter_key', cleanKey);
        } else {
          localStorage.removeItem('vectornet_openrouter_key');
        }
        localStorage.setItem('vectornet_ai_model', activeModel);
      }

      const res = await fetch('http://localhost:8000/api/v1/ai/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_keys: cleanKey ? [cleanKey] : [],
          active_model: activeModel,
          user_role: 'SUPER_ADMIN',
          user_uid: 'ADMIN_01',
          user_email: 'admin@vectornet.io',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setBackendStatus(data.config || backendStatus);
        setAiSaveSuccess(cleanKey ? 'API Key saved and active in OpenRouter pool.' : 'Key cleared. Running in failover mode.');
      } else {
        setAiSaveSuccess('Saved locally in browser.');
      }
      setIsSaveSuccess(true);
      setTimeout(() => setIsSaveSuccess(false), 3000);
    } catch {
      setAiSaveSuccess('Saved locally in browser.');
      setIsSaveSuccess(true);
      setTimeout(() => setIsSaveSuccess(false), 3000);
    } finally {
      setIsSavingAi(false);
      setTimeout(() => setAiSaveSuccess(null), 5000);
    }
  };

  const handleTestAiConnection = async () => {
    setIsTestingAi(true);
    setTestFeedback(null);
    const start = Date.now();
    const cleanKey = apiKey.trim();

    try {
      const formData = new FormData();
      formData.append('prompt', 'Test connectivity and ping response.');
      formData.append('system_instruction', 'Respond with PONG in 1 word.');
      if (cleanKey) {
        formData.append('api_key', cleanKey);
      }
      if (activeModel) {
        formData.append('model', activeModel);
      }

      const res = await fetch('http://localhost:8000/api/v1/ai/query-failover', {
        method: 'POST',
        body: formData,
      });
      const latency = Date.now() - start;

      if (res.ok) {
        const data = await res.json();
        if (data.provider === 'OPENROUTER') {
          setTestFeedback({
            success: true,
            latency,
            message: `Connected successfully to OpenRouter (${data.model}) in ${latency}ms.`,
          });
        } else {
          setTestFeedback({
            success: true,
            latency,
            message: `Connected via ${data.provider} (${data.model}) in ${latency}ms.`,
          });
        }
      } else {
        setTestFeedback({
          success: false,
          message: `Error ${res.status}: Failed to reach provider endpoint.`,
        });
      }
    } catch {
      setTestFeedback({
        success: false,
        message: 'Could not contact backend service on port 8000. Start backend with uvicorn.',
      });
    } finally {
      setIsTestingAi(false);
    }
  };


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
      
      {/* Top Header & Navigation Tabs */}
      <div className="border-b border-slate-200 pb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#EA580C]">
                <Settings className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & AI Configuration</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configure AI reasoning API keys, local vs cloud failover policies, and automated engineer task routing.
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            <Key className={`w-3.5 h-3.5 ${activeTab === 'ai' ? 'text-orange-400' : 'text-slate-400'}`} />
            <span>AI Engine & API Keys</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('routing')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'routing'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${activeTab === 'routing' ? 'text-orange-400' : 'text-slate-400'}`} />
            <span>Auto-Task Assignment & Routing</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AI ENGINE & API KEYS                                               */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          
          {/* Status Feedback Banners */}
          {aiSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{aiSaveSuccess}</span>
            </div>
          )}

          {testFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs font-mono flex items-center gap-2.5 shadow-2xs ${
                testFeedback.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testFeedback.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <div className="flex-1">{testFeedback.message}</div>
            </div>
          )}

          {/* AI Providers Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Cloud AI (OpenRouter) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#EA580C]" />
                  OpenRouter Cloud Pool
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  apiKey.trim() || (backendStatus?.total_keys && backendStatus.total_keys > 0)
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {apiKey.trim() || (backendStatus?.total_keys && backendStatus.total_keys > 0) ? 'ACTIVE' : 'KEY NEEDED'}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono truncate">
                Model: <span className="font-semibold text-slate-900">{activeModel.split('/').pop()}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Multi-key failover pool. Automatically sanitized before dispatch.
              </p>
            </div>

            {/* Card 2: Local AI (Ollama - Optional) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  Local AI (Air-Gapped)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  backendStatus?.local_ai?.status === 'ONLINE'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {backendStatus?.local_ai?.status === 'ONLINE' ? 'ONLINE' : 'OPTIONAL (OFFLINE)'}
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono truncate">
                Engine: <span className="font-semibold text-slate-900">{backendStatus?.local_ai?.status === 'ONLINE' ? 'Ollama 11434' : 'Cloud / Policy Mode'}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Optional on-prem engine. System routes through OpenRouter pool and policy engine.
              </p>
            </div>

            {/* Card 3: Privacy & Redaction */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Credential Sanitizer
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  ENFORCED
                </span>
              </div>
              <div className="text-xs text-slate-600 font-mono">
                AES & Secret Redactor
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Credentials and passwords stripped before cloud routing.
              </p>
            </div>
          </div>

          {/* Main Configuration Form Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-4 h-4 text-[#EA580C]" />
                OpenRouter API Key & Provider Configuration
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your OpenRouter API key to enable high-accuracy multi-vendor compliance audits and CLI remediation synthesis.
              </p>
            </div>

            {/* API Key Input with Hide / Unhide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  OpenRouter API Key:
                </label>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 hover:underline"
                >
                  <span>Get OpenRouter API Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full pr-10 pl-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
                />
                
                {/* Hide / Unhide Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors cursor-pointer"
                  title={showApiKey ? 'Hide API Key' : 'Show API Key'}
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Key is persisted securely in your local environment and synced with the backend failover pool.
              </p>
            </div>

            {/* Model Selector Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-800">
                Reasoning LLM Model Selection:
              </label>
              <select
                value={activeModel}
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs cursor-pointer"
              >
                {FREE_AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Default: Smart Auto-Select (openrouter/auto). Automatically routes to fastest available free model.
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="pt-2 border-t border-slate-100 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveAiConfig()}
                    disabled={isSavingAi}
                    className={`px-4 py-2 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50 ${
                      isSaveSuccess
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-[#EA580C] hover:bg-[#C2410C]'
                    }`}
                  >
                    {isSavingAi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isSaveSuccess ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Save className="w-3.5 h-3.5 text-white" />
                    )}
                    <span>{isSavingAi ? 'Saving...' : isSaveSuccess ? 'Saved & Applied!' : 'Save API Key & Model'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestAiConnection}
                    disabled={isTestingAi}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  >
                    {isTestingAi ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#EA580C]" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span>Test Connection / Ping</span>
                  </button>
                </div>

                {apiKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKey('');
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('vectornet_openrouter_key');
                      }
                      handleSaveAiConfig('');
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Clear Key
                  </button>
                )}
              </div>

              {/* Inline Save Success Banner right below buttons */}
              {aiSaveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-xl flex items-center gap-2 shadow-2xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{aiSaveSuccess}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AUTO-TASK ASSIGNMENT & ROUTING ENGINE                               */}
      {/* ========================================================================= */}
      {activeTab === 'routing' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Automatic Remediation Task Dispatch Matrix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure vendor SLA parameters and assign remediation tasks to junior network engineers.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Defaults</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <Save className="w-3.5 h-3.5 text-orange-400" />
                <span>Save Routing</span>
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
                ? 'bg-orange-50 border-orange-200 text-orange-600'
                : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900">Automated Violation-to-Task Dispatch</h2>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                  config.engineEnabled
                    ? 'bg-orange-50 text-orange-800 border-orange-200'
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
                ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-xs'
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
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
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
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
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
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
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
              className="mt-0.5 rounded text-orange-600 focus:ring-orange-500"
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
              <UserCheck className="w-4 h-4 text-orange-600" />
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
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
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
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
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
      )}

    </div>
  );
};
